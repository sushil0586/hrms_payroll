import Link from "next/link";

import { AttendancePolicyForm } from "@/app/hr-admin/attendance-policies/attendance-policy-form";
import { createEmptyAttendancePolicyValue } from "@/app/hr-admin/attendance-policies/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyOptions } from "@/lib/api";

export default async function HrAdminNewAttendancePolicyPage() {
  const optionsResult = await getHrAdminPolicyOptions();
  const defaultStatus = optionsResult.data.attendance_policy_statuses[0]?.value || "draft";
  const defaultUnit = optionsResult.data.attendance_units[0]?.value || "day";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live create mode" : "Demo create mode"}
        title="Create attendance policy"
        description="Define operational attendance treatment here, then assign it to the right scope later."
        actions={<Link className="button button--secondary" href="/hr-admin/attendance-policies">Back to attendance policies</Link>}
        pills={["Threshold rules", "Shift and holiday mapping", "Assignment-ready policy"]}
      />
      <AttendancePolicyForm initialValue={createEmptyAttendancePolicyValue(defaultStatus, defaultUnit)} mode="create" options={optionsResult.data} />
    </main>
  );
}
