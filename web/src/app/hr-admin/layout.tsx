import { HrAdminChrome } from "@/components/shell/hr-admin-chrome";
import type { WorkspaceNavGroup } from "@/components/shell/workspace-chrome";
import { getHrAdminSaasCommercialControl } from "@/lib/api";
import { getWorkspaceMenuSource } from "@/lib/ui/menu-catalog";
import { hrAdminNavigation } from "@/lib/ui/navigation";
import { requireSessionPermission } from "@/lib/workspace-access";

const PAYROLL_CORE_NAV_PATHS = new Set([
  "/hr-admin/payroll-readiness",
  "/hr-admin/payroll-statutory",
]);

const PAYROLL_PROVIDER_NAV_PATHS = new Set([
  "/hr-admin/payroll-providers",
]);

function disabledReasonForScope(scope: {
  allowed: boolean;
  blocking_reasons: string[];
  exceeded_usage_limits: string[];
  missing_entitlements: string[];
}) {
  if (scope.allowed) {
    return null;
  }
  if (scope.missing_entitlements.length) {
    return `Plan missing ${scope.missing_entitlements.join(", ")}`;
  }
  if (scope.exceeded_usage_limits.length) {
    return `Limit exceeded: ${scope.exceeded_usage_limits.join(", ")}`;
  }
  if (scope.blocking_reasons.length) {
    return scope.blocking_reasons.join(", ");
  }
  return "Unavailable on current plan";
}

async function getCommercialAwareHrAdminNavigation(
  sessionUser: Awaited<ReturnType<typeof requireSessionPermission>>,
  baseGroups: WorkspaceNavGroup[],
): Promise<WorkspaceNavGroup[]> {
  try {
    const result = await getHrAdminSaasCommercialControl();
    const scopes = new Map(result.data.enforcement.scopes.map((scope) => [scope.scope_ref, scope]));
    const payrollCoreReason = disabledReasonForScope(scopes.get("payroll_core") ?? {
      allowed: true,
      blocking_reasons: [],
      exceeded_usage_limits: [],
      missing_entitlements: [],
    });
    const payrollProviderReason = disabledReasonForScope(scopes.get("payroll_provider_integrations") ?? {
      allowed: true,
      blocking_reasons: [],
      exceeded_usage_limits: [],
      missing_entitlements: [],
    });

    return baseGroups
      .map((group) => ({
        ...group,
        items: group.items.map((item) => {
        const disabledReason =
          PAYROLL_PROVIDER_NAV_PATHS.has(item.href)
            ? payrollProviderReason
            : PAYROLL_CORE_NAV_PATHS.has(item.href)
              ? payrollCoreReason
              : null;
        return disabledReason ? { ...item, disabled: true, disabledReason } : item;
      }),
    }))
      .filter((group) => group.items.length > 0);
  } catch {
    return baseGroups;
  }
}

export default async function HrAdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireSessionPermission({
    permissionKeys: [
      "employees.view",
      "employees.create",
      "employees.edit",
      "employees.import",
      "employees.access.manage",
      "organization.view",
      "documents.view",
      "leave.view",
      "attendance.view",
      "lifecycle.view",
      "payroll.inputs.view",
      "payroll.review",
      "payroll.outputs.view",
      "finance.handoff.view",
      "finance.handoff.create",
      "statutory.setup.view",
      "statutory.declarations.view",
      "statutory.filing.view",
      "reports.catalog.view",
    ],
    fallbackPath: "/",
  });
  const userLabel =
    sessionUser?.display_name || sessionUser?.first_name || sessionUser?.username || null;
  const menuSource = await getWorkspaceMenuSource({
    workspace: "hr-admin",
    sessionUser,
    fallbackGroups: hrAdminNavigation,
    fallbackQuickLinks: [
      { href: "/ess", label: "ESS" },
      { href: "/mss/approvals", label: "MSS" },
    ],
  });
  const navGroups = await getCommercialAwareHrAdminNavigation(sessionUser, menuSource.navGroups);

  return <HrAdminChrome navGroups={navGroups} quickLinks={menuSource.quickLinks} userLabel={userLabel}>{children}</HrAdminChrome>;
}
