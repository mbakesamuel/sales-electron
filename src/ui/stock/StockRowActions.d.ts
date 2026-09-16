import type { ComponentChildren, JSX } from "preact";
export declare function IconEye(): JSX.Element;
export declare function IconPencil(): JSX.Element;
export declare function IconTrash(): JSX.Element;
export declare function IconCheck(): JSX.Element;
export declare function IconPackageIn(): JSX.Element;
interface StockRowActionButtonProps {
    children: ComponentChildren;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
    danger?: boolean;
}
export declare function StockRowActionButton({ children, onClick, disabled, title, danger, }: StockRowActionButtonProps): JSX.Element;
export {};
