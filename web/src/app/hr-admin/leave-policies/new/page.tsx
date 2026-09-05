import Link from "next/link";

import { createEmptyLeavePolicyValue } from "@/app/hr-admin/leave-policies/form-values";
import { LeavePolicyForm } from "@/app/hr-admin/leave-policies/leave-policy-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyOptions } from "@/lib/api";

export default async function HrAdminNewLeavePolicyPage() {
  const optionsResult = await getHrAdminPolicyOptions();
  const defaultStatus = optionsResult.data.leave_policy_statuses[0]?.value || "draft";
  const defaultAccrual = optionsResult.data.accrual_frequencies[0]?.value || "none";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live create mode" : "Demo create mode"}
        title="Create leave policy"
        description="Define leave behavior that later assignments will apply to branches, departments, grades, or employees."
        actions={<Link className="button button--secondary" href="/hr-admin/leave-policies">Back to leave policies</Link>}
        pills={["Entitlement logic", "Eligibility controls", "Assignment-ready behavior"]}
      />
      <LeavePolicyForm initialValue={createEmptyLeavePolicyValue(defaultStatus, defaultAccrual)} mode="create" options={optionsResult.data} />
    </main>
  );
}
