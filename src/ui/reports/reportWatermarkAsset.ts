import logoSrc from "../../assets/logo.svg";

/** Bundled logo URL for report watermark backgrounds (screen + PDF export). */
export const REPORT_WATERMARK_URL = logoSrc;

export function reportWatermarkBackgroundValue(): string {
  return `url("${REPORT_WATERMARK_URL}")`;
}
