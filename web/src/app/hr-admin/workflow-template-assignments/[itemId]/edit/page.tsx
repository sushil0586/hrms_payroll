import Link from "next/link";

import { workflowTemplateAssignmentToFormValue } from "@/app/hr-admin/workflow-template-assignments/form-values";
import { WorkflowTemplateAssignmentForm } from "@/app/hr-admin/workflow-template-assignments/workflow-template-assignment-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminWorkflowOptions, getHrAdminWorkflowTemplateAssignments } from "@/lib/api";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function HrAdminEditWorkflowTemplateAssignmentPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemsResult, optionsResult] = await Promise.all([getHrAdminWorkflowTemplateAssignments(), getHrAdminWorkflowOptions()]);
  const item = itemsResult.data.find((entry) => entry.id === itemId) ?? itemsResult.data[0];

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/workflow-template-assignments">Back to workflow assignments</Link>}
        description="Update where this template applies so different teams and org scopes can use different approval chains."
        eyebrow={itemsResult.state === "live" && optionsResult.state === "live" ? "Live workflow mode" : "Demo workflow mode"}
        title="Edit workflow assignment"
      />

      <WorkflowTemplateAssignmentForm initialValue={workflowTemplateAssignmentToFormValue(item)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
