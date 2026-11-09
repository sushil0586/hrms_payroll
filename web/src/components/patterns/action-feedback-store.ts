/** Advisory presentation receipts only; never authorization or business data. */
export type ActionReceipt = { pathname: string; id: string; message: string; title: string; createdAt: number; scope?: string };
export const ACTION_RECEIPT_KEY = "accerio.action-feedback";
export const ACTION_RECEIPT_EVENT = "accerio:action-feedback";
let activeScope: { key: string } | null = null;

export function registerActionFeedbackScope(key: string) {
  const owner = { key };
  activeScope = owner;
  return () => { if (activeScope === owner) activeScope = null; };
}

export function validActionReceipt(value: unknown, pathname: string, scope?: string): value is ActionReceipt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ActionReceipt>;
  return candidate.pathname === pathname && typeof candidate.id === "string" && Boolean(candidate.id.trim())
    && typeof candidate.title === "string" && Boolean(candidate.title.trim())
    && typeof candidate.message === "string" && Boolean(candidate.message.trim())
    && typeof candidate.createdAt === "number" && Number.isFinite(candidate.createdAt)
    && Date.now() - candidate.createdAt >= 0 && Date.now() - candidate.createdAt < 120_000
    && (!scope || candidate.scope === scope);
}

export function rememberActionSuccess(path: string, id: string, title: string, message: string) {
  if (typeof window === "undefined") return;
  let url: URL;
  try { url = new URL(path, window.location.origin); } catch { return; }
  if (url.origin !== window.location.origin || !id.trim()) return;
  const receipt: ActionReceipt = { pathname: url.pathname, id, title, message, createdAt: Date.now(), ...(activeScope ? { scope: activeScope.key } : {}) };
  try { sessionStorage.setItem(ACTION_RECEIPT_KEY, JSON.stringify(receipt)); } catch { /* Live delivery still works when storage is restricted. */ }
  window.dispatchEvent(new CustomEvent<ActionReceipt>(ACTION_RECEIPT_EVENT, { detail: receipt }));
}

export function consumeActionReceipt(receipt: ActionReceipt) {
  try {
    const current = JSON.parse(sessionStorage.getItem(ACTION_RECEIPT_KEY) || "null") as ActionReceipt | null;
    if (current?.pathname === receipt.pathname && current.id === receipt.id && current.createdAt === receipt.createdAt && current.scope === receipt.scope) sessionStorage.removeItem(ACTION_RECEIPT_KEY);
  } catch { /* Storage is optional presentation state. */ }
}
