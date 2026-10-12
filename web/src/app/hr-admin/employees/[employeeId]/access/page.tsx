import Link from "next/link";
import { notFound } from "next/navigation";

import { EmployeeAccessForm } from "@/app/hr-admin/employees/[employeeId]/access/access-form";
import { employeeAccessDetailToFormValue } from "@/app/hr-admin/employees/[employeeId]/access/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeAccessDetail, getHrAdminEmployeeAccessOptions, getHrAdminEmployeeDetail } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

type PageProps = {
  params: Promise<{
    employeeId: string;
  }>;
};

export default async function HrAdminEmployeeAccessPage({ params }: PageProps) {
  const { employeeId } = await params;
  await requireSessionPermission({
    permissionKeys: ["employees.access.manage"],
    fallbackPath: `/hr-admin/employees?employeeId=${employeeId}`,
  });
  const [employeeResult, accessResult, optionsResult] = await Promise.all([
    getHrAdminEmployeeDetail(employeeId),
    getHrAdminEmployeeAccessDetail(employeeId),
    getHrAdminEmployeeAccessOptions(),
  ]);

  if (!employeeResult.data?.id || !accessResult.data?.employee_id) {
    notFound();
  }

  const state =
    employeeResult.state === "live" && accessResult.state === "live" && optionsResult.state === "live" ? "live" : "demo";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live access mode" : "Demo access mode"}
        title={`Access for ${employeeResult.data.full_name}`}
        description="Manage login state, tenant membership, and role assignment for this employee."
        actions={<Link className="button button--secondary" href={`/hr-admin/employees?employeeId=${employeeId}`}>Back to employee detail</Link>}
        pills={["Login", "Membership", "Roles"]}
      />

      <section className="section">
        <div className="attendance-summary-strip payroll-run-summary-strip">
          <span><strong>{accessResult.data.has_access ? "Yes" : "No"}</strong> Access provisioned</span>
          <span><strong>{accessResult.data.roles.length}</strong> Assigned roles</span>
          <span><strong>{accessResult.data.membership_status.replace("_", " ")}</strong> Membership status</span>
        </div>
      </section>

      <EmployeeAccessForm
        employeeId={employeeId}
        existingAccess={accessResult.data.has_access}
        employeeStatus={employeeResult.data.employment_status}
        initialValue={employeeAccessDetailToFormValue(accessResult.data)}
        options={optionsResult.data}
      />
    </main>
  );
}
