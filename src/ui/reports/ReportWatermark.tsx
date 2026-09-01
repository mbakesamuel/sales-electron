import { REPORT_WATERMARK_URL } from "./reportWatermarkAsset.ts";
import "./ReportWatermark.css";

export function ReportWatermark() {
  return (
    <div class="report-watermark" aria-hidden="true">
      <img class="report-watermark-image" src={REPORT_WATERMARK_URL} alt="" />
    </div>
  );
}
