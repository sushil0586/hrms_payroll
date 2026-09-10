import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";
import { PageIntro } from "@/components/patterns/page-intro";

export default function LoginPage() {
  return (
    <main className="shell public-shell public-shell--auth">
      <PageIntro
        eyebrow="Authentication"
        title="Sign in"
        description="One sign-in flow for platform operators, tenant admins, HR admins, managers, and employees."
        actions={
          <Link className="button button--secondary" href="/">
            Home
          </Link>
        }
        pills={["Platform Admin", "Tenant Admin", "HR Admin", "Manager", "Employee"]}
        showPills
      />

      <section className="section public-summary-grid">
        <div className="queue-summary-chip">
          <strong>1 login</strong>
          access follows your assigned role
        </div>
        <div className="queue-summary-chip">
          <strong>5 workspaces</strong>
          platform, tenant, HR admin, ESS, and MSS
        </div>
        <div className="queue-summary-chip">
          <strong>Post sign-in</strong>
          open the workspace that matches your permissions
        </div>
      </section>

      <section className="section auth-entry-layout">
        <LoginForm />

        <aside className="insight-panel public-auth-panel">
          <div className="insight-panel__header">
            <h2>Workspace access</h2>
            <p>Use the same account, then enter the workspace that matches your role and assigned permissions.</p>
          </div>

          <div className="public-auth-panel__summary">
            <span className="queue-summary-chip"><strong>Platform admin</strong> tenants, baseline, and activation</span>
            <span className="queue-summary-chip"><strong>Tenant admin</strong> account, trust, and access</span>
            <span className="queue-summary-chip"><strong>HR admin</strong> setup, policy, and reviews</span>
            <span className="queue-summary-chip"><strong>ESS</strong> requests, balances, and attendance</span>
            <span className="queue-summary-chip"><strong>MSS</strong> approval queues and team decisions</span>
          </div>

          <div className="public-auth-panel__grid">
            <div className="workspace-card__detail">
              <span className="detail-label">Platform admin</span>
              <span className="detail-value">Tenant onboarding, admin provisioning, baseline adoption, and activation.</span>
            </div>
            <div className="workspace-card__detail">
              <span className="detail-label">HR admin</span>
              <span className="detail-value">Employee setup, lifecycle, policy, documents, and reports.</span>
            </div>
            <div className="workspace-card__detail">
              <span className="detail-label">ESS</span>
              <span className="detail-value">Attendance, requests, balances, and self-service history.</span>
            </div>
            <div className="workspace-card__detail">
              <span className="detail-label">MSS</span>
              <span className="detail-value">Manager approvals, exceptions, and queue-driven decisions.</span>
            </div>
          </div>

          <div className="public-auth-panel__steps">
            <div className="workspace-card__detail">
              <span className="detail-label">Step 1</span>
              <span className="detail-value">Sign in with your shared account credentials.</span>
            </div>
            <div className="workspace-card__detail">
              <span className="detail-label">Step 2</span>
              <span className="detail-value">Open the workspace your role is allowed to access.</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
