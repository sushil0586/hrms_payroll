import Link from "next/link";

import { AttendancePolicyAssignmentForm } from "@/app/hr-admin/attendance-policy-assignments/attendance-policy-assignment-form";
import { createEmptyAttendancePolicyAssignmentValue } from "@/app/hr-admin/attendance-policy-assignments/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyOptions } from "@/lib/api";

export default async function HrAdminNewAttendancePolicyAssignmentPage() {
  const optionsResult = await getHrAdminPolicyOptions();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live create mode" : "Demo create mode"}
        title="Create attendance policy assignment."
        description="Use assignment priority and scope to control where the attendance policy actually applies."
        actions={<Link className="button button--secondary" href="/hr-admin/attendance-policy-assignments">Back to attendance assignments</Link>}
        pills={["Priority-based resolution", "Scoped rollout", "Employee override capable"]}
      />
      <AttendancePolicyAssignmentForm initialValue={createEmptyAttendancePolicyAssignmentValue()} mode="create" options={optionsResult.data} />
    </main>
  );
}
