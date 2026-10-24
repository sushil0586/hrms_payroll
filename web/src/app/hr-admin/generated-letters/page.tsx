import { GeneratedLetterWorkspace } from "./generated-letter-workspace";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";
import { getHrAdminDocumentOptions, getHrAdminEmployees, getHrAdminGeneratedLetters, getSessionUser } from "@/lib/api";
import { completeReport } from "@/lib/complete-report";
import { sessionHasPermission } from "@/lib/workspace-access";
export default async function HrAdminGeneratedLettersPage() {
  const user = await getSessionUser();
  if (!sessionHasPermission(user,"documents.view")) return <DocumentAccessNotice />;
  if (!sessionHasPermission(user,"employees.view")) return <DocumentAccessNotice required="employees.view" />;
  const [letters,options,employees] = await Promise.all([completeReport(getHrAdminGeneratedLetters),getHrAdminDocumentOptions(),getHrAdminEmployees()]);
  return <main className="shell hr-document-workbench accerio-page document-operations">
    <WorkspaceStandardHeader title="Generated HR letters" description="Compose the draft, preview current variables and confirm the stored letter." actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/documents">Back to documents</a>} />
    <GeneratedLetterWorkspace employees={employees.data} initialLetters={letters.data.items} letterTypes={options.data.letter_types} />
  </main>;
}
