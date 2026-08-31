import type { ComponentChildren } from "preact";
import { getRouteLabel } from "../../shared/routeCatalog.ts";
import "./ReportOverlayShell.css";

interface ReportOverlayShellProps {
  reportId?: string;
  title?: string;
  onClose: () => void;
  children: ComponentChildren;
}

export function ReportOverlayShell({
  reportId,
  title,
  onClose,
  children,
}: ReportOverlayShellProps) {
  const displayTitle =
    title ?? (reportId != null ? getRouteLabel(reportId) : "Report");

  return (
    <div class="report-overlay-backdrop" onClick={onClose}>
      <div
        class="report-overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-label={displayTitle}
        onClick={(event) => event.stopPropagation()}
      >
        <div class="report-overlay-toolbar no-print">
          <span class="report-overlay-title">{displayTitle}</span>
          <button
            type="button"
            class="scr-btn scr-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div class="report-overlay-body">{children}</div>
      </div>
    </div>
  );
}
