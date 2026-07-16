import type {
  ProductOption,
  StockBalanceRow,
  StockCondition,
  StorageLocationOption,
} from "../../shared/stock.types.ts";
import { trimQty } from "./stockUtils.ts";

export type ReceiptLineDraft = {
  productId: string;
  qty: string;
  storageLocationId: string;
};

export type TransferLineDraft = {
  productId: string;
  qty: string;
  fromStorageLocationId: string;
};

export type AdjustmentLineDraft = {
  productId: string;
  deltaQty: string;
  storageLocationId: string;
  fromCondition?: StockCondition;
  toCondition?: StockCondition;
};

interface ReceiptLineEditorProps {
  products: ProductOption[];
  lines: ReceiptLineDraft[];
  onChange: (next: ReceiptLineDraft[]) => void;
  locationOptions: StorageLocationOption[];
  defaultLocationId: string;
}

export function ReceiptLineEditor({
  products,
  lines,
  onChange,
  locationOptions,
  defaultLocationId: defLoc,
}: ReceiptLineEditorProps) {
  function update(idx: number, patch: Partial<ReceiptLineDraft>) {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function add() {
    onChange([...lines, { productId: "", qty: "", storageLocationId: defLoc }]);
  }

  function remove(idx: number) {
    onChange(
      lines.length === 1
        ? [{ productId: "", qty: "", storageLocationId: defLoc }]
        : lines.filter((_, i) => i !== idx),
    );
  }

  return (
    <div class="stock-line-editor">
      <div class="stock-line-editor-header">
        <span class="stock-line-editor-title">Lines</span>
        <button type="button" class="stock-btn-secondary stock-btn-small" onClick={add}>
          + Add line
        </button>
      </div>
      <div class="stock-line-rows">
        {lines.map((l, idx) => {
          const product = products.find((p) => String(p.productId) === l.productId);
          const uom = product?.uom ?? "";
          return (
            <div key={idx} class="stock-line-row stock-line-row-receipt">
              <select
                class="stock-line-select"
                value={l.productId}
                onChange={(event) =>
                  update(idx, { productId: (event.currentTarget as HTMLSelectElement).value })
                }
                aria-label="Product"
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName}
                  </option>
                ))}
              </select>
              <select
                class="stock-line-select"
                value={l.storageLocationId}
                onChange={(event) =>
                  update(idx, {
                    storageLocationId: (event.currentTarget as HTMLSelectElement).value,
                  })
                }
                aria-label="Storage location"
                required
              >
                <option value="">Location…</option>
                {locationOptions.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.isSellable ? "" : " (unsellable)"}
                    {loc.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.001"
                min="0"
                class="stock-line-input"
                value={l.qty}
                onInput={(event) =>
                  update(idx, { qty: (event.currentTarget as HTMLInputElement).value })
                }
                aria-label="Quantity"
                placeholder="Qty"
              />
              <span class="stock-line-uom">{uom}</span>
              <button
                type="button"
                class="stock-line-remove"
                onClick={() => remove(idx)}
                aria-label="Remove line"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {locationOptions.length === 0 ? (
        <p class="stock-hint stock-hint-warn">
          Add storage locations for this sales point under Storage locations.
        </p>
      ) : null}
    </div>
  );
}

function transferAvailableQty(
  onHand: StockBalanceRow[],
  fromSalesPointId: string,
  fromStorageLocationId: string,
  productId: string,
): string {
  if (!fromSalesPointId || !fromStorageLocationId || !productId) return "0";
  const row = onHand.find(
    (r) =>
      String(r.salesPointId) === fromSalesPointId &&
      String(r.storageLocationId) === fromStorageLocationId &&
      String(r.productId) === productId,
  );
  return row?.qty ?? "0";
}

interface TransferLineEditorProps {
  products: ProductOption[];
  lines: TransferLineDraft[];
  onChange: (next: TransferLineDraft[]) => void;
  fromSalesPointId: string;
  onHand: StockBalanceRow[];
  fromLocationOptions: StorageLocationOption[];
  defaultFromLocationId: string;
}

export function TransferLineEditor({
  products,
  lines,
  onChange,
  fromSalesPointId,
  onHand,
  fromLocationOptions,
  defaultFromLocationId: defFrom,
}: TransferLineEditorProps) {
  function update(idx: number, patch: Partial<TransferLineDraft>) {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function add() {
    onChange([...lines, { productId: "", qty: "", fromStorageLocationId: defFrom }]);
  }

  function remove(idx: number) {
    onChange(
      lines.length === 1
        ? [{ productId: "", qty: "", fromStorageLocationId: defFrom }]
        : lines.filter((_, i) => i !== idx),
    );
  }

  return (
    <div class="stock-line-editor">
      <div class="stock-line-editor-header">
        <span class="stock-line-editor-title">Lines</span>
        <button type="button" class="stock-btn-secondary stock-btn-small" onClick={add}>
          + Add line
        </button>
      </div>
      <div class="stock-line-rows">
        {lines.map((l, idx) => {
          const product = products.find((p) => String(p.productId) === l.productId);
          const uom = product?.uom ?? "";
          const availableStr = transferAvailableQty(
            onHand,
            fromSalesPointId,
            l.fromStorageLocationId,
            l.productId,
          );
          const availableNum = Number.parseFloat(availableStr);
          const qtyNum = Number.parseFloat(l.qty);
          const overAvailable =
            Boolean(l.productId) &&
            Boolean(l.fromStorageLocationId) &&
            Boolean(l.qty) &&
            Number.isFinite(qtyNum) &&
            Number.isFinite(availableNum) &&
            qtyNum > availableNum;
          return (
            <div key={idx} class="stock-line-block">
              <div class="stock-line-row stock-line-row-transfer">
                <select
                  class="stock-line-select"
                  value={l.productId}
                  onChange={(event) =>
                    update(idx, { productId: (event.currentTarget as HTMLSelectElement).value })
                  }
                  aria-label="Product"
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName}
                    </option>
                  ))}
                </select>
                <select
                  class="stock-line-select"
                  value={l.fromStorageLocationId}
                  onChange={(event) =>
                    update(idx, {
                      fromStorageLocationId: (event.currentTarget as HTMLSelectElement).value,
                    })
                  }
                  aria-label="From location"
                >
                  <option value="">From…</option>
                  {fromLocationOptions.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.isSellable ? "" : " (unsellable)"}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  class={`stock-line-input${overAvailable ? " stock-line-input-error" : ""}`}
                  value={l.qty}
                  onInput={(event) =>
                    update(idx, { qty: (event.currentTarget as HTMLInputElement).value })
                  }
                  aria-label="Quantity"
                />
                <span class="stock-line-uom">{uom}</span>
                <button
                  type="button"
                  class="stock-line-remove"
                  onClick={() => remove(idx)}
                  aria-label="Remove line"
                >
                  ×
                </button>
              </div>
              {l.productId && l.fromStorageLocationId ? (
                <p class={`stock-line-note${overAvailable ? " stock-hint-warn" : ""}`}>
                  Available at source: {trimQty(availableStr)} {uom}
                  {overAvailable ? " — exceeds available stock" : ""}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AdjustmentLineEditorProps {
  products: ProductOption[];
  lines: AdjustmentLineDraft[];
  onChange: (next: AdjustmentLineDraft[]) => void;
  locationOptions: StorageLocationOption[];
  defaultLocationId: string;
  mode: "ADJUST" | "RECLASSIFY";
  onHand: StockBalanceRow[];
  salesPointId: string;
}

export function AdjustmentLineEditor({
  products,
  lines,
  onChange,
  locationOptions,
  defaultLocationId: defLoc,
  mode,
  onHand,
  salesPointId,
}: AdjustmentLineEditorProps) {
  function update(idx: number, patch: Partial<AdjustmentLineDraft>) {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function add() {
    onChange([
      ...lines,
      {
        productId: "",
        deltaQty: "",
        storageLocationId: defLoc,
        fromCondition: "SELLABLE",
        toCondition: "UNSELLABLE",
      },
    ]);
  }

  function remove(idx: number) {
    onChange(
      lines.length === 1
        ? [
            {
              productId: "",
              deltaQty: "",
              storageLocationId: defLoc,
              fromCondition: "SELLABLE",
              toCondition: "UNSELLABLE",
            },
          ]
        : lines.filter((_, i) => i !== idx),
    );
  }

  return (
    <div class="stock-line-editor">
      <div class="stock-line-editor-header">
        <span class="stock-line-editor-title">Lines</span>
        <button type="button" class="stock-btn-secondary stock-btn-small" onClick={add}>
          + Add line
        </button>
      </div>
      <div class="stock-line-rows">
        {lines.map((l, idx) => {
          const product = products.find((p) => String(p.productId) === l.productId);
          const uom = product?.uom ?? "";
          const spIdNum = Number.parseInt(salesPointId, 10);
          const locIdNum = Number.parseInt(l.storageLocationId, 10);
          const productIdNum = Number.parseInt(l.productId, 10);
          const fromCond = l.fromCondition ?? "SELLABLE";
          const availableStr =
            mode === "RECLASSIFY" &&
            Number.isFinite(spIdNum) &&
            Number.isFinite(locIdNum) &&
            Number.isFinite(productIdNum)
              ? onHand.find(
                  (r) =>
                    r.salesPointId === spIdNum &&
                    r.storageLocationId === locIdNum &&
                    r.productId === productIdNum &&
                    r.condition === fromCond,
                )?.qty ?? "0"
              : null;
          const availableNum = availableStr != null ? Number.parseFloat(availableStr) : NaN;
          const qtyNum = Number.parseFloat(l.deltaQty);
          const overAvailable =
            mode === "RECLASSIFY" &&
            availableStr != null &&
            Boolean(l.deltaQty) &&
            Number.isFinite(qtyNum) &&
            Number.isFinite(availableNum) &&
            qtyNum > availableNum;
          return (
            <div key={idx} class="stock-line-block">
              <div
                class={`stock-line-row ${
                  mode === "RECLASSIFY" ? "stock-line-row-reclassify" : "stock-line-row-adjust"
                }`}
              >
                <select
                  class="stock-line-select"
                  value={l.productId}
                  onChange={(event) =>
                    update(idx, { productId: (event.currentTarget as HTMLSelectElement).value })
                  }
                  aria-label="Product"
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName}
                    </option>
                  ))}
                </select>
                <select
                  class="stock-line-select"
                  value={l.storageLocationId}
                  onChange={(event) =>
                    update(idx, {
                      storageLocationId: (event.currentTarget as HTMLSelectElement).value,
                    })
                  }
                  aria-label="Storage location"
                >
                  <option value="">Location…</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.001"
                  class={`stock-line-input${overAvailable ? " stock-line-input-error" : ""}`}
                  value={l.deltaQty}
                  onInput={(event) =>
                    update(idx, { deltaQty: (event.currentTarget as HTMLInputElement).value })
                  }
                  aria-label="Delta"
                  placeholder={mode === "RECLASSIFY" ? "Qty" : "± qty"}
                />
                {mode === "RECLASSIFY" ? (
                  <>
                    <select
                      class="stock-line-select"
                      value={l.fromCondition ?? "SELLABLE"}
                      onChange={(event) =>
                        update(idx, {
                          fromCondition: (event.currentTarget as HTMLSelectElement)
                            .value as StockCondition,
                        })
                      }
                      aria-label="From condition"
                    >
                      <option value="SELLABLE">Sellable</option>
                      <option value="UNSELLABLE">Unsellable</option>
                    </select>
                    <select
                      class="stock-line-select"
                      value={l.toCondition ?? "UNSELLABLE"}
                      onChange={(event) =>
                        update(idx, {
                          toCondition: (event.currentTarget as HTMLSelectElement)
                            .value as StockCondition,
                        })
                      }
                      aria-label="To condition"
                    >
                      <option value="UNSELLABLE">Unsellable</option>
                      <option value="SELLABLE">Sellable</option>
                    </select>
                  </>
                ) : null}
                <span class="stock-line-uom">{uom}</span>
                <button
                  type="button"
                  class="stock-line-remove"
                  onClick={() => remove(idx)}
                  aria-label="Remove line"
                >
                  ×
                </button>
              </div>
              {mode === "RECLASSIFY" && availableStr != null && l.productId && l.storageLocationId ? (
                <p class={`stock-line-note${overAvailable ? " stock-hint-warn" : ""}`}>
                  Available ({fromCond === "SELLABLE" ? "sellable" : "unsellable"}):{" "}
                  {trimQty(availableStr)} {uom}
                  {overAvailable ? " — exceeds available stock" : ""}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <p class="stock-hint">
        {mode === "RECLASSIFY"
          ? "Quantity to move (must be > 0). Posts -qty from From and +qty to To."
          : "Delta (+ gain / − loss)"}
      </p>
    </div>
  );
}
