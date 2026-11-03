import Link from "next/link";

import { createEmptyWorkflowTemplateAssignmentValue } from "@/app/hr-admin/workflow-template-assignments/form-values";
import { WorkflowTemplateAssignmentForm } from "@/app/hr-admin/workflow-template-assignments/workflow-template-assignment-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminWorkflowOptions } from "@/lib/api";

export default async function HrAdminNewWorkflowTemplateAssignmentPage() {
  const optionsResult = await getHrAdminWorkflowOptions();

  return (
    <main className="shell shell--workspace workflow-workbench accerio-page">
      <WorkspaceStandardHeader
        actions={<Link className="button button--secondary" href="/hr-admin/workflow-template-assignments">Back to workflow assignments</Link>}
        description="Scope a workflow template to the entity, branch, department, business unit, or grade where it should apply."
        eyebrow={optionsResult.state === "live" ? "Live workflow mode" : "Demo workflow mode"}
        title="Create workflow assignment"
      />

      <WorkflowTemplateAssignmentForm initialValue={createEmptyWorkflowTemplateAssignmentValue()} mode="create" options={optionsResult.data} />
    </main>
  );
}
