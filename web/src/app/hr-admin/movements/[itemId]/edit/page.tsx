import {lifecycleReturnHref} from "@/lib/ui/lifecycle-return";


import { movementToFormValue } from "@/app/hr-admin/movements/form-values";
import { MovementForm } from "@/app/hr-admin/movements/movement-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import { getHrAdminLifecycleOptions, getHrAdminMovement } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }>;searchParams?:Promise<Record<string,string|string[]|undefined>> };

export default async function HrAdminEditMovementPage({ params,searchParams }: PageProps) {
  const query=await searchParams??{};const returnHref=lifecycleReturnHref(query.returnTo,"/hr-admin/movements");
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminMovement(itemId).catch(()=>null), getHrAdminLifecycleOptions().catch(()=>null)]);

  if(optionsResult?.state!=="live" || itemResult?.state!=="live" || itemResult.data.id!==itemId)return <LifecycleUnavailable/>;
  return (
    <main className="shell accerio-page lifecycle-phase3">
      <WorkspaceStandardHeader
        title="Edit movement"
        description="Review source and destination structure, effective date and status before saving."
        actions={<a data-navigation-mode="document" className="button button--secondary" href={returnHref}>{returnHref.startsWith("/hr-admin/reports/")?"Back to report":returnHref.startsWith("/hr-admin/lifecycle")?"Back to lifecycle":"Back to movements"}</a>}
      />
      <MovementForm cancelHref={returnHref} successHref={returnHref} initialValue={movementToFormValue(itemResult.data)} mode="edit" options={optionsResult.data} itemId={itemId} />
    </main>
  );
}
