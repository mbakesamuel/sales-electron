import type { ComponentChildren } from "preact";
import { ReportCommentsSection } from "./ReportCommentsSection.tsx";
import { ReportEmptyMessage } from "./ReportEmptyMessage.tsx";
import { ReportFooter } from "./ReportFooter.tsx";

export function ReportDocumentShell({
  className = "scr-document",
  isEmpty,
  emptyMessage,
  emptyHint,
  comments = null,
  signatoryName = null,
  signatoryTitle,
  showComments = true,
  showFooter = true,
  header,
  children,
}: {
  className?: string;
  isEmpty: boolean;
  emptyMessage: string;
  emptyHint?: string;
  comments?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string;
  showComments?: boolean;
  showFooter?: boolean;
  header?: ComponentChildren;
  children: ComponentChildren;
}) {
  if (isEmpty) {
    return (
      <div class={`${className} scr-document-empty`}>
        <ReportEmptyMessage message={emptyMessage} hint={emptyHint} />
      </div>
    );
  }

  return (
    <div class={className}>
      {header}
      {children}
      {showComments ? <ReportCommentsSection comments={comments} /> : null}
      {showFooter && signatoryTitle ? (
        <ReportFooter name={signatoryName} label={signatoryTitle} />
      ) : null}
    </div>
  );
}
