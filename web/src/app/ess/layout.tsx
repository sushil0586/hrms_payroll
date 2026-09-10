import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function EssLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireWorkspaceAccess({ workspace: "ess" });
  const userLabel =
    sessionUser?.display_name || sessionUser?.first_name || sessionUser?.username || null;

  return (
    <WorkspaceChrome
      footerDescription="Personal requests, attendance, and balances with a softer self-service flow."
      navItems={[
        { href: "/ess", label: "Overview", shortLabel: "OV", blurb: "Self service" },
        { href: "/ess/payslips", label: "Payslips", shortLabel: "PS", blurb: "Payroll files" },
        { href: "/ess/statutory-declarations", label: "Tax Declarations", shortLabel: "TD", blurb: "Proof status" },
        { href: "/ess/notifications", label: "Notifications", shortLabel: "NT", blurb: "Alerts and updates" },
        { href: "/ess/documents", label: "Documents", shortLabel: "DO", blurb: "Required uploads" },
        { href: "/mss/approvals", label: "Approvals", shortLabel: "AP", blurb: "Manager queue" },
      ]}
      productLabel="Nexora"
      quickLinks={[
        { href: "/hr-admin", label: "HR Admin" },
        { href: "/mss/approvals", label: "MSS" },
        { href: "/ess/payslips", label: "Payslips" },
        { href: "/ess/statutory-declarations", label: "Tax" },
        { href: "/ess/notifications", label: "Inbox" },
      ]}
      roleLabel="Employee"
      searchHint="Search leave, attendance, and request history"
      userLabel={userLabel}
      workspaceLabel="Self service"
      workspaceTone="employee"
    >
      {children}
    </WorkspaceChrome>
  );
}
