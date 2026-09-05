import Link from "next/link";

import { EmployeeForm } from "@/app/hr-admin/employees/employee-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { createEmptyEmployeeFormValue } from "@/app/hr-admin/employees/form-values";
import { getHrAdminEmployeeFormOptions } from "@/lib/api";

export default async function HrAdminNewEmployeePage() {
  const optionsResult = await getHrAdminEmployeeFormOptions();
  const defaultStatus = optionsResult.data.employment_statuses.find((item) => item.value === "draft")?.value || optionsResult.data.employment_statuses[0]?.value || "draft";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live create mode" : "Demo create mode"}
        title="Create employee"
        description="Start the employee record with clean structure, access, lifecycle, and payroll-ready data."
        actions={<Link className="button button--secondary" href="/hr-admin/employees">Back to employee masters</Link>}
        pills={["Shared admin shell", "Modern form foundation", "Ready for downstream setup"]}
      />

      <EmployeeForm initialValue={createEmptyEmployeeFormValue(defaultStatus)} mode="create" options={optionsResult.data} />
    </main>
  );
}
