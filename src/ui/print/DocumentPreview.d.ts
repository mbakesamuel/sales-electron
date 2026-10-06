import { type ComponentChildren } from "preact";
import { type PrintPage } from "./buildPrintDocumentHtml.ts";
import "./DocumentPreview.css";
export declare function DocumentPreview({ title, fileName, page, bodyClass, sourceKey, children, }: {
    title: string;
    fileName: string;
    page?: PrintPage;
    bodyClass?: string;
    sourceKey: unknown;
    children: ComponentChildren;
}): import("preact").JSX.Element;
