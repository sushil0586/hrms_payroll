import Link from "next/link";
import { redirect } from "next/navigation";

import { PublicLeadForm } from "@/app/public-lead-form";
import { getSessionUser } from "@/lib/api";
import { getPrimaryWorkspaceHref } from "@/lib/workspace-routing";

const flowSteps = [
  ["01", "Employee data confirmed", "Joiners, movements and compensation changes are effective-dated.", "HR Admin"],
  ["02", "Time inputs reconciled", "Attendance, leave and shift exceptions are resolved.", "People Ops"],
  ["03", "Payroll reviewed", "Calculations, exceptions and statutory deductions are checked.", "Payroll"],
  ["04", "Outputs handed off", "Payslips, reports and finance evidence are published.", "Finance"],
];

const workspaceStages = [
  ["01 · Employee", "Daily self-service", "View attendance, request leave, maintain documents and access published payslips.", "Less follow-up for HR"],
  ["02 · Manager", "Evidence-led approvals", "Review team requests, exceptions and context before making a recorded decision.", "Clear queue ownership"],
  ["03 · HR & Payroll", "Controlled processing", "Maintain employee setup, reconcile inputs and review calculations before publication.", "One canonical state"],
  ["04 · Finance", "Verified handoff", "Receive reconciled outputs, statutory readiness and traceable delivery evidence.", "Fewer hidden handoffs"],
];

const controls = [
  ["Tenant and role boundaries", "Users enter the workspace and actions their assigned permissions allow."],
  ["Effective-dated employee history", "Changes retain timing and context for downstream attendance and payroll decisions."],
  ["Confirmed outcomes and audit evidence", "Success follows persistence; rejected and stale actions preserve canonical state."],
];

export default async function HomePage() {
  const sessionUser = await getSessionUser();

  if (sessionUser) redirect(getPrimaryWorkspaceHref(sessionUser) ?? "/workspace-access");

  return (
    <div className="public-experience">
      <header className="public-site-header">
        <nav className="public-site-nav" aria-label="Public navigation">
          <Link className="public-brand" href="/" aria-label="Accerio HRMS home">
            <span className="public-brand__mark">A</span>
            <span>Accerio HRMS</span>
          </Link>
          <div className="public-site-nav__links">
            <a href="#workflow">How it works</a>
            <a href="#controls">Controls</a>
            <a href="#outcomes">Outcomes</a>
          </div>
          <div className="public-site-nav__actions">
            <Link className="button button--secondary" href="/login">Sign in</Link>
            <Link className="button button--primary" href="/login?mode=request">Request access</Link>
          </div>
        </nav>
      </header>

      <main className="shell public-landing-main">
        <section className="public-flow-hero">
          <div className="public-flow-hero__copy">
            <span className="public-eyebrow">From employee change to compliant payroll</span>
            <h1>One clear operating flow for HR and payroll.</h1>
            <p>Accerio connects employee records, attendance, leave, approvals and payroll so every change has an owner, an effective date and a traceable outcome.</p>
            <div className="public-button-row">
              <Link className="button button--primary" href="/login?mode=request">Request a guided pilot</Link>
              <a className="button button--secondary" href="#workflow">See the complete flow</a>
            </div>
            <div className="public-micro-proof" aria-label="Product capabilities">
              <span>✓ India-ready payroll operations</span>
              <span>✓ Role-based access</span>
              <span>✓ Auditable decisions</span>
            </div>
          </div>

          <aside className="public-flow-board" aria-label="Example monthly operating flow">
            <div className="public-flow-board__head">
              <div><strong>Current payroll flow</strong><span> · 126 employees</span></div>
              <span className="public-flow-status">● On track</span>
            </div>
            <div className="public-flow-list">
              {flowSteps.map(([index, title, description, owner]) => (
                <article className="public-flow-step" key={index}>
                  <span className="public-flow-step__number">{index}</span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                  <span className="public-flow-owner">{owner}</span>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="public-story-section" id="workflow">
          <div className="public-section-inner">
            <div className="public-section-head">
              <span className="public-eyebrow">The complete operating loop</span>
              <h2>Each workspace moves the same employee record forward.</h2>
              <p>Employees and managers complete daily work while HR, payroll and finance control the monthly outcome.</p>
            </div>
            <div className="public-story-grid">
              {workspaceStages.map(([index, title, description, outcome]) => (
                <article className="public-story-stage" key={index}>
                  <span>{index}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <strong>{outcome}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="public-controls-section" id="controls">
          <div className="public-controls-section__copy">
            <span className="public-eyebrow">Controls built into the flow</span>
            <h2>Confidence comes from how the work is handled.</h2>
            <p>Accerio keeps permissions, validation and history close to the action instead of adding them after payroll is complete.</p>
          </div>
          <div className="public-control-list">
            {controls.map(([title, description]) => (
              <article className="public-control-line" key={title}>
                <span aria-hidden="true">✓</span>
                <div><strong>{title}</strong><p>{description}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="public-request-section" id="outcomes">
          <div className="public-request-section__intro">
            <span className="public-eyebrow">A reviewed path to launch</span>
            <h2>Review your current HR-to-payroll flow with Accerio.</h2>
            <p>Tell us about your organization. The Accerio platform team reviews each request before tenant setup or payroll activation begins.</p>
          </div>
          <div id="signup">
            <PublicLeadForm intent="signup" submitLabel="Request pilot access" />
          </div>
        </section>
      </main>

      <footer className="public-site-footer">
        <Link className="public-brand public-brand--inverse" href="/"><span className="public-brand__mark">A</span><span>Accerio HRMS</span></Link>
        <span>Employee operations, payroll and governed access in one connected platform.</span>
        <Link href="/login">Customer sign in</Link>
      </footer>
    </div>
  );
}
