import {lifecycleReturnHref} from "@/lib/ui/lifecycle-return";


import { createEmptyMovementValue } from "@/app/hr-admin/movements/form-values";
import { MovementForm } from "@/app/hr-admin/movements/movement-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import { getHrAdminLifecycleOptions } from "@/lib/api";

export default async function HrAdminNewMovementPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams??{};const returnHref=lifecycleReturnHref(query.returnTo,"/hr-admin/movements");
  const optionsResult = await getHrAdminLifecycleOptions().catch(()=>null);

  if(optionsResult?.state!=="live")return <LifecycleUnavailable/>;
  return (
    <main className="shell accerio-page lifecycle-phase3">
      <WorkspaceStandardHeader
        title="Create movement"
        description="Plan the employee, effective date and destination structure before applying a movement."
        actions={<a data-navigation-mode="document" className="button button--secondary" href={returnHref}>{returnHref.startsWith("/hr-admin/reports/")?"Back to report":returnHref.startsWith("/hr-admin/lifecycle")?"Back to lifecycle":"Back to movements"}</a>}
      />
      <MovementForm cancelHref={returnHref} successHref={returnHref} initialValue={createEmptyMovementValue(optionsResult.data.movement_types[0]?.value, optionsResult.data.lifecycle_event_statuses[0]?.value)} mode="create" options={optionsResult.data} />
    </main>
  );
}
