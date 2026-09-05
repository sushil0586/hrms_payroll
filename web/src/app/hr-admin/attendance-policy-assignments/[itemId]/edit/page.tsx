import Link from "next/link";
import { notFound } from "next/navigation";

import { AttendancePolicyAssignmentForm } from "@/app/hr-admin/attendance-policy-assignments/attendance-policy-assignment-form";
import { attendancePolicyAssignmentToFormValue } from "@/app/hr-admin/attendance-policy-assignments/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendancePolicyAssignments, getHrAdminPolicyOptions } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditAttendancePolicyAssignmentPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemsResult, optionsResult] = await Promise.all([getHrAdminAttendancePolicyAssignments(), getHrAdminPolicyOptions()]);
  const item = itemsResult.data.find((entry) => entry.id === itemId);
  if (!item) notFound();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemsResult.state === "live" && optionsResult.state === "live" ? "Live edit mode" : "Demo edit mode"}
        title="Edit attendance policy assignment."
        description="Fine-tune which organizational slices should inherit this attendance behavior and in what order."
        actions={<Link className="button button--secondary" href="/hr-admin/attendance-policy-assignments">Back to attendance assignments</Link>}
        pills={["Scope refinement", "Priority tuning", "Controlled rollout"]}
      />
      <AttendancePolicyAssignmentForm initialValue={attendancePolicyAssignmentToFormValue(item)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
