
import { createEmptyLeaveTypeValue } from "@/app/hr-admin/leave-types/form-values";
import { LeaveTypeForm } from "@/app/hr-admin/leave-types/leave-type-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyOptions } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

export default async function HrAdminNewLeaveTypePage() {
  await requireSessionPermission({ permissionKeys: ["leave.policies.manage"], fallbackPath: "/hr-admin/leave-types" });
  const optionsResult = await getHrAdminPolicyOptions();
  const defaultCategory = optionsResult.data.leave_categories[0]?.value || "paid";
  const defaultUnit = optionsResult.data.leave_units[0]?.value || "day";

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro
        appearance="accerio"
        eyebrow={optionsResult.state === "live" ? "Live create mode" : "Demo create mode"}
        title="Create leave type"
        description="Define the leave bucket first, then attach policies, accrual rules, eligibility, and workflow behavior around it."
        actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/leave-types">Back to leave types</a>}
      />
      <LeaveTypeForm initialValue={createEmptyLeaveTypeValue(defaultCategory, defaultUnit)} mode="create" options={optionsResult.data} />
    </main>
  );
}
