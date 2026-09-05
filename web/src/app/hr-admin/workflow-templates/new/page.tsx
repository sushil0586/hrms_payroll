import Link from "next/link";

import { createEmptyWorkflowTemplateValue } from "@/app/hr-admin/workflow-templates/form-values";
import { WorkflowTemplateForm } from "@/app/hr-admin/workflow-templates/workflow-template-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminWorkflowOptions } from "@/lib/api";

export default async function HrAdminNewWorkflowTemplatePage() {
  const optionsResult = await getHrAdminWorkflowOptions();

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/workflow-templates">Back to workflow templates</Link>}
        description="Define an approval template with reusable steps that can later be assigned by branch, department, or grade."
        eyebrow={optionsResult.state === "live" ? "Live workflow mode" : "Demo workflow mode"}
        title="Create workflow template"
      />

      <WorkflowTemplateForm initialValue={createEmptyWorkflowTemplateValue()} mode="create" options={optionsResult.data} />
    </main>
  );
}
