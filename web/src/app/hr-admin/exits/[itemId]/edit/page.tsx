import Link from "next/link";

import { ExitForm } from "@/app/hr-admin/exits/exit-form";
import { exitToFormValue } from "@/app/hr-admin/exits/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminExit, getHrAdminLifecycleOptions, getHrAdminWorkflowTemplates } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditExitPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult, templatesResult] = await Promise.all([
    getHrAdminExit(itemId),
    getHrAdminLifecycleOptions(),
    getHrAdminWorkflowTemplates(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/exits">Back to exits</Link>}
        description="Update notice dates, clearance status, and exit readiness."
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Edit exit record"
      />
      <ExitForm
        initialValue={exitToFormValue(itemResult.data)}
        itemId={itemId}
        lifecycleTemplates={templatesResult.data}
        mode="edit"
        options={optionsResult.data}
      />
    </main>
  );
}
