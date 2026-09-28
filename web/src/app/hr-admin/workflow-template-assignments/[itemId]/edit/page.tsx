import Link from "next/link";

import { workflowTemplateAssignmentToFormValue } from "@/app/hr-admin/workflow-template-assignments/form-values";
import { WorkflowTemplateAssignmentForm } from "@/app/hr-admin/workflow-template-assignments/workflow-template-assignment-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminWorkflowOptions, getHrAdminWorkflowTemplateAssignment } from "@/lib/api";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function HrAdminEditWorkflowTemplateAssignmentPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminWorkflowTemplateAssignment(itemId), getHrAdminWorkflowOptions()]);

  return (
    <main className="shell shell--workspace workflow-workbench">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/workflow-template-assignments">Back to workflow assignments</Link>}
        description="Update where this template applies so different teams and org scopes can use different approval chains."
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live workflow mode" : "Demo workflow mode"}
        title="Edit workflow assignment"
      />

      <WorkflowTemplateAssignmentForm initialValue={workflowTemplateAssignmentToFormValue(itemResult.data)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
