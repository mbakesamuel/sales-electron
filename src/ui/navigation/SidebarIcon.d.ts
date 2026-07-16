import type { LucideIcon } from "lucide-react";
interface SidebarIconProps {
    icon: LucideIcon;
    className?: string;
    size?: number;
}
export declare function SidebarIcon({ icon: Icon, className, size }: SidebarIconProps): import("preact").JSX.Element;
export declare function SidebarChevron({ isOpen }: {
    isOpen: boolean;
}): import("preact").JSX.Element;
export {};
