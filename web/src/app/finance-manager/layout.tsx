import { WorkspaceChrome, type WorkspaceNavGroup } from "@/components/shell/workspace-chrome";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const financeNavigation: WorkspaceNavGroup[] = [
  {
    title: "Finance Control",
    items: [
      { href: "/finance-manager", label: "Control Center", shortLabel: "CC", blurb: "Close, payout, and compliance" },
      { href: "/finance-manager#payments", label: "Payments", shortLabel: "PY", blurb: "Bank advice and delivery" },
      { href: "/finance-manager#compliance", label: "Compliance", shortLabel: "CO", blurb: "Statutory filing posture" },
      { href: "/finance-manager#audit", label: "Audit", shortLabel: "AU", blurb: "Evidence and exports" },
    ],
  },
];

export default async function FinanceManagerLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireWorkspaceAccess({ roleCodes: ["payroll-finance-manager"] });
  const userLabel =
    sessionUser?.display_name || sessionUser?.first_name || sessionUser?.username || null;

  return (
    <WorkspaceChrome
      footerDescription="Payroll payout, statutory liabilities, provider evidence, and finance-close control in one workspace."
      navGroups={financeNavigation}
      navItems={financeNavigation.flatMap((group) => group.items)}
      productLabel="Nexora"
      quickLinks={[
        { href: "/finance-manager", label: "Finance" },
        { href: "/login", label: "Switch user" },
      ]}
      roleLabel="Payroll Finance"
      searchHint="Search handoffs, bank advice, statutory filings, and audit evidence"
      userLabel={userLabel}
      workspaceLabel="Finance operations"
      workspaceTone="manager"
    >
      {children}
    </WorkspaceChrome>
  );
}
