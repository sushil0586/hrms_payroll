import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeavePolicies } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { LeavePolicyList } from "./leave-policy-list";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

export default async function HrAdminLeavePoliciesPage() {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["leave.view", "leave.policies.manage"], fallbackPath: "/hr-admin" });
  const canManagePolicies = sessionHasPermission(sessionUser, "leave.policies.manage");
  const result = await getHrAdminLeavePolicies();
  const activeCount = result.data.filter((item) => item.status === "active").length;

  return (
    <main className="shell shell--time-leave">
      <PageIntro
        eyebrow={result.state === "live" ? "Live leave policy mode" : "Demo leave policy mode"}
        title="Leave policies"
        description="Define the entitlement, accrual, notice, and eligibility behavior that the system should actually apply beyond simple leave labels."
        actions={
          <>
            {canManagePolicies ? (
              <Link className="button button--primary" href="/hr-admin/leave-policies/new">
                Create leave policy
              </Link>
            ) : null}
            <Link className="button button--secondary" href="/hr-admin/policies">
              Back to policies
            </Link>
          </>
        }
        pills={["Entitlement and accrual rules", "Eligibility and notice control", "Assignment-ready policy objects"]}
      />

      <TimeLeaveOperationsStrip
        current="policies"
        title="Leave policy configuration"
        description="Configure entitlement, accrual, eligibility, evidence, and approval behavior before assigning policies to employee scopes."
        primaryMetricLabel="policies"
        primaryMetricValue={result.data.length}
        secondaryMetricLabel="active"
        secondaryMetricValue={activeCount}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Policies" value={result.data.length} trend="Configured rules" />
          <MetricTile label="Active policies" value={activeCount} trend="Currently usable" />
          <MetricTile label="Draft or inactive" value={result.data.length - activeCount} trend="Needs review" />
        </div>
      </section>

      <LeavePolicyList canManagePolicies={canManagePolicies} policies={result.data} />
    </main>
  );
}
