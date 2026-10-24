import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";

import { EmployeeDocumentUploadForm } from "@/app/hr-admin/employee-documents/employee-document-upload-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentCategories, getHrAdminDocumentOptions, getHrAdminEmployees } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

export default async function HrAdminNewEmployeeDocumentPage() {
  const user = await requireSessionPermission({
    permissionKeys: ["documents.manage"],
    fallbackPath: "/hr-admin/employee-documents",
  });
  if (!sessionHasPermission(user, "documents.view")) return <DocumentAccessNotice />;
  if (!sessionHasPermission(user, "employees.view")) return <DocumentAccessNotice required="employees.view" />;

  const [optionsResult, employeesResult, categoriesResult] = await Promise.all([
    getHrAdminDocumentOptions(),
    getHrAdminEmployees(),
    getHrAdminDocumentCategories(),
  ]);

  return (
    <main className="shell hr-document-workbench accerio-page document-operations document-upload-page">
      <WorkspaceStandardHeader
        title="Upload employee document"
        description="Choose the employee and category, attach a file and confirm the stored record."
        actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/employee-documents">Back to employee documents</a>}
      />

      <EmployeeDocumentUploadForm categories={categoriesResult.data} employees={employeesResult.data} options={optionsResult.data} />
    </main>
  );
}
