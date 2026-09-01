import type { ComponentChildren } from "preact";
import { ReportAttributionFooter } from "./ReportAttributionFooter.tsx";
import { ReportCommentsSection } from "./ReportCommentsSection.tsx";
import { ReportEmptyMessage } from "./ReportEmptyMessage.tsx";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportWatermark } from "./ReportWatermark.tsx";

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
        <ReportWatermark />
        <ReportEmptyMessage message={emptyMessage} hint={emptyHint} />
        <ReportAttributionFooter />
      </div>
    );
  }

  return (
    <div class={className}>
      <ReportWatermark />
      {header}
      {children}
      {showComments ? <ReportCommentsSection comments={comments} /> : null}
      {showFooter && signatoryTitle ? (
        <ReportFooter name={signatoryName} label={signatoryTitle} />
      ) : null}
      <ReportAttributionFooter />
    </div>
  );
}
