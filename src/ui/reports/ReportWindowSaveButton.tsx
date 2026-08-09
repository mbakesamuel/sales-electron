import { useState } from "preact/hooks";
import { saveReportPdf } from "./saveReportPdf.ts";

export function ReportWindowSaveButton({ fileName }: { fileName: string }) {
  const [saving, setSaving] = useState(false);

  return (
    <button
      type="button"
      class="scr-btn"
      disabled={saving}
      onClick={() => {
        setSaving(true);
        void saveReportPdf(fileName).finally(() => setSaving(false));
      }}
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}
