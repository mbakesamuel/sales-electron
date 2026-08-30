import type { ComponentChildren } from "preact";
export declare function ReportDocumentShell({ className, isEmpty, emptyMessage, emptyHint, comments, signatoryName, signatoryTitle, showComments, showFooter, header, children, }: {
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
}): import("preact").JSX.Element;
