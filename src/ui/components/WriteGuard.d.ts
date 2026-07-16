import type { ComponentChildren } from "preact";
interface WriteGuardProps {
    readOnly?: boolean;
    children: ComponentChildren;
}
export declare function WriteGuard({ readOnly, children }: WriteGuardProps): import("preact").JSX.Element | null;
export {};
