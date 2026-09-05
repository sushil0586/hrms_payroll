import Link from "next/link";

import { createEmptyMovementValue } from "@/app/hr-admin/movements/form-values";
import { MovementForm } from "@/app/hr-admin/movements/movement-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions } from "@/lib/api";

export default async function HrAdminNewMovementPage() {
  const optionsResult = await getHrAdminLifecycleOptions();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Create movement"
        description="Register a transfer, promotion, or reporting change with shared owner and workflow language."
        actions={<Link className="button button--secondary" href="/hr-admin/movements">Back to movements</Link>}
        pills={["Shared owner contract", "Queue-ready movement structure", "Workflow-linked changes"]}
      />
      <MovementForm initialValue={createEmptyMovementValue(optionsResult.data.movement_types[0]?.value, optionsResult.data.lifecycle_event_statuses[0]?.value)} mode="create" options={optionsResult.data} />
    </main>
  );
}
