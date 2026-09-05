import "./DocumentStatusStamp.css";

export function draftStampLabel(status: string | null | undefined): string | null {
  if (status === "PENDING") {
    return "UNVALIDATED";
  }
  if (status === "DRAFT") {
    return "DRAFT";
  }
  if (status === "REJECTED") {
    return "REJECTED";
  }
  return null;
}

export function DocumentStatusStamp({
  label,
}: {
  label: string | null | undefined;
}) {
  if (!label) {
    return null;
  }

  return (
    <div class="doc-status-stamp" aria-hidden="true">
      <span class="doc-status-stamp-label">{label}</span>
    </div>
  );
}
