"use client";

import { createPortal } from "react-dom";

type ActionToastProps = {
  message: string;
  title: string;
  tone: "success" | "error";
};

export function ActionToast({ message, title, tone }: ActionToastProps) {
  if (!message) return null;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={`action-toast action-toast--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>,
    document.body,
  );
}
