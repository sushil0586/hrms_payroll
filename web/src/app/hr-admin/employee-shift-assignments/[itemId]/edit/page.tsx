import Link from "next/link";

import { EmployeeShiftAssignmentForm } from "@/app/hr-admin/employee-shift-assignments/employee-shift-assignment-form";
import { employeeShiftAssignmentToFormValue } from "@/app/hr-admin/employee-shift-assignments/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeShiftAssignment, getHrAdminPolicyOptions } from "@/lib/api";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function HrAdminEditEmployeeShiftAssignmentPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([
    getHrAdminEmployeeShiftAssignment(itemId),
    getHrAdminPolicyOptions(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemResult.state === "live" ? "Live shift assignment mode" : "Demo shift assignment mode"}
        title="Edit shift assignment."
        description="Update shift coverage timing or primary coverage precedence for this employee."
        actions={<Link className="button button--secondary" href="/hr-admin/employee-shift-assignments">Back to shift assignments</Link>}
      />
      <EmployeeShiftAssignmentForm initialValue={employeeShiftAssignmentToFormValue(itemResult.data)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
