import "./ReportComments.css";
interface ReportCommentsSectionProps {
    comments: string | null | undefined;
}
/** Printed/on-document comments block; hidden when empty. */
export declare function ReportCommentsSection({ comments }: ReportCommentsSectionProps): import("preact").JSX.Element | null;
export {};
