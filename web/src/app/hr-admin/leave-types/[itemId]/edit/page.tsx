import { notFound } from "next/navigation";

import { leaveTypeToFormValue } from "@/app/hr-admin/leave-types/form-values";
import { LeaveTypeForm } from "@/app/hr-admin/leave-types/leave-type-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveType, getHrAdminPolicyOptions } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function HrAdminEditLeaveTypePage({ params }: PageProps) {
  await requireSessionPermission({ permissionKeys: ["leave.policies.manage"], fallbackPath: "/hr-admin/leave-types" });
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminLeaveType(itemId), getHrAdminPolicyOptions()]);
  if (!itemResult.data?.id) notFound();

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro
        appearance="accerio"
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live edit mode" : "Demo edit mode"}
        title="Edit leave type"
        description="Refine leave behavior without touching workflow or payroll code directly."
        actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/leave-types">Back to leave types</a>}
      />
      <LeaveTypeForm initialValue={leaveTypeToFormValue(itemResult.data)} item={itemResult.data} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
