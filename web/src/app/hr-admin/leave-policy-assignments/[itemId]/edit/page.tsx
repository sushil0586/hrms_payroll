import Link from "next/link";
import { notFound } from "next/navigation";

import { leavePolicyAssignmentToFormValue } from "@/app/hr-admin/leave-policy-assignments/form-values";
import { LeavePolicyAssignmentForm } from "@/app/hr-admin/leave-policy-assignments/leave-policy-assignment-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeavePolicyAssignment, getHrAdminPolicyWorkbenchOptions } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditLeavePolicyAssignmentPage({ params }: PageProps) {
  await requireSessionPermission({ permissionKeys: ["leave.policies.manage"], fallbackPath: "/hr-admin/leave-policy-assignments" });
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([
    getHrAdminLeavePolicyAssignment(itemId),
    getHrAdminPolicyWorkbenchOptions({
      include: ["leave_policies", "legal_entities", "branches", "departments", "grades", "employment_types"],
    }),
  ]);
  if (!itemResult.data) notFound();

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live edit mode" : "Demo edit mode"}
        title="Edit leave assignment"
        description="Fine-tune which scope receives this policy and in what priority order."
        actions={<Link className="button button--secondary" href="/hr-admin/leave-policy-assignments">Back to leave assignments</Link>}
        pills={["Scope refinement", "Priority tuning", "Controlled rollout"]}
      />
      <LeavePolicyAssignmentForm
        initialValue={leavePolicyAssignmentToFormValue(itemResult.data)}
        initialEmployeeLabel={itemResult.data.employee}
        itemId={itemId}
        mode="edit"
        options={optionsResult.data}
      />
    </main>
  );
}
