import Link from "next/link";
import { notFound } from "next/navigation";

import { EmployeeForm } from "@/app/hr-admin/employees/employee-form";
import { employeeDetailToFormValue } from "@/app/hr-admin/employees/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeDetail, getHrAdminEmployeeFormOptions } from "@/lib/api";

type PageProps = {
  params: Promise<{
    employeeId: string;
  }>;
};

export default async function HrAdminEditEmployeePage({ params }: PageProps) {
  const { employeeId } = await params;
  const [detailResult, optionsResult] = await Promise.all([
    getHrAdminEmployeeDetail(employeeId),
    getHrAdminEmployeeFormOptions(),
  ]);

  if (!detailResult.data?.id) {
    notFound();
  }

  const state = detailResult.state === "live" && optionsResult.state === "live" ? "live" : "demo";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live edit mode" : "Demo edit mode"}
        title={`Edit employee: ${detailResult.data.full_name}`}
        description="Update the employee profile and structural mappings from one shared admin workspace."
        actions={<Link className="button button--secondary" href={`/hr-admin/employees?employeeId=${detailResult.data.id}`}>Back to employee detail</Link>}
        pills={["Master data cleanup", "Shared mapping controls", "Queue-linked editing"]}
      />

      <EmployeeForm
        employeeId={detailResult.data.id}
        initialValue={employeeDetailToFormValue(detailResult.data)}
        mode="edit"
        options={optionsResult.data}
      />
    </main>
  );
}
