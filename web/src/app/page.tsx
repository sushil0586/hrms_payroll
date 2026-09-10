import Link from "next/link";

import { LogoutButton } from "@/app/components/logout-button";
import { WorkspaceCard } from "@/components/patterns/workspace-card";
import { PageIntro } from "@/components/patterns/page-intro";
import { getSessionUser } from "@/lib/api";
import { sessionCanAccessWorkspace, sessionHasAnyRole } from "@/lib/workspace-access";

export default async function HomePage() {
  const sessionUser = await getSessionUser();
  const canAccessPlatformAdmin = sessionCanAccessWorkspace(sessionUser, "platform_admin");
  const canAccessEss = sessionCanAccessWorkspace(sessionUser, "ess");
  const canAccessHrAdmin = sessionHasAnyRole(sessionUser, ["hr-admin"]);
  const canAccessMss = sessionCanAccessWorkspace(sessionUser, "mss");
  const canAccessTenantAdmin = sessionCanAccessWorkspace(sessionUser, "tenant_admin");
  const accessibleWorkspaces = [canAccessPlatformAdmin, canAccessHrAdmin, canAccessEss, canAccessMss, canAccessTenantAdmin].filter(Boolean).length;
  const platformAdminHref = sessionUser ? (canAccessPlatformAdmin ? "/platform-admin" : "/") : "/login";
  const hrAdminHref = sessionUser ? (canAccessHrAdmin ? "/hr-admin" : "/") : "/login";
  const tenantAdminHref = sessionUser ? (canAccessTenantAdmin ? "/tenant-admin" : "/") : "/login";
  const essHref = sessionUser ? (canAccessEss ? "/ess" : "/") : "/login";
  const mssHref = sessionUser ? (canAccessMss ? "/mss/approvals" : "/") : "/login";

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
            <Link className="button button--secondary" href={platformAdminHref}>
              Open Platform
            </Link>
            <Link className="button button--secondary" href={essHref}>
              Open ESS
            </Link>
            <Link className="button button--secondary" href={tenantAdminHref}>
              Open Tenant
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
          <strong>{canAccessPlatformAdmin ? "Platform access" : canAccessHrAdmin ? "HR admin access" : "Queue-based routing"}</strong>
          {canAccessPlatformAdmin ? "tenant onboarding and activation" : canAccessHrAdmin ? "configuration and review" : "enter the workspace that fits the task"}
        </div>
      </section>

      <section className="section public-workspace-section">
        <div className="public-workspace-grid">
          <WorkspaceCard
            eyebrow="Platform admin"
            title="Onboard tenants"
            description="Create customers, provision first admins, adopt baselines, and activate handoff."
            href={platformAdminHref}
            cta={sessionUser ? (canAccessPlatformAdmin ? "Open platform console" : "Platform admin restricted") : "Sign in for platform admin"}
            className="workspace-card--compact public-workspace-card"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Best for", value: "SaaS operators" },
              { label: "Focus", value: "Tenant setup and activation" },
              { label: "Includes", value: "Policy packs, contacts, handoff" },
            ]}
          />
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
            cta={sessionUser ? (canAccessEss ? "Open ESS" : "ESS restricted") : "Sign in for ESS"}
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
          <WorkspaceCard
            eyebrow="Tenant admin"
            title="Manage account"
            description="Plan posture, seat usage, configuration health, and commercial audit evidence."
            href={tenantAdminHref}
            cta={sessionUser ? (canAccessTenantAdmin ? "Open tenant console" : "Tenant admin restricted") : "Sign in for tenant admin"}
            className="workspace-card--compact public-workspace-card"
            descriptionClassName="section-copy-soft"
            details={[
              { label: "Best for", value: "Tenant owners" },
              { label: "Focus", value: "Commercial and account posture" },
              { label: "Includes", value: "Seats, config, evidence" },
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
