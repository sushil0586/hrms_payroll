import {lifecycleReturnHref} from "@/lib/ui/lifecycle-return";

import { createEmptyOnboardingValue } from "@/app/hr-admin/onboardings/form-values";
import { OnboardingForm } from "@/app/hr-admin/onboardings/onboarding-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import { getHrAdminLifecycleOptions, getHrAdminWorkflowTemplates } from "@/lib/api";

export default async function HrAdminNewOnboardingPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams??{};const returnHref=lifecycleReturnHref(query.returnTo,"/hr-admin/onboardings");
  const [optionsResult, templatesResult] = await Promise.all([getHrAdminLifecycleOptions().catch(()=>null), getHrAdminWorkflowTemplates().catch(()=>null)]);
  if(optionsResult?.state!=="live" || templatesResult?.state!=="live")return <LifecycleUnavailable/>;
  return (
    <main className="shell accerio-page lifecycle-phase3">
      <WorkspaceStandardHeader
        title="Create onboarding"
        description="Start the joiner workflow with shared owners, checklist logic, and queue-ready structure."
        actions={<a data-navigation-mode="document" className="button button--secondary" href={returnHref}>{returnHref.startsWith("/hr-admin/reports/")?"Back to report":returnHref.startsWith("/hr-admin/lifecycle")?"Back to lifecycle":"Back to onboardings"}</a>}
      />
      <OnboardingForm cancelHref={returnHref} successHref={returnHref}
        initialValue={createEmptyOnboardingValue(optionsResult.data.onboarding_statuses[0]?.value)}
        lifecycleTemplates={templatesResult.data}
        mode="create"
        options={optionsResult.data}
      />
    </main>
  );
}
