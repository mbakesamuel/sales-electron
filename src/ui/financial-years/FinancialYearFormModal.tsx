import { useState } from "preact/hooks";
import { getAuthenticatedFinancialYears } from "../auth/financialYears.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import "../components/FormDialog.css";

interface FinancialYearFormModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function FinancialYearFormModal({
  onClose,
  onSaved,
}: FinancialYearFormModalProps) {
  const [financialYear, setFinancialYear] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: Event) {
    event.preventDefault();
    setError(null);
    const year = Number.parseInt(financialYear, 10);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setError("Enter a valid year between 2000 and 2100.");
      return;
    }

    setIsSubmitting(true);
    try {
      await getAuthenticatedFinancialYears().openYear(year);
      onSaved();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to open financial year.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormDialog
      ariaLabel="Open financial year"
      title="Open financial year"
      subtitle="Closes any previously open year and creates Jan–Dec months"
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="fy-year">
            Year
          </label>
          <div class="form-dialog-control">
            <input
              id="fy-year"
              type="number"
              class="form-dialog-input"
              value={financialYear}
              disabled={isSubmitting}
              min={2000}
              max={2100}
              onInput={(event) =>
                setFinancialYear((event.currentTarget as HTMLInputElement).value)
              }
            />
            <p class="form-dialog-hint">
              Opens Jan 1–Dec 31 and sets the current calendar month as the open posting
              month.
            </p>
          </div>
        </div>

        {error ? <p class="form-dialog-error">{error}</p> : null}

        <div class="form-dialog-actions">
          <button
            type="submit"
            class="form-dialog-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Opening…" : "Open year"}
          </button>
          <button
            type="button"
            class="form-dialog-btn-secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </FormDialog>
  );
}
