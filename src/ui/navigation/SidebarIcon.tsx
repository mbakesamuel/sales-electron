import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

interface SidebarIconProps {
  icon: LucideIcon;
  className?: string;
  size?: number;
}

export function SidebarIcon({ icon: Icon, className = "", size = 16 }: SidebarIconProps) {
  return <Icon className={className} size={size} strokeWidth={2} aria-hidden="true" />;
}

export function SidebarChevron({ isOpen }: { isOpen: boolean }) {
  return (
    <ChevronRight
      className={`sidebar-accordion-chevron${isOpen ? " is-open" : ""}`}
      size={16}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}
