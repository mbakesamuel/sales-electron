import { useMemo, useState } from "preact/hooks";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import { getAuthenticatedFinancialYears } from "../auth/financialYears.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import "../components/FormDialog.css";
import "./FinancialMonthsScreen.css";

interface FinancialYearFormModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function initialPostingMonth(year: number): number {
  const today = new Date();
  if (today.getFullYear() === year) {
    return today.getMonth() + 1;
  }
  return 1;
}

export function FinancialYearFormModal({
  onClose,
  onSaved,
}: FinancialYearFormModalProps) {
  const calendarYear = new Date().getFullYear();
  const [financialYear, setFinancialYear] = useState(() => String(calendarYear));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preview = useMemo(() => {
    const year = Number.parseInt(financialYear, 10);
    if (!Number.isInteger(year) || year < 2000 || year > calendarYear) {
      return null;
    }
    const postingMonth = initialPostingMonth(year);
    return {
      year,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      postingMonth,
      postingMonthName: MONTH_NAMES[postingMonth - 1],
      openedOn: formatDisplayDate(
        `${calendarYear}-${pad2(new Date().getMonth() + 1)}-${pad2(new Date().getDate())}`,
      ),
    };
  }, [calendarYear, financialYear]);

  async function handleSubmit(event: Event) {
    event.preventDefault();
    setError(null);
    const year = Number.parseInt(financialYear, 10);
    if (!Number.isInteger(year) || year < 2000 || year > calendarYear) {
      setError(
        `Enter a year between 2000 and ${calendarYear}. Future years cannot be opened yet.`,
      );
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
      subtitle="Only one year can be open at a time"
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row form-dialog-row-center">
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
              max={calendarYear}
              onInput={(event) =>
                setFinancialYear((event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        {preview ? (
          <div class="fy-modal-summary" aria-live="polite">
            <p class="fy-modal-summary-title">What will be opened</p>
            <dl class="fy-modal-summary-list">
              <div class="fy-modal-summary-row">
                <dt>Period</dt>
                <dd>
                  {formatDisplayDate(preview.startDate)} →{" "}
                  {formatDisplayDate(preview.endDate)}
                </dd>
              </div>
              <div class="fy-modal-summary-row">
                <dt>Opened on</dt>
                <dd>{preview.openedOn}</dd>
              </div>
              <div class="fy-modal-summary-row">
                <dt>Posting month</dt>
                <dd>
                  {preview.postingMonthName} {preview.year}
                </dd>
              </div>
            </dl>
            <p class="form-dialog-hint">
              Creates Jan–Dec months, closes any previously open year, and opens{" "}
              {preview.postingMonthName} for posting. Future calendar years cannot
              be opened early.
            </p>
          </div>
        ) : (
          <p class="form-dialog-hint">
            Enter a year between 2000 and {calendarYear} (current calendar year).
          </p>
        )}

        {error ? <p class="form-dialog-error">{error}</p> : null}

        <div class="form-dialog-actions">
          <button
            type="submit"
            class="form-dialog-btn-primary"
            disabled={isSubmitting || !preview}
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
