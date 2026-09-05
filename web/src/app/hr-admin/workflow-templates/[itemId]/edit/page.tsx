import Link from "next/link";

import { workflowTemplateToFormValue } from "@/app/hr-admin/workflow-templates/form-values";
import { WorkflowTemplateForm } from "@/app/hr-admin/workflow-templates/workflow-template-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminWorkflowOptions, getHrAdminWorkflowTemplate } from "@/lib/api";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function HrAdminEditWorkflowTemplatePage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminWorkflowTemplate(itemId), getHrAdminWorkflowOptions()]);

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/workflow-templates">Back to workflow templates</Link>}
        description="Adjust routing, actors, escalation timing, and the reusable step chain for this template."
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live workflow mode" : "Demo workflow mode"}
        title="Edit workflow template"
      />

      <WorkflowTemplateForm initialValue={workflowTemplateToFormValue(itemResult.data)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
