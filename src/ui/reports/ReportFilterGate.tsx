import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ReportOverlayShell } from "./ReportOverlayShell.tsx";

interface ReportFilterGateProps {
  ready: boolean;
  reportId: string;
  className?: string;
  filters: ComponentChildren;
  children: ComponentChildren;
}

export function ReportFilterGate({
  ready,
  reportId,
  className = "scr-page",
  filters,
  children,
}: ReportFilterGateProps) {
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (ready && !dismissed) {
      setOpen(true);
    }
  }, [ready, dismissed]);

  function closePreview() {
    setOpen(false);
    setDismissed(true);
  }

  return (
    <div class={`${className} report-filter-gate${open ? " is-preview-open" : ""}`}>
      <div class="report-filter-step" hidden={open}>
        {filters}
        <div class="report-filter-actions no-print">
          <button
            type="button"
            class="scr-btn"
            disabled={!ready}
            onClick={() => setOpen(true)}
          >
            View report
          </button>
        </div>
      </div>
      {open && ready ? (
        <ReportOverlayShell preview reportId={reportId} onClose={closePreview}>
          {children}
        </ReportOverlayShell>
      ) : null}
    </div>
  );
}
