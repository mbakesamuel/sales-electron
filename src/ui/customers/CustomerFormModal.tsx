import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ComponentChildren, JSX } from "preact";
import { createPortal } from "preact/compat";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";

import "./CustomerFormModal.css";

interface CustomerFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface CustomerFormData {
  name: string;
  customerTypeId: string;
  residency: "LOCAL" | "OVERSEAS";
  isPosPlaceholder: boolean;
  email: string;
  phone: string;
  address: string;
  taxRegimeId: string;
  hasTaxpayerId: boolean;
  taxpayerId: string;
  commercialServiceId: string;
}

interface LookupOption {
  id: string;
  label: string;
}

type FieldKey = keyof CustomerFormData;
type FieldErrors = Partial<Record<FieldKey, string>>;

const EMPTY_FORM: CustomerFormData = {
  name: "",
  customerTypeId: "",
  residency: "LOCAL",
  isPosPlaceholder: false,
  email: "",
  phone: "",
  address: "",
  taxRegimeId: "",
  hasTaxpayerId: false,
  taxpayerId: "",
  commercialServiceId: "",
};

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

type StepIcon = () => JSX.Element;

interface StepDef {
  id: string;
  label: string;
  icon: StepIcon;
}

const STEPS: StepDef[] = [
  { id: "basic", label: "Basic", icon: IconUser },
  { id: "contact", label: "Contact", icon: IconMail },
  { id: "tax", label: "Tax & IDs", icon: IconShield },
  { id: "service", label: "Service", icon: IconBuilding },
];

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  children: ComponentChildren;
}) {
  return (
    <div class="cfm-field">
      <label
        class={`cfm-label${required ? " cfm-label-required" : ""}`}
        for={htmlFor}
      >
        {label}
      </label>
      {children}
      {error ? <span class="cfm-error-text">{error}</span> : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      class="cfm-toggle"
      onClick={() => onChange(!checked)}
    >
      <span class={`cfm-toggle-switch${checked ? " is-on" : ""}`}>
        <span class="cfm-toggle-knob" />
      </span>
      <span class="cfm-toggle-text">
        <span class="cfm-toggle-label">{label}</span>
        <span class="cfm-toggle-desc">{description}</span>
      </span>
    </button>
  );
}

function buildLabel(
  optionRow: Record<string, unknown>,
  labelColumns: string[],
): string {
  for (const column of labelColumns) {
    const value = optionRow[column];
    if (value != null && String(value).trim()) {
      return String(value);
    }
  }
  return String(optionRow.id ?? "");
}

function initFromRow(
  mode: "create" | "edit",
  row?: Record<string, unknown>,
): CustomerFormData {
  if (mode !== "edit" || !row) {
    return { ...EMPTY_FORM };
  }

  const residency = String(row.residency ?? "LOCAL").toUpperCase();

  return {
    name: row.name != null ? String(row.name) : "",
    customerTypeId: row.customerTypeId != null ? String(row.customerTypeId) : "",
    residency: residency === "OVERSEAS" ? "OVERSEAS" : "LOCAL",
    isPosPlaceholder: row.isPosPlaceholder === 1 || row.isPosPlaceholder === true,
    email: row.email != null ? String(row.email) : "",
    phone: row.phone != null ? String(row.phone) : "",
    address: row.address != null ? String(row.address) : "",
    taxRegimeId: row.taxRegimeId != null ? String(row.taxRegimeId) : "",
    hasTaxpayerId:
      row.hasTaxpayerId === 1 ||
      row.hasTaxpayerId === true ||
      Boolean(row.taxpayerId),
    taxpayerId: row.taxpayerId != null ? String(row.taxpayerId) : "",
    commercialServiceId:
      row.commercialServiceId != null ? String(row.commercialServiceId) : "",
  };
}

export function CustomerFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: CustomerFormModalProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CustomerFormData>(() => initFromRow(mode, row));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerTypes, setCustomerTypes] = useState<LookupOption[]>([]);
  const [taxRegimes, setTaxRegimes] = useState<LookupOption[]>([]);
  const [commercialServices, setCommercialServices] = useState<LookupOption[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLookups() {
      try {
        const api = getElectronApi();
        const [types, regimes, services] = await Promise.all([
          api.db.queryTable({ table: "CustomerTypeDefinition", limit: 200 }),
          api.db.queryTable({ table: "TaxRegime", limit: 200 }),
          api.db.queryTable({ table: "CommercialService", limit: 200 }),
        ]);

        if (cancelled) {
          return;
        }

        setCustomerTypes(
          types.rows
            .map((optionRow) => ({
              id: String(optionRow.id ?? ""),
              label: buildLabel(optionRow, ["name", "code"]),
            }))
            .sort((left, right) => left.label.localeCompare(right.label)),
        );
        setTaxRegimes(
          regimes.rows
            .map((optionRow) => ({
              id: String(optionRow.id ?? ""),
              label: buildLabel(optionRow, ["name"]),
            }))
            .sort((left, right) => left.label.localeCompare(right.label)),
        );
        setCommercialServices(
          services.rows
            .map((optionRow) => ({
              id: String(optionRow.id ?? ""),
              label: buildLabel(optionRow, ["name", "code"]),
            }))
            .sort((left, right) => left.label.localeCompare(right.label)),
        );
      } catch {
        // Selects will simply show any pre-existing value.
      }
    }

    void loadLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends FieldKey>(key: K, value: CustomerFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validateStep(target: number): boolean {
    const stepErrors: FieldErrors = {};

    if (target === 0) {
      if (!form.name.trim()) {
        stepErrors.name = "Name is required";
      }
      if (!form.customerTypeId) {
        stepErrors.customerTypeId = "Required";
      }
    }

    if (target === 1) {
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        stepErrors.email = "Invalid email";
      }
    }

    if (target === 2) {
      if (form.hasTaxpayerId && !form.taxpayerId.trim()) {
        stepErrors.taxpayerId = "Taxpayer ID is required when enabled";
      }
    }

    if (target === 3) {
      if (!form.commercialServiceId) {
        stepErrors.commercialServiceId = "Required";
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function goNext() {
    if (validateStep(step)) {
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
    }
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  const typeLabel = useMemo(
    () =>
      customerTypes.find((option) => option.id === form.customerTypeId)?.label ??
      form.customerTypeId,
    [customerTypes, form.customerTypeId],
  );
  const regimeLabel = useMemo(
    () =>
      taxRegimes.find((option) => option.id === form.taxRegimeId)?.label ??
      (form.taxRegimeId || "—"),
    [taxRegimes, form.taxRegimeId],
  );
  const serviceLabel = useMemo(
    () =>
      commercialServices.find((option) => option.id === form.commercialServiceId)
        ?.label ?? (form.commercialServiceId || "—"),
    [commercialServices, form.commercialServiceId],
  );

  async function submit() {
    // Validate every step so nothing required is skipped.
    for (let index = 0; index < STEPS.length; index += 1) {
      if (!validateStep(index)) {
        setStep(index);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      customerTypeId: form.customerTypeId,
      residency: form.residency,
      isPosPlaceholder: form.isPosPlaceholder ? 1 : 0,
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      taxRegimeId: form.taxRegimeId,
      hasTaxpayerId: form.hasTaxpayerId ? 1 : 0,
      taxpayerId: form.hasTaxpayerId ? form.taxpayerId.trim() : "",
      commercialServiceId: form.commercialServiceId,
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({ table: "Customer", values: payload });
      } else {
        if (!row || row.id == null) {
          throw new Error("Customer id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "Customer",
          primaryKey: { id: row.id },
          values: payload,
        });
      }

      onSaved();
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save customer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLast = step === STEPS.length - 1;

  return createPortal(
    <div
      ref={overlayRef}
      class="cfm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? "Add Customer" : "Edit Customer"}
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div class="cfm-panel">
        <div class="cfm-header">
          <div>
            <h2 class="cfm-title">
              {mode === "create" ? "Add Customer" : "Edit Customer"}
            </h2>
            <p class="cfm-subtitle">
              Step {step + 1} of {STEPS.length} — {STEPS[step].label}
            </p>
          </div>
          <button type="button" class="cfm-close" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>

        <div class="cfm-steps">
          {STEPS.map((stepDef, index) => {
            const Icon = stepDef.icon;
            const done = index < step;
            const active = index === step;
            return (
              <div key={stepDef.id} class="cfm-step">
                <button
                  type="button"
                  class={`cfm-step-btn${active ? " is-active" : ""}${
                    done ? " is-done" : ""
                  }`}
                  disabled={index > step}
                  onClick={() => {
                    if (index < step) {
                      setStep(index);
                    }
                  }}
                >
                  <span class="cfm-step-dot">
                    {done ? <IconCheckCircle /> : <Icon />}
                  </span>
                  <span class="cfm-step-label">{stepDef.label}</span>
                </button>
                {index < STEPS.length - 1 ? (
                  <span class={`cfm-step-line${index < step ? " is-done" : ""}`} />
                ) : null}
              </div>
            );
          })}
        </div>

        <div class="cfm-body">
          {step === 0 ? (
            <>
              <Field label="Full Name" required error={errors.name} htmlFor="cfm-name">
                <div class="cfm-input-wrap">
                  <span class="cfm-input-prefix">
                    <IconUser />
                  </span>
                  <input
                    id="cfm-name"
                    class={`cfm-input has-prefix${errors.name ? " is-error" : ""}`}
                    value={form.name}
                    placeholder="e.g. Martina Voss"
                    onInput={(event) =>
                      set("name", (event.currentTarget as HTMLInputElement).value)
                    }
                  />
                </div>
              </Field>

              <div class="cfm-grid-2">
                <Field
                  label="Customer Type"
                  required
                  error={errors.customerTypeId}
                  htmlFor="cfm-type"
                >
                  <select
                    id="cfm-type"
                    class={`cfm-select${errors.customerTypeId ? " is-error" : ""}`}
                    value={form.customerTypeId}
                    onChange={(event) =>
                      set(
                        "customerTypeId",
                        (event.currentTarget as HTMLSelectElement).value,
                      )
                    }
                  >
                    <option value="">Select…</option>
                    {customerTypes.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Residency" required htmlFor="cfm-residency">
                  <select
                    id="cfm-residency"
                    class="cfm-select"
                    value={form.residency}
                    onChange={(event) =>
                      set(
                        "residency",
                        (event.currentTarget as HTMLSelectElement).value as
                          | "LOCAL"
                          | "OVERSEAS",
                      )
                    }
                  >
                    <option value="LOCAL">Domestic</option>
                    <option value="OVERSEAS">Foreign</option>
                  </select>
                </Field>
              </div>

              <Toggle
                checked={form.isPosPlaceholder}
                onChange={(value) => set("isPosPlaceholder", value)}
                label="POS Placeholder"
                description="Mark this as a generic walk-in customer for point-of-sale"
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field label="Email Address" error={errors.email} htmlFor="cfm-email">
                <div class="cfm-input-wrap">
                  <span class="cfm-input-prefix">
                    <IconMail />
                  </span>
                  <input
                    id="cfm-email"
                    type="email"
                    class={`cfm-input has-prefix${errors.email ? " is-error" : ""}`}
                    value={form.email}
                    placeholder="name@company.com"
                    onInput={(event) =>
                      set("email", (event.currentTarget as HTMLInputElement).value)
                    }
                  />
                </div>
              </Field>

              <Field label="Phone Number" htmlFor="cfm-phone">
                <div class="cfm-input-wrap">
                  <span class="cfm-input-prefix">
                    <IconPhone />
                  </span>
                  <input
                    id="cfm-phone"
                    type="tel"
                    class="cfm-input has-prefix"
                    value={form.phone}
                    placeholder="+1 (415) 000-0000"
                    onInput={(event) =>
                      set("phone", (event.currentTarget as HTMLInputElement).value)
                    }
                  />
                </div>
              </Field>

              <div class="cfm-section-divider">
                <p class="cfm-section-title">
                  <IconMapPin /> Address
                </p>
                <Field label="Full Address" htmlFor="cfm-address">
                  <textarea
                    id="cfm-address"
                    class="cfm-textarea"
                    value={form.address}
                    placeholder="740 Market St, San Francisco, CA 94102"
                    onInput={(event) =>
                      set(
                        "address",
                        (event.currentTarget as HTMLTextAreaElement).value,
                      )
                    }
                  />
                </Field>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label="Tax Regime" htmlFor="cfm-regime">
                <select
                  id="cfm-regime"
                  class="cfm-select"
                  value={form.taxRegimeId}
                  onChange={(event) =>
                    set("taxRegimeId", (event.currentTarget as HTMLSelectElement).value)
                  }
                >
                  <option value="">— None —</option>
                  {taxRegimes.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p class="cfm-hint">
                  Determines how this customer is taxed on invoices.
                </p>
              </Field>

              <div class="cfm-stack">
                <Toggle
                  checked={form.hasTaxpayerId}
                  onChange={(value) => set("hasTaxpayerId", value)}
                  label="Has Taxpayer ID"
                  description="Enable if this customer has a registered tax ID"
                />
                {form.hasTaxpayerId ? (
                  <Field
                    label="Taxpayer ID"
                    required
                    error={errors.taxpayerId}
                    htmlFor="cfm-taxpayer"
                  >
                    <div class="cfm-input-wrap">
                      <span class="cfm-input-prefix">
                        <IconShield />
                      </span>
                      <input
                        id="cfm-taxpayer"
                        class={`cfm-input has-prefix${
                          errors.taxpayerId ? " is-error" : ""
                        }`}
                        value={form.taxpayerId}
                        placeholder="e.g. MVS-847291"
                        onInput={(event) =>
                          set(
                            "taxpayerId",
                            (event.currentTarget as HTMLInputElement).value,
                          )
                        }
                      />
                    </div>
                  </Field>
                ) : null}
              </div>

              <div class="cfm-callout">
                <IconShield />
                <p>
                  Taxpayer IDs are validated against the tax authority registry.
                  Ensure the ID matches exactly.
                </p>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field
                label="Commercial Service"
                required
                error={errors.commercialServiceId}
                htmlFor="cfm-service"
              >
                <select
                  id="cfm-service"
                  class={`cfm-select${errors.commercialServiceId ? " is-error" : ""}`}
                  value={form.commercialServiceId}
                  onChange={(event) =>
                    set(
                      "commercialServiceId",
                      (event.currentTarget as HTMLSelectElement).value,
                    )
                  }
                >
                  <option value="">Select a service…</option>
                  {commercialServices.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p class="cfm-hint">
                  Assigns the customer to a commercial service and pricing structure.
                </p>
              </Field>

              <div class="cfm-review">
                <p class="cfm-review-title">Review</p>
                <div class="cfm-review-rows">
                  {[
                    { label: "Name", value: form.name || "—" },
                    { label: "Type", value: typeLabel || "—" },
                    { label: "Email", value: form.email || "—" },
                    { label: "Phone", value: form.phone || "—" },
                    {
                      label: "Residency",
                      value: form.residency === "OVERSEAS" ? "Foreign" : "Domestic",
                    },
                    { label: "Tax Regime", value: regimeLabel },
                    {
                      label: "Taxpayer ID",
                      value: form.hasTaxpayerId ? form.taxpayerId || "—" : "N/A",
                    },
                    { label: "Service", value: serviceLabel },
                  ].map((reviewRow) => (
                    <div key={reviewRow.label} class="cfm-review-row">
                      <span class="cfm-review-label">{reviewRow.label}</span>
                      <span class="cfm-review-value">{reviewRow.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div class="cfm-footer">
          {step > 0 ? (
            <button type="button" class="cfm-btn-text" onClick={goBack}>
              Back
            </button>
          ) : (
            <button type="button" class="cfm-btn-text" onClick={onClose}>
              Cancel
            </button>
          )}

          {submitError ? <span class="cfm-footer-error">{submitError}</span> : null}

          <div class="cfm-footer-right">
            <div class="cfm-dots">
              {STEPS.map((stepDef, index) => (
                <span
                  key={stepDef.id}
                  class={`cfm-dot${index === step ? " is-active" : ""}${
                    index < step ? " is-done" : ""
                  }`}
                />
              ))}
            </div>

            {isLast ? (
              <button
                type="button"
                class="cfm-btn-primary"
                disabled={isSubmitting}
                onClick={() => void submit()}
              >
                <IconCheckCircle />
                {isSubmitting
                  ? "Saving…"
                  : mode === "create"
                    ? "Save Customer"
                    : "Save Changes"}
              </button>
            ) : (
              <button type="button" class="cfm-btn-primary" onClick={goNext}>
                Continue
                <IconArrow />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
