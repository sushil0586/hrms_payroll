import Link from "next/link";
import type { ReactNode } from "react";

/** Presentation only. Callers supply authorized, already formatted employee data. */
export function WorkspaceIdentity({ name, initials, children }: { name: string; initials: string; children: ReactNode }) {
  return <div className="ess-identity"><span className="ess-identity__avatar" aria-hidden="true">{initials || "—"}</span><div><strong>{name}</strong>{children}</div></div>;
}

export function WorkspaceInformation({ fields }: { fields: Array<[string, string | null | undefined]> }) {
  return <dl className="ess-fields">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not recorded"}</dd></div>)}</dl>;
}

export function WorkspaceQuickActions({ actions }: { actions: Array<{ href: string; label: string; detail: string }> }) {
  return <ul className="ess-service-list">{actions.map((action) => <li key={action.href}><Link prefetch={false} href={action.href}>{action.label}<span aria-hidden="true"> →</span></Link><p>{action.detail}</p></li>)}</ul>;
}
