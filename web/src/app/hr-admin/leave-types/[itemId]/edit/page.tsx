import Link from "next/link";
import { notFound } from "next/navigation";

import { leaveTypeToFormValue } from "@/app/hr-admin/leave-types/form-values";
import { LeaveTypeForm } from "@/app/hr-admin/leave-types/leave-type-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveType, getHrAdminPolicyOptions } from "@/lib/api";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function HrAdminEditLeaveTypePage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminLeaveType(itemId), getHrAdminPolicyOptions()]);
  if (!itemResult.data?.id) notFound();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live edit mode" : "Demo edit mode"}
        title="Edit leave type."
        description="Refine leave behavior without touching workflow or payroll code directly."
        actions={<Link className="button button--secondary" href="/hr-admin/leave-types">Back to leave types</Link>}
        pills={["Behavior refinement", "Approval and balance tuning", "Policy-linked building block"]}
      />
      <LeaveTypeForm initialValue={leaveTypeToFormValue(itemResult.data)} item={itemResult.data} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
