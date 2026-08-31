import "../reports/StockCommitmentReport.css";
import "./SalePrintView.css";
interface SalePrintViewProps {
    saleId: string;
    onClose: () => void;
}
export declare function SalePrintView({ saleId, onClose }: SalePrintViewProps): import("preact").JSX.Element;
export {};
