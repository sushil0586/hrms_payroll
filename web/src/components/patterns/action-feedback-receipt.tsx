"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ActionToast, SUCCESS_TOAST_DURATION_MS } from "@/components/patterns/action-toast";

type Receipt = { pathname: string; id: string; message: string; title: string; createdAt: number };
const key = "accerio.action-feedback";
const eventName = "accerio:action-feedback";
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

/** Written only after a confirmed mutation. Never an authorization or data source. */
export function rememberActionSuccess(path: string, id: string, title: string, message: string) {
  try {
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin || !id) return;
    const receipt = { pathname: url.pathname, id, title, message, createdAt: Date.now() } satisfies Receipt;
    sessionStorage.setItem(key, JSON.stringify(receipt));
    window.dispatchEvent(new CustomEvent<Receipt>(eventName, { detail: receipt }));
  } catch { /* Restricted browser storage must not prevent an authorized navigation. */ }
}

export function ActionFeedbackReceipt({ recordIds }: { recordIds: string[] }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  return ready ? <ClientReceipt recordIds={recordIds} /> : null;
}

function ClientReceipt({ recordIds }: { recordIds: string[] }) {
  const [receipt, setReceipt] = useState<Receipt | null>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const candidate = JSON.parse(raw) as Receipt;
      if (candidate.pathname === window.location.pathname && typeof candidate.id === "string" && candidate.id
        && typeof candidate.title === "string" && typeof candidate.message === "string"
        && Date.now() - candidate.createdAt >= 0 && Date.now() - candidate.createdAt < 120_000) return {
          ...candidate,
          message: recordIds.includes(candidate.id) ? candidate.message : "The saved record is outside this view. Review the list filters or your current access to find it.",
        };
    } catch { /* Expired/unavailable receipts do not change the authoritative list. */ }
    return null;
  });
  const [showToast, setShowToast] = useState(Boolean(receipt));
  useEffect(() => {
    try { sessionStorage.removeItem(key); } catch { /* Browser storage can be restricted. */ }
  }, []);
  useEffect(() => {
    const receive = (event: Event) => {
      const next = (event as CustomEvent<Receipt>).detail;
      if (!next || next.pathname !== window.location.pathname) return;
      setReceipt(next);
      setShowToast(true);
      try { sessionStorage.removeItem(key); } catch { /* Browser storage can be restricted. */ }
    };
    window.addEventListener(eventName, receive);
    return () => window.removeEventListener(eventName, receive);
  }, []);
  useEffect(() => {
    if (!showToast) return;
    const timeout = window.setTimeout(() => setShowToast(false), SUCCESS_TOAST_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [receipt, showToast]);
  if (!receipt) return null;
  return <div className="notice notice--success">
    <strong>{receipt.title}</strong><span>{receipt.message}</span>
    {showToast ? <ActionToast title={receipt.title} message={receipt.message} tone="success" onDismiss={() => setShowToast(false)} /> : null}
  </div>;
}
