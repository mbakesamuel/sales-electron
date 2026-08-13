import "./QrCode.css";
export interface QrCodeProps {
    value: string;
    size?: number;
    alt?: string;
}
export declare function QrCode({ value, size, alt, }: QrCodeProps): import("preact").JSX.Element;
