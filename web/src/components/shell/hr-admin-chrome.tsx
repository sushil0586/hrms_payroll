"use client";

import { hrAdminNavigation } from "@/lib/ui/navigation";
import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import type { WorkspaceNavGroup, WorkspaceNavItem } from "@/components/shell/workspace-chrome";

type Props = {
  children: React.ReactNode;
  navGroups?: WorkspaceNavGroup[];
  navItems?: WorkspaceNavItem[];
  quickLinks?: Array<{ href: string; label: string }>;
  userLabel?: string | null;
};

export function HrAdminChrome({ children, navGroups, navItems, quickLinks, userLabel }: Props) {
  return (
    <WorkspaceChrome
      footerDescription="People operations, payroll readiness, compliance evidence, and workforce workflows in one focused control center."
      navItems={navItems ?? hrAdminNavigation.flatMap((group) => group.items)}
      navGroups={navGroups}
      footerTitle="HRMS Workspace"
      productLabel="HRMS"
      quickLinks={quickLinks ?? [
        { href: "/ess", label: "ESS" },
        { href: "/mss/approvals", label: "MSS" },
      ]}
      roleLabel="HR Admin"
      searchHint="Search employees, payroll, leave, attendance, reports..."
      userLabel={userLabel}
      workspaceLabel="People Operations"
      workspaceTone="hr"
    >
      {children}
    </WorkspaceChrome>
  );
}
