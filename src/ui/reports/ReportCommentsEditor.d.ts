import "../components/FormDialog.css";
import "./ReportComments.css";
interface ReportCommentsEditorProps {
    reportId: string;
    comments: string | null | undefined;
    onSaved: (comments: string | null) => void | Promise<void>;
    /** Extra class on the toolbar button (defaults to scr-btn secondary). */
    buttonClass?: string;
}
export declare function ReportCommentsEditor({ reportId, comments, onSaved, buttonClass, }: ReportCommentsEditorProps): import("preact").JSX.Element;
export {};
