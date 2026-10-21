"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

type HrAdminActionModalProps = {
  children: ReactNode;
  documentNavigation?: boolean;
  closeHref: string;
  footer?: ReactNode;
  eyebrow?: string;
  labelledBy: string;
  title: string;
  description?: string;
  tabs?: string[];
  className?: string;
  onClose?: () => void;
  explicitTabOrder?: boolean;
  focusableBody?: boolean;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function HrAdminActionModal({
  children,
  documentNavigation = false,
  closeHref,
  footer,
  eyebrow,
  labelledBy,
  title,
  description,
  tabs = [],
  className = "",
  onClose,
  explicitTabOrder = true,
  focusableBody = false,
}: HrAdminActionModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    const firstInput = focusable.find((item) => item.matches("input, select, textarea"));
    (firstInput ?? focusable[0] ?? dialog)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, []);

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    if (onClose) {
      onClose();
      return;
    }
    if (documentNavigation) {
      window.location.assign(closeHref);
      return;
    }
    router.push(closeHref);
  }, [closeHref, documentNavigation, isDirty, onClose, router]);

  useEffect(() => {
    window.addEventListener("hr-admin-modal:request-close", requestClose);
    return () => window.removeEventListener("hr-admin-modal:request-close", requestClose);
  }, [requestClose]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    // Nested preview dialogs own their focus trap and Escape handling.
    if ((event.target as HTMLElement).closest('[role="dialog"]') !== event.currentTarget) return;
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    const focusable = dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((item) => item.offsetParent !== null)
      : [];
    if (!focusable.length) {
      return;
    }

    // Safari may skip buttons in native Tab order. Shared dialogs keep
    // traversal explicit by default; consumers can opt out. Native
    // date/time inputs retain internal segment navigation; these consumers
    // place them between ordinary form controls, never at the trap boundary.
    const active = document.activeElement;
    const nativeSegments = active instanceof HTMLInputElement && ["date", "time", "datetime-local"].includes(active.type);
    if (explicitTabOrder && !nativeSegments) {
      event.preventDefault();
      const index = focusable.findIndex((item) => item === active);
      const next = event.shiftKey ? (index <= 0 ? focusable.length - 1 : index - 1) : (index + 1) % focusable.length;
      focusable[next]?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="hr-admin-modal-backdrop employee-create-modal-backdrop" role="presentation">
      <section
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`accerio-dialog hr-admin-action-modal employee-create-modal employee-maintenance-modal${tabs.length ? " hr-admin-action-modal--with-tabs" : ""}${className ? ` ${className}` : ""}`}
        onClickCapture={(event) => {
          if (!documentNavigation || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
          if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
          if (new URL(anchor.href, window.location.href).href !== new URL(closeHref, window.location.href).href) return;
          event.preventDefault();
          event.stopPropagation();
          requestClose();
        }}
        onChange={() => setIsDirty(true)}
        onInput={() => setIsDirty(true)}
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="hr-admin-action-modal__header">
          <div>
            {eyebrow ? <span className="workspace-card__eyebrow">{eyebrow}</span> : null}
            <h2 className="hr-admin-action-modal__title" id={labelledBy}>{title}</h2>
            {description ? <p className="hr-admin-action-modal__description">{description}</p> : null}
          </div>
          <button aria-label={`Close ${title}`} className="hr-admin-action-modal__close" onClick={requestClose} type="button">
            ×
          </button>
        </header>
        {tabs.length ? (
          <div className="hr-admin-modal-tabs" aria-label={`${title} sections`}>
            {tabs.map((tab, index) => (
              <span aria-selected={index === 0 ? "true" : undefined} className="hr-admin-modal-tab" key={tab} role="tab">
                {tab}
              </span>
            ))}
          </div>
        ) : null}
        <div className="hr-admin-action-modal__body employee-create-modal__body" tabIndex={focusableBody ? 0 : -1} role="region" aria-label={`${title} content`}>{children}</div>
        {footer ? <footer className="hr-admin-action-modal__footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
