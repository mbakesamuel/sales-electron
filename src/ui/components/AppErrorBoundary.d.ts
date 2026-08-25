import { Component, type ComponentChildren } from "preact";
interface Props {
    children: ComponentChildren;
}
interface State {
    error: string | null;
}
/** Catches render errors in the signed-in shell so login success never looks like a hung boot screen. */
export declare class AppErrorBoundary extends Component<Props, State> {
    state: State;
    static getDerivedStateFromError(error: unknown): State;
    componentDidCatch(error: unknown): void;
    render(): ComponentChildren;
}
export {};
