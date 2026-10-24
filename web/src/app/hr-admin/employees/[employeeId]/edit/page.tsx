import { notFound } from "next/navigation";

import { EmployeeForm } from "@/app/hr-admin/employees/employee-form";
import { employeeDetailToFormValue } from "@/app/hr-admin/employees/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeDetail, getHrAdminEmployeeFormOptions } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

type PageProps = {
  params: Promise<{
    employeeId: string;
  }>;
};

export default async function HrAdminEditEmployeePage({ params }: PageProps) {
  const { employeeId } = await params;
  await requireSessionPermission({
    permissionKeys: ["employees.edit"],
    fallbackPath: `/hr-admin/employees?employeeId=${employeeId}`,
  });
  const [detailResult, optionsResult] = await Promise.all([
    getHrAdminEmployeeDetail(employeeId),
    getHrAdminEmployeeFormOptions(),
  ]);

  if (!detailResult.data?.id) {
    notFound();
  }

  const state = detailResult.state === "live" && optionsResult.state === "live" ? "live" : "demo";

  return (
    <main className="shell hr-admin-compact-ui hr-employee-form-page accerio-page">
      <PageIntro appearance="accerio"
        eyebrow={state === "live" ? "Live edit mode" : "Demo edit mode"}
        title={`Edit employee: ${detailResult.data.full_name}`}
        description="Update profile, employment status, and structural mappings in one guided flow."
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
