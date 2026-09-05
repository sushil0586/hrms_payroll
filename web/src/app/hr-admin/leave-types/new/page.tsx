import Link from "next/link";

import { createEmptyLeaveTypeValue } from "@/app/hr-admin/leave-types/form-values";
import { LeaveTypeForm } from "@/app/hr-admin/leave-types/leave-type-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyOptions } from "@/lib/api";

export default async function HrAdminNewLeaveTypePage() {
  const optionsResult = await getHrAdminPolicyOptions();
  const defaultCategory = optionsResult.data.leave_categories[0]?.value || "paid";
  const defaultUnit = optionsResult.data.leave_units[0]?.value || "day";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live create mode" : "Demo create mode"}
        title="Create leave type."
        description="Define the leave bucket first, then attach policies, accrual rules, eligibility, and workflow behavior around it."
        actions={<Link className="button button--secondary" href="/hr-admin/leave-types">Back to leave types</Link>}
        pills={["Behavior building block", "Category and unit setup", "Policy-ready foundation"]}
      />
      <LeaveTypeForm initialValue={createEmptyLeaveTypeValue(defaultCategory, defaultUnit)} mode="create" options={optionsResult.data} />
    </main>
  );
}
