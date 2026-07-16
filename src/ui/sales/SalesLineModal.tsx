import { useEffect, useRef, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import type {
  SalesProductOption,
  StorageLocationOption,
} from "./types.ts";

export interface SalesLineDraft {
  productId: string;
  qtyKg: string;
  qtyUnits: string;
  unitPricePerKg: string;
  unitPricePerUnit: string;
  storageLocationId: string;
}

interface SalesLineModalProps {
  line: SalesLineDraft;
  products: SalesProductOption[];
  locations: StorageLocationOption[];
  isBottleMode: boolean;
  isSpecialDisposition: boolean;
  useRegisteredCustomer: boolean;
  customerId: string;
  transactionDate: string;
  mode: "add" | "edit";
  onClose: () => void;
  onSave: (line: SalesLineDraft) => void;
}

function parseDecimal(value: string): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function SalesLineModal({
  line,
  products,
  locations,
  isBottleMode,
  isSpecialDisposition,
  useRegisteredCustomer,
  customerId,
  transactionDate,
  mode,
  onClose,
  onSave,
}: SalesLineModalProps) {
  const [draft, setDraft] = useState<SalesLineDraft>(line);
  const [error, setError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const openedProductIdRef = useRef(line.productId);

  const title = mode === "add" ? "Add item" : "Edit item";
  const subtitle = isBottleMode
    ? "Enter the bottled product and number of units."
    : "Enter the loose product, location, and weight.";

  const allowAutoUnitPrice =
    !isSpecialDisposition &&
    (isBottleMode || (useRegisteredCustomer && customerId.trim().length > 0));

  useEffect(() => {
    setDraft(line);
    openedProductIdRef.current = line.productId;
    setError(null);
    setPriceError(null);
  }, [line]);

  useEffect(() => {
    if (!allowAutoUnitPrice) {
      setPriceError(null);
      setPriceLoading(false);
      return;
    }

    if (mode === "edit" && draft.productId === openedProductIdRef.current) {
      return;
    }

    const productId = Number.parseInt(draft.productId, 10);
    if (!Number.isFinite(productId)) {
      setPriceError(null);
      return;
    }

    let cancelled = false;
    setPriceLoading(true);

    void getElectronApi()
      .sales.previewUnitPrice({
        productId,
        asOfDate: transactionDate,
        customerId:
          useRegisteredCustomer && customerId.trim()
            ? Number.parseInt(customerId, 10)
            : null,
      })
      .then((result) => {
        if (cancelled) {
          return;
        }

        setPriceLoading(false);
        if (result.ok) {
          setPriceError(null);
          setDraft((current) => ({
            ...current,
            unitPricePerKg: result.unitPriceExTax,
            unitPricePerUnit: result.unitPriceExTax,
          }));
          return;
        }

        setPriceError(result.error);
      })
      .catch(() => {
        if (!cancelled) {
          setPriceLoading(false);
          setPriceError("Could not resolve unit price.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    allowAutoUnitPrice,
    customerId,
    draft.productId,
    isBottleMode,
    mode,
    transactionDate,
    useRegisteredCustomer,
  ]);

  const quantity = parseDecimal(isBottleMode ? draft.qtyUnits : draft.qtyKg);
  const unitPrice = parseDecimal(
    isBottleMode ? draft.unitPricePerUnit : draft.unitPricePerKg,
  );
  const subtotal = isSpecialDisposition ? 0 : Math.round(quantity * unitPrice);

  function updateDraft(values: Partial<SalesLineDraft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  function submit(event: Event) {
    event.preventDefault();

    if (!draft.productId) {
      setError("Select a product.");
      return;
    }

    if (quantity <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }

    if (!isBottleMode && !draft.storageLocationId) {
      setError("Select a storage location.");
      return;
    }

    if (!isSpecialDisposition && unitPrice < 0) {
      setError("Unit price cannot be negative.");
      return;
    }

    if (!isSpecialDisposition && priceError) {
      setError(priceError);
      return;
    }

    onSave(draft);
  }

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle={subtitle}
      elevated
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={submit}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="sales-line-product">
            Product
          </label>
          <div class="form-dialog-control">
            <select
              id="sales-line-product"
              class="form-dialog-input"
              value={draft.productId}
              onChange={(event) =>
                updateDraft({
                  productId: (event.currentTarget as HTMLSelectElement).value,
                })
              }
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.productId} value={String(product.productId)}>
                  {product.productName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isBottleMode ? (
          <div class="form-dialog-row">
            <label class="form-dialog-label" for="sales-line-location">
              Storage location
            </label>
            <div class="form-dialog-control">
              <select
                id="sales-line-location"
                class="form-dialog-input"
                value={draft.storageLocationId}
                onChange={(event) =>
                  updateDraft({
                    storageLocationId: (
                      event.currentTarget as HTMLSelectElement
                    ).value,
                  })
                }
              >
                <option value="">Select a location</option>
                {locations.map((location) => (
                  <option key={location.id} value={String(location.id)}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="sales-line-qty">
            {isBottleMode ? "Quantity (units)" : "Quantity (kg)"}
          </label>
          <input
            id="sales-line-qty"
            class="form-dialog-input"
            type="number"
            min="0"
            step={isBottleMode ? "1" : "0.001"}
            value={isBottleMode ? draft.qtyUnits : draft.qtyKg}
            onInput={(event) => {
              const value = (event.currentTarget as HTMLInputElement).value;
              updateDraft(
                isBottleMode
                  ? { qtyUnits: value, qtyKg: value }
                  : { qtyKg: value },
              );
            }}
          />
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="sales-line-price">
            {isBottleMode ? "Price per unit" : "Price per kg"}
          </label>
          <input
            id="sales-line-price"
            class="form-dialog-input"
            type="number"
            min="0"
            step="1"
            value={
              isSpecialDisposition
                ? "0"
                : isBottleMode
                  ? draft.unitPricePerUnit
                  : draft.unitPricePerKg
            }
            disabled={isSpecialDisposition}
            onInput={(event) => {
              const value = (event.currentTarget as HTMLInputElement).value;
              setPriceError(null);
              updateDraft(
                isBottleMode
                  ? { unitPricePerUnit: value, unitPricePerKg: value }
                  : { unitPricePerKg: value },
              );
            }}
          />
          {priceLoading ? (
            <p class="form-dialog-hint">Resolving price from schedule…</p>
          ) : priceError ? (
            <p class="form-dialog-error">{priceError}</p>
          ) : allowAutoUnitPrice && draft.productId ? (
            <p class="form-dialog-hint">
              Price from schedule as of {transactionDate}. You can override it manually.
            </p>
          ) : null}
        </div>

        <div class="form-dialog-subtotal">
          <span>Line subtotal</span>
          <strong>
            {subtotal.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}{" "}
            XAF
          </strong>
        </div>

        {error ? <p class="form-dialog-error">{error}</p> : null}

        <div class="form-dialog-actions">
          <button type="submit" class="form-dialog-btn-primary">
            {mode === "add" ? "Add item" : "Save changes"}
          </button>
          <button type="button" class="form-dialog-btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </FormDialog>
  );
}
