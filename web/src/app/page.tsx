import Link from "next/link";

import { LogoutButton } from "@/app/components/logout-button";
import { WorkspaceCard } from "@/components/patterns/workspace-card";
import { PageIntro } from "@/components/patterns/page-intro";
import { getSessionUser } from "@/lib/api";
import { sessionCanAccessWorkspace, sessionHasAnyRole } from "@/lib/workspace-access";

export default async function HomePage() {
  const sessionUser = await getSessionUser();
  const canAccessHrAdmin = sessionHasAnyRole(sessionUser, ["hr-admin"]);
  const canAccessMss = sessionCanAccessWorkspace(sessionUser, "mss");
  const accessibleWorkspaces = [true, canAccessHrAdmin, canAccessMss].filter(Boolean).length;
  const hrAdminHref = sessionUser ? "/hr-admin" : "/login";
  const essHref = sessionUser ? "/ess" : "/login";
  const mssHref = sessionUser ? "/mss/approvals" : "/login";

  return (
    <main className="shell public-shell">
      <PageIntro
        eyebrow="PeopleOps control center"
        title="Choose your workspace"
        description="Open the right workspace for the task, decision, or employee action."
        actions={
          <>
            <Link className="button button--primary" href={hrAdminHref}>
              Open HR admin
            </Link>
            <Link className="button button--secondary" href={essHref}>
              Open ESS
            </Link>
            <Link className="button button--secondary" href={mssHref}>
              Open MSS
            </Link>
            {sessionUser ? <LogoutButton /> : <Link className="button button--secondary" href="/login">Sign in</Link>}
          </>
        }
        pills={["Shared sign-in", "Role-based access", "Compact workspaces"]}
        showPills
      />

      <section className="section public-summary-grid">
        <div className="queue-summary-chip">
          <strong>{sessionUser ? accessibleWorkspaces : 3}</strong>
          {sessionUser ? "workspace routes ready" : "workspace types available"}
        </div>
        <div className="queue-summary-chip">
          <strong>{sessionUser ? "Signed in" : "Single login"}</strong>
          {sessionUser ? (sessionUser.display_name || sessionUser.username) : "HR admin, ESS, and MSS"}
        </div>
        <div className="queue-summary-chip">
          <strong>{canAccessHrAdmin ? "HR admin access" : "Queue-based routing"}</strong>
          {canAccessHrAdmin ? "configuration and review" : "enter the workspace that fits the task"}
        </div>
      </section>

      <section className="section public-workspace-section">
        <div className="public-workspace-grid">
          <WorkspaceCard
            eyebrow="HR admin"
            title="Operate HR"
            description="Employees, lifecycle, documents, policies, and reports."
            href={hrAdminHref}
            cta={sessionUser ? (canAccessHrAdmin ? "Open HR admin" : "HR admin restricted") : "Sign in for HR admin"}
            className="workspace-card--compact public-workspace-card"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Best for", value: "HR and ops teams" },
              { label: "Focus", value: "Configuration and review queues" },
              { label: "Includes", value: "People, policy, lifecycle" },
            ]}
          />
          <WorkspaceCard
            eyebrow="ESS"
            title="Employee self service"
            description="Attendance, balances, leave requests, and regularizations."
            href={essHref}
            cta={sessionUser ? "Open ESS" : "Sign in for ESS"}
            className="workspace-card--compact public-workspace-card"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Best for", value: "Employees" },
              { label: "Focus", value: "Self-service and request history" },
              { label: "Includes", value: "Attendance, leave, balances" },
            ]}
          />
          <WorkspaceCard
            eyebrow="MSS"
            title="Manager approvals"
            description="Leave and attendance approvals in one queue."
            href={mssHref}
            cta={sessionUser ? (canAccessMss ? "Open MSS" : "Manager access required") : "Sign in for MSS"}
            className="workspace-card--compact public-workspace-card"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Best for", value: "Managers" },
              { label: "Focus", value: "Approval inbox and team visibility" },
              { label: "Includes", value: "Leave and attendance decisions" },
            ]}
          />
        </div>
      </section>

      {sessionUser ? (
        <section className="section public-session-row">
          <div className="queue-summary-chip public-session-chip">
            <strong>Signed in</strong> as {sessionUser.display_name || sessionUser.first_name || sessionUser.username}
          </div>
        </section>
      ) : null}
    </main>
  );
}
