import Link from "next/link";
import { notFound } from "next/navigation";

import { leavePolicyToFormValue } from "@/app/hr-admin/leave-policies/form-values";
import { LeavePolicyForm } from "@/app/hr-admin/leave-policies/leave-policy-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeavePolicy, getHrAdminPolicyOptions } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditLeavePolicyPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminLeavePolicy(itemId), getHrAdminPolicyOptions()]);
  if (!itemResult.data?.id) notFound();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live edit mode" : "Demo edit mode"}
        title="Edit leave policy."
        description="Refine enforceable leave rules without changing application logic in code."
        actions={<Link className="button button--secondary" href="/hr-admin/leave-policies">Back to leave policies</Link>}
        pills={["Rule refinement", "Eligibility tuning", "Assignment-linked policy"]}
      />
      <LeavePolicyForm initialValue={leavePolicyToFormValue(itemResult.data)} item={itemResult.data} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
