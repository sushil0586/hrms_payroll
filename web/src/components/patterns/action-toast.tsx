"use client";

import { createPortal } from "react-dom";

type ActionToastProps = {
  message: string;
  title: string;
  tone: "success" | "error";
  onDismiss?: () => void;
};

export const SUCCESS_TOAST_DURATION_MS = 5_000;
export const ERROR_TOAST_DURATION_MS = 8_000;

export function ActionToast({ message, title, tone, onDismiss }: ActionToastProps) {
  if (!message) return null;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div aria-atomic="true" className={`action-toast action-toast--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <strong>{title}</strong>
      <span>{message}</span>
      {onDismiss ? <button className="button button--secondary button--compact" type="button" onClick={onDismiss} aria-label="Dismiss notification">Dismiss</button> : null}
    </div>,
    document.body,
  );
}
