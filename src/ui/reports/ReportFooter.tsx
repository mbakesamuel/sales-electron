import type { ComponentChildren } from "preact";
import "./ReportFooter.css";

export interface ReportFooterProps {
  /** Role shown above the signature space. */
  label?: string;
  /** Optional printed name under the signature line. */
  name?: string | null;
  children?: ComponentChildren;
}

export function ReportFooter({
  label = "Sales Manager",
  name = null,
  children,
}: ReportFooterProps) {
  return (
    <footer class="report-footer">
      <div class="report-footer-signature">
        <p class="report-footer-label">{label}</p>
        <div class="report-footer-space" aria-hidden="true" />
        <div class="report-footer-line" aria-hidden="true" />
        {name ? <p class="report-footer-name">{name}</p> : null}
        {children}
      </div>
    </footer>
  );
}
