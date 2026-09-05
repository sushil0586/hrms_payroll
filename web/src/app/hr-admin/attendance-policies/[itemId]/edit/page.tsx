import Link from "next/link";
import { notFound } from "next/navigation";

import { AttendancePolicyForm } from "@/app/hr-admin/attendance-policies/attendance-policy-form";
import { attendancePolicyToFormValue } from "@/app/hr-admin/attendance-policies/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendancePolicy, getHrAdminPolicyOptions } from "@/lib/api";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function HrAdminEditAttendancePolicyPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminAttendancePolicy(itemId), getHrAdminPolicyOptions()]);
  if (!itemResult.data?.id) notFound();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live edit mode" : "Demo edit mode"}
        title="Edit attendance policy"
        description="Adjust attendance calculation behavior without changing the underlying runtime model."
        actions={<Link className="button button--secondary" href="/hr-admin/attendance-policies">Back to attendance policies</Link>}
        pills={["Operational refinement", "Threshold tuning", "Assignment-linked policy"]}
      />
      <AttendancePolicyForm initialValue={attendancePolicyToFormValue(itemResult.data)} item={itemResult.data} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
