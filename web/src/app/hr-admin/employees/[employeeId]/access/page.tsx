import Link from "next/link";
import { notFound } from "next/navigation";

import { EmployeeAccessForm } from "@/app/hr-admin/employees/[employeeId]/access/access-form";
import { employeeAccessDetailToFormValue } from "@/app/hr-admin/employees/[employeeId]/access/form-values";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeAccessDetail, getHrAdminEmployeeAccessOptions, getHrAdminEmployeeDetail } from "@/lib/api";

type PageProps = {
  params: Promise<{
    employeeId: string;
  }>;
};

export default async function HrAdminEmployeeAccessPage({ params }: PageProps) {
  const { employeeId } = await params;
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
        title={`Manage system access for ${employeeResult.data.full_name}.`}
        description="Connect the employee master to a user account, tenant membership, and role mix in a provisioning flow that feels consistent with the rest of the admin suite."
        actions={<Link className="button button--secondary" href={`/hr-admin/employees?employeeId=${employeeId}`}>Back to employee detail</Link>}
        pills={["Provisioning and membership", "Role-aware access setup", "Works in live and demo mode"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Access provisioned" value={accessResult.data.has_access ? "Yes" : "No"} trend="Account state" />
          <MetricTile label="Assigned roles" value={accessResult.data.roles.length} trend="Permission mix" />
          <MetricTile label="Membership status" value={accessResult.data.membership_status.replace("_", " ")} trend="Tenant presence" />
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
