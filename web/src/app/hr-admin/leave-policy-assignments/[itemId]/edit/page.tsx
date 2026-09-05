import Link from "next/link";
import { notFound } from "next/navigation";

import { leavePolicyAssignmentToFormValue } from "@/app/hr-admin/leave-policy-assignments/form-values";
import { LeavePolicyAssignmentForm } from "@/app/hr-admin/leave-policy-assignments/leave-policy-assignment-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeavePolicyAssignments, getHrAdminPolicyOptions } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditLeavePolicyAssignmentPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemsResult, optionsResult] = await Promise.all([getHrAdminLeavePolicyAssignments(), getHrAdminPolicyOptions()]);
  const item = itemsResult.data.find((entry) => entry.id === itemId);
  if (!item) notFound();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemsResult.state === "live" && optionsResult.state === "live" ? "Live edit mode" : "Demo edit mode"}
        title="Edit leave policy assignment."
        description="Fine-tune which scope receives this policy and in what priority order."
        actions={<Link className="button button--secondary" href="/hr-admin/leave-policy-assignments">Back to leave assignments</Link>}
        pills={["Scope refinement", "Priority tuning", "Controlled rollout"]}
      />
      <LeavePolicyAssignmentForm initialValue={leavePolicyAssignmentToFormValue(item)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
