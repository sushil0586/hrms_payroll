import Link from "next/link";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";

export function DocumentAccessNotice({ required = "documents.view" }: { required?: string }) {
  return <main className="shell accerio-page document-operations">
    <WorkspaceStandardHeader title="Document access unavailable" description={`This task also requires ${required}. Ask your administrator to review your access.`} />
    <Link className="button button--secondary" href="/access-denied">Workspace access</Link>
  </main>;
}
