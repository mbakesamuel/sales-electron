import { useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import "./FormDialog.css";

interface FormDialogProps {
  ariaLabel: string;
  title: string;
  subtitle?: string;
  wide?: boolean;
  elevated?: boolean;
  onClose: () => void;
  children: ComponentChildren;
}

export function FormDialog({
  ariaLabel,
  title,
  subtitle,
  wide = false,
  elevated = false,
  onClose,
  children,
}: FormDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      class={`form-dialog-overlay${elevated ? " form-dialog-overlay--elevated" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        class="form-dialog-backdrop"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />

      <div
        class={`form-dialog-panel${wide ? " form-dialog-panel-wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div class="form-dialog-header">
          <div>
            <div class="form-dialog-title">{title}</div>
            {subtitle ? <p class="form-dialog-subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" class="form-dialog-close" onClick={onClose}>
            X
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body,
  );
}
