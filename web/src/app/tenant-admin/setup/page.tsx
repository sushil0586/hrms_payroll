import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantAdminConsole } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function badgeClass(status: "ready" | "warning" | "blocked") {
  if (status === "ready") {
    return "readiness-badge readiness-badge--ready";
  }
  if (status === "warning") {
    return "readiness-badge readiness-badge--warning";
  }
  return "readiness-badge readiness-badge--blocked";
}

export default async function TenantSetupGuidePage() {
  await requireSessionPermission({
    permissionKeys: ["tenant.setup.view"],
    workspace: "tenant_admin",
    fallbackPath: "/tenant-admin",
  });
  const result = await getTenantAdminConsole();
  const data = result.data;
  const blockers = data.governance_checks.filter((check) => check.status === "blocked");
  const warnings = data.governance_checks.filter((check) => check.status === "warning");
  const setupAreas = [
    {
      title: "Company profile",
      owner: "Tenant Admin",
      status: data.tenant.legal_name && data.tenant.country_code && data.tenant.timezone ? "ready" : "blocked",
      detail: "Legal name, country, timezone, plan, and account posture.",
      evidence: `${data.tenant.legal_name || data.tenant.name} · ${data.tenant.country_code} · ${data.tenant.timezone}`,
      href: "/tenant-admin",
      action: "Review profile",
    },
    {
      title: "Organization masters",
      owner: "HR Admin",
      status: data.configuration_health.published_count ? "ready" : "blocked",
      detail: "Legal entities, branches, locations, departments, grades, designations, and cost centers.",
      evidence: `${data.configuration_health.published_count} published configs, ${data.configuration_health.draft_count} drafts`,
      href: "/hr-admin/organization",
      action: "Open masters",
    },
    {
      title: "Users and access",
      owner: "Tenant Admin",
      status: data.summary.active_membership_count > 1 ? "ready" : "warning",
      detail: "Invite admins, assign roles, and keep seat usage within plan limits.",
      evidence: `${data.summary.active_membership_count} active members, ${data.role_coverage.length} role groups`,
      href: "/tenant-admin/users",
      action: "Manage access",
    },
    {
      title: "Payroll foundation",
      owner: "HR Admin",
      status: data.summary.published_configuration_count ? "ready" : "blocked",
      detail: "Pay calendars, pay groups, salary components, policies, and provider-ready payroll setup.",
      evidence: `${data.summary.published_configuration_count} published setup records`,
      href: "/hr-admin/payroll-setup",
      action: "Open payroll setup",
    },
    {
      title: "Security and audit",
      owner: "Tenant Admin",
      status: blockers.length ? "blocked" : warnings.length ? "warning" : "ready",
      detail: "Security readiness, trust audit evidence, support grants, and launch blockers.",
      evidence: `${blockers.length} blockers, ${warnings.length} warnings`,
      href: "/tenant-admin/security-readiness",
      action: "Review gates",
    },
  ] as const;
  const readyAreas = setupAreas.filter((area) => area.status === "ready").length;
  const blockedAreas = setupAreas.filter((area) => area.status === "blocked").length;
  const warningAreas = setupAreas.filter((area) => area.status === "warning").length;

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live tenant setup" : "Demo tenant setup"}
        title="Tenant Setup Guide"
        description="A first-run control page for completing tenant launch readiness before payroll operations begin."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/organization">
              Start master setup
            </Link>
            <Link className="button button--secondary" href="/tenant-admin">
              Back to console
            </Link>
          </>
        }
        pills={[data.tenant.code, `${readyAreas}/${setupAreas.length} ready`, data.summary.status]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Ready areas" value={readyAreas} trend={`${setupAreas.length} total`} />
          <MetricTile label="Warnings" value={warningAreas} trend="Monitor before launch" />
          <MetricTile label="Blocked" value={blockedAreas} trend="Needs action" />
          <MetricTile label="Members" value={data.summary.active_membership_count} trend={`${data.summary.role_count} roles`} />
          <MetricTile label="Configs" value={data.configuration_health.published_count} trend={`${data.configuration_health.draft_count} drafts`} />
        </div>
      </section>

      <section className="section tenant-setup-workbench" data-testid="tenant-setup-workbench">
        <div className="panel-card-soft tenant-console-panel tenant-setup-guide">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Launch readiness</span>
              <h2>Setup areas</h2>
            </div>
            <span className={badgeClass(blockedAreas ? "blocked" : warningAreas ? "warning" : "ready")}>
              {blockedAreas ? "Action needed" : warningAreas ? "Review" : "Ready"}
            </span>
          </div>
          <div className="tenant-setup-area-list">
            {setupAreas.map((area) => (
              <article className="tenant-setup-area" key={area.title}>
                <div>
                  <span className="workspace-card__eyebrow">{area.owner}</span>
                  <h3>{area.title}</h3>
                  <p>{area.detail}</p>
                  <span>{area.evidence}</span>
                </div>
                <span className={badgeClass(area.status)}>{titleCase(area.status)}</span>
                <Link className="button button--secondary" href={area.href}>
                  {area.action}
                </Link>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Dependency guardrails</span>
              <h2>Before employee import</h2>
            </div>
          </div>
          <div className="tenant-console-list">
            {[
              "Create legal entities before branches and cost centers.",
              "Map each branch to a legal entity and location.",
              "Map departments to business units where reporting depends on BU.",
              "Map designations to grades before employee onboarding.",
              "Create pay calendars, pay groups, and salary components before payroll run setup.",
            ].map((item) => (
              <div className="tenant-console-row" key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
