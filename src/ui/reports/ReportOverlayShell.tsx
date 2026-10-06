import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";
import { X } from "lucide-react";
import { getRouteLabel } from "../../shared/routeCatalog.ts";
import { ReportPrintButton } from "./ReportChrome.tsx";
import "./ReportOverlayShell.css";

interface ReportOverlayShellProps {
  reportId?: string;
  title?: string;
  /** Report PDF pane: Print plus Close with an X. Other documents keep the outline Close only. */
  preview?: boolean;
  onClose: () => void;
  children: ComponentChildren;
}

export function ReportOverlayShell({
  reportId,
  title,
  preview = false,
  onClose,
  children,
}: ReportOverlayShellProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLElement | null | undefined>(undefined);
  const displayTitle =
    title ?? (reportId != null ? getRouteLabel(reportId) : "Report");

  useEffect(() => {
    const node = anchorRef.current;
    const next = node?.closest(".home-content") ?? node?.closest(".home-main");
    setHost(next instanceof HTMLElement ? next : null);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const panel = (
    <div class="report-overlay-backdrop" role="region" aria-label={displayTitle}>
      <div class="report-overlay-panel">
        <div class="report-overlay-toolbar no-print">
          <h2 class="report-overlay-title">{displayTitle}</h2>
          {preview ? (
            <div class="report-inline-actions">
              <ReportPrintButton />
              <button type="button" class="report-inline-close" onClick={onClose}>
                <X size={16} aria-hidden="true" />
                Close
              </button>
            </div>
          ) : (
            <button type="button" class="report-overlay-close" onClick={onClose}>
              Close
            </button>
          )}
        </div>
        <div class="report-overlay-body">{children}</div>
      </div>
    </div>
  );

  return (
    <>
      <div ref={anchorRef} class="report-overlay-anchor" hidden />
      {host ? createPortal(panel, host) : host === null ? panel : null}
    </>
  );
}
