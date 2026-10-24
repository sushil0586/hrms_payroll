import {lifecycleReturnHref} from "@/lib/ui/lifecycle-return";


import { createEmptyExitValue } from "@/app/hr-admin/exits/form-values";
import { ExitForm } from "@/app/hr-admin/exits/exit-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import { getHrAdminLifecycleOptions, getHrAdminWorkflowTemplates } from "@/lib/api";

export default async function HrAdminNewExitPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams??{};const returnHref=lifecycleReturnHref(query.returnTo,"/hr-admin/exits");
  const [optionsResult,templatesResult]=await Promise.all([getHrAdminLifecycleOptions().catch(()=>null),getHrAdminWorkflowTemplates().catch(()=>null)]);

  if(templatesResult?.state!=="live" || optionsResult?.state!=="live")return <LifecycleUnavailable/>;
  return (
    <main className="shell accerio-page lifecycle-phase3">
      <WorkspaceStandardHeader
        title="Create exit"
        description="Record resignation, notice dates and clearance before completing an exit."
        actions={<a data-navigation-mode="document" className="button button--secondary" href={returnHref}>{returnHref.startsWith("/hr-admin/reports/")?"Back to report":returnHref.startsWith("/hr-admin/lifecycle")?"Back to lifecycle":"Back to exits"}</a>}
      />
      <ExitForm lifecycleTemplates={templatesResult.data} cancelHref={returnHref} successHref={returnHref} initialValue={createEmptyExitValue(optionsResult.data.exit_statuses[0]?.value)} mode="create" options={optionsResult.data} />
    </main>
  );
}
