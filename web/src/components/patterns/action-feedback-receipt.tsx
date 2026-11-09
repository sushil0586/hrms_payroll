"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActionToast, SUCCESS_TOAST_DURATION_MS } from "./action-toast";
import { useActionFeedback } from "./action-feedback-provider";
import { ACTION_RECEIPT_EVENT, ACTION_RECEIPT_KEY, consumeActionReceipt, validActionReceipt, type ActionReceipt } from "./action-feedback-store";
export { rememberActionSuccess } from "./action-feedback-store";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function ActionFeedbackReceipt({ recordIds }: { recordIds: string[] }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  return ready ? <ClientReceipt recordIds={recordIds} /> : null;
}

function ClientReceipt({ recordIds }: { recordIds: string[] }) {
  const feedback = useActionFeedback();
  const [receipt, setReceipt] = useState<ActionReceipt | null>(() => {
    try {
      const candidate: unknown = JSON.parse(sessionStorage.getItem(ACTION_RECEIPT_KEY) || "null");
      return validActionReceipt(candidate, window.location.pathname, feedback?.scopeKey) ? candidate : null;
    } catch { return null; }
  });
  const [showToast, setShowToast] = useState(Boolean(receipt));
  const published = useRef<ActionReceipt | null>(null);
  const message = receipt && !recordIds.includes(receipt.id)
    ? "The saved record is outside this view. Review the list filters or your current access to find it."
    : receipt?.message ?? "";

  useEffect(() => {
    if (receipt) consumeActionReceipt(receipt);
  }, [receipt]);
  useEffect(() => {
    const receive = (event: Event) => {
      const next: unknown = (event as CustomEvent<unknown>).detail;
      if (!validActionReceipt(next, window.location.pathname, feedback?.scopeKey)) return;
      setReceipt(next);
      setShowToast(true);
      consumeActionReceipt(next);
    };
    window.addEventListener(ACTION_RECEIPT_EVENT, receive);
    return () => window.removeEventListener(ACTION_RECEIPT_EVENT, receive);
  }, [feedback]);
  useEffect(() => {
    if (!receipt || !feedback || published.current === receipt) return;
    published.current = receipt;
    feedback.success(receipt.title, message);
  }, [receipt, feedback, message]);
  useEffect(() => {
    if (feedback || !showToast) return;
    const timeout = window.setTimeout(() => setShowToast(false), SUCCESS_TOAST_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [receipt, showToast, feedback]);
  if (!receipt) return null;
  return <div className="notice notice--success">
    <strong>{receipt.title}</strong><span>{message}</span>
    {!feedback && showToast ? <ActionToast title={receipt.title} message={message} tone="success" onDismiss={() => setShowToast(false)} /> : null}
  </div>;
}
