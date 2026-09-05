import Link from "next/link";

import { createEmptyLeavePolicyAssignmentValue } from "@/app/hr-admin/leave-policy-assignments/form-values";
import { LeavePolicyAssignmentForm } from "@/app/hr-admin/leave-policy-assignments/leave-policy-assignment-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyOptions } from "@/lib/api";

export default async function HrAdminNewLeavePolicyAssignmentPage() {
  const optionsResult = await getHrAdminPolicyOptions();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live create mode" : "Demo create mode"}
        title="Create leave policy assignment."
        description="Use assignment priority and scope to determine which leave policy wins when more than one rule could apply."
        actions={<Link className="button button--secondary" href="/hr-admin/leave-policy-assignments">Back to leave assignments</Link>}
        pills={["Priority-based resolution", "Structure-aware targeting", "Employee override capable"]}
      />
      <LeavePolicyAssignmentForm initialValue={createEmptyLeavePolicyAssignmentValue()} mode="create" options={optionsResult.data} />
    </main>
  );
}
