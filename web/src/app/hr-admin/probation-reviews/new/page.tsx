import {lifecycleReturnHref} from "@/lib/ui/lifecycle-return";


import { createEmptyProbationReviewValue } from "@/app/hr-admin/probation-reviews/form-values";
import { ProbationReviewForm } from "@/app/hr-admin/probation-reviews/probation-review-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import { getHrAdminLifecycleOptions } from "@/lib/api";

export default async function HrAdminNewProbationReviewPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams??{};const returnHref=lifecycleReturnHref(query.returnTo,"/hr-admin/probation-reviews");
  const optionsResult = await getHrAdminLifecycleOptions().catch(()=>null);

  if(optionsResult?.state!=="live")return <LifecycleUnavailable/>;
  return (
    <main className="shell accerio-page lifecycle-phase3">
      <WorkspaceStandardHeader
        title="Create probation review"
        description="Capture review timing, ownership, and extension details in the same language used across lifecycle queues."
        actions={<a data-navigation-mode="document" className="button button--secondary" href={returnHref}>{returnHref.startsWith("/hr-admin/reports/")?"Back to report":returnHref.startsWith("/hr-admin/lifecycle")?"Back to lifecycle":"Back to probation reviews"}</a>}
      />
      <ProbationReviewForm cancelHref={returnHref} successHref={returnHref} initialValue={createEmptyProbationReviewValue(optionsResult.data.probation_decisions[0]?.value)} mode="create" options={optionsResult.data} />
    </main>
  );
}
