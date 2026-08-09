import type { ComponentChildren } from "preact";
import "./ReportFooter.css";

export interface ReportFooterProps {
  /** Role shown under the printed name. */
  label: string;
  /** Optional printed name above the role label. Null/empty hides the name line. */
  name?: string | null;
  children?: ComponentChildren;
}

export function ReportFooter({ label, name = null, children }: ReportFooterProps) {
  return (
    <footer class="report-footer">
      <div class="report-footer-signature">
        <div class="report-footer-space" aria-hidden="true" />
        {/*  <div class="report-footer-line" aria-hidden="true" /> */}
        {name ? <p class="report-footer-name">{name}</p> : null}
        <p class="report-footer-label">{label}</p>
        {children}
      </div>
    </footer>
  );
}
