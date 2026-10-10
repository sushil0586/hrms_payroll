import Link from "next/link";

import { EmployeeShiftAssignmentForm } from "@/app/hr-admin/employee-shift-assignments/employee-shift-assignment-form";
import { createEmptyEmployeeShiftAssignmentValue } from "@/app/hr-admin/employee-shift-assignments/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyWorkbenchOptions } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

export default async function HrAdminNewEmployeeShiftAssignmentPage() {
  await requireSessionPermission({ permissionKeys: ["attendance.policies.manage"], fallbackPath: "/hr-admin/employee-shift-assignments" });
  const optionsResult = await getHrAdminPolicyWorkbenchOptions({ include: ["shifts"] });

  return (
    <main className="shell shell--time-leave">
      <PageIntro
        eyebrow="Shift assignment setup"
        title="Create shift assignment"
        description="Assign an operational shift to an employee over a governed date window."
        actions={<Link className="button button--secondary" href="/hr-admin/employee-shift-assignments">Back to shift assignments</Link>}
      />
      <EmployeeShiftAssignmentForm initialValue={createEmptyEmployeeShiftAssignmentValue()} mode="create" options={optionsResult.data} />
    </main>
  );
}
