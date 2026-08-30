export function ReportEmptyMessage({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}) {
  return (
    <div class="report-empty-message" role="status">
      <p class="report-empty-text">{message}</p>
      {hint ? <p class="report-empty-hint">{hint}</p> : null}
    </div>
  );
}
