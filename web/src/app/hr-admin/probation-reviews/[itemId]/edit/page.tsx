import {lifecycleReturnHref} from "@/lib/ui/lifecycle-return";


import { probationReviewToFormValue } from "@/app/hr-admin/probation-reviews/form-values";
import { ProbationReviewForm } from "@/app/hr-admin/probation-reviews/probation-review-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import { getHrAdminLifecycleOptions, getHrAdminProbationReview } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }>;searchParams?:Promise<Record<string,string|string[]|undefined>> };

export default async function HrAdminEditProbationReviewPage({ params,searchParams }: PageProps) {
  const query=await searchParams??{};const returnHref=lifecycleReturnHref(query.returnTo,"/hr-admin/probation-reviews");
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminProbationReview(itemId).catch(()=>null), getHrAdminLifecycleOptions().catch(()=>null)]);

  if(optionsResult?.state!=="live" || itemResult?.state!=="live" || itemResult.data.id!==itemId)return <LifecycleUnavailable/>;
  return (
    <main className="shell accerio-page lifecycle-phase3">
      <WorkspaceStandardHeader
        title="Edit probation review"
        description="Adjust the decision, reviewer assignment, and extension timeline while staying aligned with queue safety checks."
        actions={<a data-navigation-mode="document" className="button button--secondary" href={returnHref}>{returnHref.startsWith("/hr-admin/reports/")?"Back to report":returnHref.startsWith("/hr-admin/lifecycle")?"Back to lifecycle":"Back to probation reviews"}</a>}
      />
      <ProbationReviewForm cancelHref={returnHref} successHref={returnHref} initialValue={probationReviewToFormValue(itemResult.data)} mode="edit" options={optionsResult.data} itemId={itemId} />
    </main>
  );
}
