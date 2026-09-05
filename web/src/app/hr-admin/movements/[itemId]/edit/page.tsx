import Link from "next/link";

import { movementToFormValue } from "@/app/hr-admin/movements/form-values";
import { MovementForm } from "@/app/hr-admin/movements/movement-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions, getHrAdminMovement } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditMovementPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminMovement(itemId), getHrAdminLifecycleOptions()]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Edit movement"
        description="Refine the structural change details without drifting from the movement queue or lifecycle inbox."
        actions={<Link className="button button--secondary" href="/hr-admin/movements">Back to movements</Link>}
        pills={["Queue-linked status model", "Shared owner contract", "Structured destination mapping"]}
      />
      <MovementForm initialValue={movementToFormValue(itemResult.data)} mode="edit" options={optionsResult.data} itemId={itemId} />
    </main>
  );
}
