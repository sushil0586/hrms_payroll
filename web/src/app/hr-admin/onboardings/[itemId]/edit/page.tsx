import {lifecycleReturnHref} from "@/lib/ui/lifecycle-return";

import { onboardingToFormValue } from "@/app/hr-admin/onboardings/form-values";
import { OnboardingForm } from "@/app/hr-admin/onboardings/onboarding-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import { getHrAdminLifecycleOptions, getHrAdminOnboarding, getHrAdminWorkflowTemplates } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }>;searchParams?:Promise<Record<string,string|string[]|undefined>> };
export default async function HrAdminEditOnboardingPage({ params,searchParams }: PageProps) {
  const query=await searchParams??{};const returnHref=lifecycleReturnHref(query.returnTo,"/hr-admin/onboardings");
  const { itemId } = await params;
  const [itemResult, optionsResult, templatesResult] = await Promise.all([
    getHrAdminOnboarding(itemId).catch(()=>null),
    getHrAdminLifecycleOptions().catch(()=>null),
    getHrAdminWorkflowTemplates().catch(()=>null),
  ]);
  if(optionsResult?.state!=="live" || templatesResult?.state!=="live" || itemResult?.state!=="live" || itemResult.data.id!==itemId)return <LifecycleUnavailable/>;
  return (
    <main className="shell accerio-page lifecycle-phase3">
      <WorkspaceStandardHeader
        title="Edit onboarding"
        description="Refine timing, checklist context, and workflow routing without losing queue alignment."
        actions={<a data-navigation-mode="document" className="button button--secondary" href={returnHref}>{returnHref.startsWith("/hr-admin/reports/")?"Back to report":returnHref.startsWith("/hr-admin/lifecycle")?"Back to lifecycle":"Back to onboardings"}</a>}
      />
      <OnboardingForm cancelHref={returnHref} successHref={returnHref}
        initialValue={onboardingToFormValue(itemResult.data)}
        item={itemResult.data}
        itemId={itemId}
        lifecycleTemplates={templatesResult.data}
        mode="edit"
        options={optionsResult.data}
      />
    </main>
  );
}
