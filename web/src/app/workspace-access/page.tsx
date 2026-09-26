import { redirect } from "next/navigation";

import { LogoutButton } from "@/app/components/logout-button";
import { PageIntro } from "@/components/patterns/page-intro";
import { getSessionUser } from "@/lib/api";
import { getPrimaryWorkspaceHref } from "@/lib/workspace-routing";

export default async function WorkspaceAccessPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login");
  }

  const workspaceHref = getPrimaryWorkspaceHref(sessionUser);
  if (workspaceHref) {
    redirect(workspaceHref);
  }

  return (
    <main className="shell public-shell public-shell--auth">
      <PageIntro
        eyebrow="Workspace Access"
        title="No workspace access is assigned"
        description="Your account is active, but it does not yet have a role or employee profile that opens a workspace."
        actions={<LogoutButton />}
      />

      <section className="section auth-entry-layout">
        <div className="form-shell-card">
          <div className="form-shell-card__intro">
            <h2 className="section-heading-soft">Ask an administrator to finish access setup</h2>
            <p className="section-copy section-copy-soft">
              A tenant admin or HR admin needs to assign the right role, permissions, or employee profile before this account can enter HRMS.
            </p>
          </div>

          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">Signed-in user</span>
              <span className="detail-value">{sessionUser.email || sessionUser.username}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Current status</span>
              <span className="detail-value">Authenticated, no workspace route available</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
