import Link from "next/link";

import { ShiftForm } from "@/app/hr-admin/shifts/shift-form";
import { createEmptyShiftValue } from "@/app/hr-admin/shifts/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { requireSessionPermission } from "@/lib/workspace-access";

export default async function HrAdminNewShiftPage() {
  await requireSessionPermission({ permissionKeys: ["attendance.policies.manage"], fallbackPath: "/hr-admin/shifts" });
  return (
    <main className="shell">
      <PageIntro
        eyebrow="Attendance operations"
        title="Create shift"
        description="Define a new attendance shift for scheduling and policy mapping."
        actions={<Link className="button button--secondary" href="/hr-admin/shifts">Back to shifts</Link>}
        pills={["Shift timing", "Weekly-off setup", "Policy-ready schedule"]}
      />
      <ShiftForm initialValue={createEmptyShiftValue()} mode="create" />
    </main>
  );
}
