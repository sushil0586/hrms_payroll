import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/components/logout-button";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getSessionUser } from "@/lib/api";

export default async function AccessDeniedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <main className="shell accerio-page">
    <WorkspaceStandardHeader title="Workspace access unavailable" description="Your current permissions do not open this workspace. Ask your administrator to review your access." />
    <div className="form-shell-card__actions">
      {user.workspace_access?.ess ? <Link className="button button--secondary" href="/ess">Employee workspace</Link> : null}
      <LogoutButton />
    </div>
  </main>;
}
