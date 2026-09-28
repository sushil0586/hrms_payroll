import Link from "next/link";

import { EmployeeForm } from "@/app/hr-admin/employees/employee-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { createEmptyEmployeeFormValue } from "@/app/hr-admin/employees/form-values";
import { getHrAdminEmployeeFormOptions } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

export default async function HrAdminNewEmployeePage() {
  await requireSessionPermission({
    permissionKeys: ["employees.create"],
    fallbackPath: "/hr-admin/employees",
  });
  const optionsResult = await getHrAdminEmployeeFormOptions();
  const defaultStatus = optionsResult.data.employment_statuses.find((item) => item.value === "draft")?.value || optionsResult.data.employment_statuses[0]?.value || "draft";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live create mode" : "Demo create mode"}
        title="Create employee"
        description="Create the master record that downstream access, lifecycle, and payroll workflows use."
        actions={<Link className="button button--secondary" href="/hr-admin/employees">Back to employee masters</Link>}
        pills={["Identity", "Structure", "Payroll ready"]}
      />

      <EmployeeForm initialValue={createEmptyEmployeeFormValue(defaultStatus)} mode="create" options={optionsResult.data} />
    </main>
  );
}
