import { WorkspaceChrome, type WorkspaceNavGroup } from "@/components/shell/workspace-chrome";
import { getWorkspaceMenuSource } from "@/lib/ui/menu-catalog";
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
  const menuSource = await getWorkspaceMenuSource({
    workspace: "finance-manager",
    sessionUser,
    fallbackGroups: financeNavigation,
    fallbackQuickLinks: [
      { href: "/finance-manager", label: "Finance" },
      { href: "/login", label: "Switch user" },
    ],
  });

  return (
    <WorkspaceChrome
      footerDescription="Payroll payout, statutory liabilities, provider evidence, and finance-close control in one workspace."
      navGroups={menuSource.navGroups}
      navItems={menuSource.navItems}
      productLabel="Nexora"
      quickLinks={menuSource.quickLinks}
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
