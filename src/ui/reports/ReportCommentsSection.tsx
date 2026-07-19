import "./ReportComments.css";

interface ReportCommentsSectionProps {
  comments: string | null | undefined;
}

/** Printed/on-document comments block; hidden when empty. */
export function ReportCommentsSection({ comments }: ReportCommentsSectionProps) {
  const text = comments?.trim() ?? "";
  if (!text) {
    return null;
  }

  return (
    <section class="scr-comments">
      <h3 class="scr-comments-title">Comments</h3>
      <div class="scr-comments-body">{text}</div>
    </section>
  );
}
