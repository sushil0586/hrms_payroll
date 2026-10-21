/** Shared presentation glyphs; labels and access decisions belong to the caller. */
export function WorkspaceIcon({ path }: { path: string }) {
  const shape = path.includes("employee") || path.includes("lifecycle")
    ? <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 20v-2a6 6 0 0 0-3-5" /></>
    : path.includes("attendance") || path.includes("leave") || path.includes("payroll")
      ? <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18M8 15h2M14 15h2" /></>
      : path.includes("report") || path.includes("audit")
        ? <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 16v-4M12 16V7M17 16v-6" /></>
        : path.includes("polic") || path.includes("organization") || path.includes("workflow")
          ? <><path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5" /></>
          : <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{shape}</svg>;
}
