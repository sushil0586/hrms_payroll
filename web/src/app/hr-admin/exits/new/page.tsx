import Link from "next/link";

import { ExitForm } from "@/app/hr-admin/exits/exit-form";
import { createEmptyExitValue } from "@/app/hr-admin/exits/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions, getHrAdminWorkflowTemplates } from "@/lib/api";

export default async function HrAdminNewExitPage() {
  const [optionsResult, templatesResult] = await Promise.all([getHrAdminLifecycleOptions(), getHrAdminWorkflowTemplates()]);

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/exits">Back to exits</Link>}
        description="Initiate an employee separation and track notice and clearance fields."
        eyebrow={optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Create exit record"
      />
      <ExitForm
        initialValue={createEmptyExitValue(optionsResult.data.exit_statuses[0]?.value)}
        lifecycleTemplates={templatesResult.data}
        mode="create"
        options={optionsResult.data}
      />
    </main>
  );
}
