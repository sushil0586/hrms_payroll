"use client";

import { hrAdminNavigation, hrAdminSearchDestinations } from "@/lib/ui/navigation";
import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import type { WorkspaceNavGroup, WorkspaceNavItem } from "@/components/shell/workspace-chrome";

type Props = {
  children: React.ReactNode;
  navGroups?: WorkspaceNavGroup[];
  navItems?: WorkspaceNavItem[];
  quickLinks?: Array<{ href: string; label: string }>;
  userLabel?: string | null;
};

function groupedHrAdminNavigation(navGroups?: WorkspaceNavGroup[], navItems?: WorkspaceNavItem[]) {
  const sourceItems = navGroups?.length ? navGroups.flatMap((group) => group.items) : navItems ?? hrAdminNavigation.flatMap((group) => group.items);
  const itemsByHref = new Map(sourceItems.map((item) => [item.href, item]));
  const usedHrefs = new Set<string>();
  const grouped = hrAdminNavigation
    .map((group) => {
      const items = group.items
        .map((item) => itemsByHref.get(item.href))
        .filter((item): item is WorkspaceNavItem => Boolean(item));
      items.forEach((item) => usedHrefs.add(item.href));
      return { title: group.title, items };
    })
    .filter((group) => group.items.length > 0);
  const overflowItems = sourceItems.filter((item) => !usedHrefs.has(item.href));
  return overflowItems.length ? [...grouped, { title: "Other", items: overflowItems }] : grouped;
}

export function HrAdminChrome({ children, navGroups, navItems, quickLinks, userLabel }: Props) {
  const groupedNavGroups = groupedHrAdminNavigation(navGroups, navItems);

  return (
    <WorkspaceChrome
      footerDescription="People operations, payroll readiness, compliance evidence, and workforce workflows in one focused control center."
      navItems={groupedNavGroups.flatMap((group) => group.items)}
      navGroups={groupedNavGroups}
      footerTitle="HRMS Workspace"
      productLabel="HRMS"
      quickLinks={quickLinks ?? [
        { href: "/ess", label: "ESS" },
        { href: "/mss/approvals", label: "MSS" },
      ]}
      roleLabel="HR Admin"
      searchDestinations={hrAdminSearchDestinations}
      searchHint="Search employees, payroll, leave, attendance, reports..."
      userLabel={userLabel}
      workspaceLabel="People Operations"
      workspaceTone="hr"
    >
      {children}
    </WorkspaceChrome>
  );
}
