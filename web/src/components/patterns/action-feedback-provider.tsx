"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ActionToast, SUCCESS_TOAST_DURATION_MS } from "./action-toast";
import { registerActionFeedbackScope } from "./action-feedback-store";

type Feedback = { scopeKey: string; success: (title: string, message: string) => void };
const Context = createContext<Feedback | null>(null);
export function useActionFeedback() { return useContext(Context); }

/** Mounted by the authenticated layout, independently of pages, queue rows and dialogs. */
export function ActionFeedbackProvider({ children, scopeKey }: { children: ReactNode; scopeKey: string }) {
  return <ScopedFeedback key={scopeKey} scopeKey={scopeKey}>{children}</ScopedFeedback>;
}

function ScopedFeedback({ children, scopeKey }: { children: ReactNode; scopeKey: string }) {
  const pathname = usePathname();
  const [toast, setToast] = useState<{ title: string; message: string; pathname: string } | null>(null);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (toast?.pathname !== pathname) setToast(null);
  }
  const success = useCallback((title: string, message: string) => {
    if (title.trim() && message.trim()) setToast({ title, message, pathname: window.location.pathname });
  }, []);
  const feedback = useMemo(() => ({ scopeKey, success }), [scopeKey, success]);
  useEffect(() => registerActionFeedbackScope(scopeKey), [scopeKey]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), SUCCESS_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return <Context.Provider value={feedback}>
    {children}
    {toast && toast.pathname === pathname ? <ActionToast title={toast.title} message={toast.message} tone="success" onDismiss={() => setToast(null)} /> : null}
  </Context.Provider>;
}
