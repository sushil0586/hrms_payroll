"use client";

import { hrAdminNavigation } from "@/lib/ui/navigation";
import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import type { WorkspaceNavItem } from "@/components/shell/workspace-chrome";

type Props = {
  children: React.ReactNode;
  navItems?: WorkspaceNavItem[];
  userLabel?: string | null;
};

export function HrAdminChrome({ children, navItems, userLabel }: Props) {
  return (
    <WorkspaceChrome
      footerDescription="Governance, policy execution, and lifecycle control in one sober workspace."
      navItems={navItems ?? hrAdminNavigation.flatMap((group) => group.items)}
      productLabel="Nexora"
      quickLinks={[
        { href: "/ess", label: "ESS" },
        { href: "/mss/approvals", label: "MSS" },
      ]}
      roleLabel="HR Admin"
      searchHint="Search people, policy, workflow, and review actions"
      userLabel={userLabel}
      workspaceLabel="People operations"
      workspaceTone="admin"
    >
      {children}
    </WorkspaceChrome>
  );
}
