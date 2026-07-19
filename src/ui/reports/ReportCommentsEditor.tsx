import { useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import "../components/FormDialog.css";
import "./ReportComments.css";

interface ReportCommentsEditorProps {
  reportId: string;
  comments: string | null | undefined;
  onSaved: (comments: string | null) => void | Promise<void>;
  /** Extra class on the toolbar button (defaults to scr-btn secondary). */
  buttonClass?: string;
}

export function ReportCommentsEditor({
  reportId,
  comments,
  onSaved,
  buttonClass = "scr-btn scr-btn-secondary",
}: ReportCommentsEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditor() {
    setDraft(comments ?? "");
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const trimmed = draft.trim();
      const result = await getAuthenticatedReports().saveReportComments({
        reportId,
        text: trimmed.length > 0 ? trimmed : null,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      await onSaved(result.comments);
      setOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save comments.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" class={buttonClass} onClick={openEditor}>
        Comments
      </button>

      {open ? (
        <FormDialog
          ariaLabel="Edit report comments"
          title="Report comments"
          subtitle="These comments appear on the report when non-empty. Clear the text and save to hide the section."
          onClose={() => {
            if (!saving) {
              setOpen(false);
            }
          }}
        >
          <div class="scr-comments-form">
            <label class="scr-comments-field">
              <span>Comments</span>
              <textarea
                class="scr-comments-textarea"
                rows={8}
                value={draft}
                disabled={saving}
                placeholder="Enter vital comments for this report…"
                onInput={(event) =>
                  setDraft((event.currentTarget as HTMLTextAreaElement).value)
                }
              />
            </label>
            {error ? <p class="scr-comments-error">{error}</p> : null}
            <div class="form-dialog-actions" style="padding-left: 0; margin-top: 12px;">
              <button
                type="button"
                class="form-dialog-btn-primary"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                class="form-dialog-btn-secondary"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </FormDialog>
      ) : null}
    </>
  );
}
