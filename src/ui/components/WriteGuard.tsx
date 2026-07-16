import type { ComponentChildren } from "preact";

interface WriteGuardProps {
  readOnly?: boolean;
  children: ComponentChildren;
}

export function WriteGuard({ readOnly = false, children }: WriteGuardProps) {
  if (readOnly) {
    return null;
  }

  return <>{children}</>;
}
