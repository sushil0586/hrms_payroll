import {lifecycleReturnHref} from "@/lib/ui/lifecycle-return";


import { exitToFormValue } from "@/app/hr-admin/exits/form-values";
import { ExitForm } from "@/app/hr-admin/exits/exit-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import { getHrAdminLifecycleOptions, getHrAdminExit, getHrAdminWorkflowTemplates } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }>;searchParams?:Promise<Record<string,string|string[]|undefined>> };

export default async function HrAdminEditExitPage({ params,searchParams }: PageProps) {
  const query=await searchParams??{};const returnHref=lifecycleReturnHref(query.returnTo,"/hr-admin/exits");
  const { itemId } = await params;
  const [itemResult, optionsResult, templatesResult] = await Promise.all([getHrAdminExit(itemId).catch(()=>null), getHrAdminLifecycleOptions().catch(()=>null),getHrAdminWorkflowTemplates().catch(()=>null)]);

  if(templatesResult?.state!=="live" || optionsResult?.state!=="live" || itemResult?.state!=="live" || itemResult.data.id!==itemId)return <LifecycleUnavailable/>;
  return (
    <main className="shell accerio-page lifecycle-phase3">
      <WorkspaceStandardHeader
        title="Edit exit"
        description="Review the notice timeline, clearance and employee-state consequences before saving."
        actions={<a data-navigation-mode="document" className="button button--secondary" href={returnHref}>{returnHref.startsWith("/hr-admin/reports/")?"Back to report":returnHref.startsWith("/hr-admin/lifecycle")?"Back to lifecycle":"Back to exits"}</a>}
      />
      <ExitForm lifecycleTemplates={templatesResult.data} cancelHref={returnHref} successHref={returnHref} initialValue={exitToFormValue(itemResult.data)} mode="edit" options={optionsResult.data} itemId={itemId} />
    </main>
  );
}
