import Link from "next/link";
import { redirect } from "next/navigation";

import { PublicLeadForm } from "@/app/public-lead-form";
import { getSessionUser } from "@/lib/api";
import { getPrimaryWorkspaceHref } from "@/lib/workspace-routing";

export default async function HomePage() {
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect(getPrimaryWorkspaceHref(sessionUser) ?? "/workspace-access");
  }

  return (
    <main className="shell marketing-shell">
      <nav className="marketing-nav" aria-label="Public navigation">
        <Link className="marketing-brand" href="/">
          <span className="marketing-brand__mark">A</span>
          <span>Accerio HRMS</span>
        </Link>
        <div className="marketing-nav__actions">
          <a href="#pricing">Pricing</a>
          <a href="#signup">Public signup</a>
          <a href="#contact">Contact</a>
          <Link className="button button--secondary" href="/login">Sign in</Link>
        </div>
      </nav>

      <section className="marketing-hero">
        <div className="marketing-hero__content">
          <span className="hero__eyebrow">Payroll-first HRMS for Indian SMBs</span>
          <h1>Run payroll, compliance, and employee operations from one audit-ready SaaS workspace.</h1>
          <p>
            Accerio HRMS helps growing teams manage employee records, configurable payroll, statutory reporting,
            payslips, approvals, and finance handoff without hardcoded rules.
          </p>
          <div className="marketing-hero__actions">
            <a className="button button--primary" href="#signup">Request access</a>
            <a className="button button--secondary" href="#contact">Talk to sales</a>
            <Link className="button button--secondary" href="/login">Customer login</Link>
          </div>
          <div className="marketing-proof-row" aria-label="Product proof points">
            <span><strong>100 employee</strong> pilot certified</span>
            <span><strong>22 browser</strong> launch checks passed</span>
            <span><strong>Role-based</strong> SaaS access</span>
          </div>
        </div>

        <aside className="marketing-product-visual" aria-label="Product preview">
          <div className="product-window">
            <div className="product-window__chrome"><span /><span /><span /></div>
            <div className="product-window__body">
              <div className="product-window__sidebar">
                <span className="active" />
                <span />
                <span />
                <span />
              </div>
              <div className="product-window__main">
                <div className="product-window__header">
                  <div>
                    <span className="mini-label">Payroll cockpit</span>
                    <strong>September payroll</strong>
                  </div>
                  <span className="status-pill">Ready</span>
                </div>
                <div className="product-metric-grid">
                  <div><span>Employees</span><strong>100</strong></div>
                  <div><span>Net pay</span><strong>₹42.8L</strong></div>
                  <div><span>Exceptions</span><strong>0</strong></div>
                </div>
                <div className="product-chart" aria-hidden="true">
                  <span style={{ height: "42%" }} />
                  <span style={{ height: "56%" }} />
                  <span style={{ height: "48%" }} />
                  <span style={{ height: "72%" }} />
                  <span style={{ height: "64%" }} />
                  <span style={{ height: "86%" }} />
                </div>
                <div className="product-steps">
                  <span>Inputs locked</span>
                  <span>Review approved</span>
                  <span>Reports exported</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="marketing-section">
        <div className="marketing-section__header">
          <span className="hero__eyebrow">Why teams buy it</span>
          <h2>Built for payroll confidence, not just HR record keeping.</h2>
        </div>
        <div className="marketing-card-grid">
          {[
            ["Configurable payroll", "Salary structures, payroll inputs, calculations, reviews, settlements, and outputs stay tenant configurable."],
            ["Compliance evidence", "TDS, statutory deductions, filing status, payslip publication, and export audit history are built into the flow."],
            ["SaaS control", "Platform admin can review public requests, onboard tenants, provision admins, publish baselines, and activate customers."],
            ["Role-ready workspaces", "Separate experiences for platform admin, tenant admin, HR admin, finance, manager, support, and employee self-service."],
          ].map(([title, description]) => (
            <article className="marketing-card" key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section" id="pricing">
        <div className="marketing-section__header">
          <span className="hero__eyebrow">Simple launch pricing</span>
          <h2>Start guided, then scale per employee.</h2>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card">
            <span>Starter</span>
            <h3>₹2,999/mo</h3>
            <p>Up to 50 employees, core HRMS, payroll setup, payslips, and basic reports.</p>
          </article>
          <article className="pricing-card pricing-card--featured">
            <span>Growth</span>
            <h3>₹75/employee/mo</h3>
            <p>Payroll runs, statutory setup, TDS reports, manager approvals, ESS, and audit exports.</p>
          </article>
          <article className="pricing-card">
            <span>Business</span>
            <h3>₹60/employee/mo</h3>
            <p>Multi-branch operations, finance handoff, advanced reports, provider workflows, and priority support.</p>
          </article>
        </div>
      </section>

      <section className="marketing-section marketing-form-section" id="signup">
        <div className="marketing-section__header">
          <span className="hero__eyebrow">Public signup</span>
          <h2>Request a guided pilot.</h2>
          <p>Signup requests go to platform admin for review and approval before any tenant is created.</p>
        </div>
        <PublicLeadForm intent="signup" submitLabel="Request pilot access" />
      </section>

      <section className="marketing-section marketing-form-section" id="contact">
        <div className="marketing-section__header">
          <span className="hero__eyebrow">Contact us</span>
          <h2>Need pricing, migration, or payroll compliance help?</h2>
          <p>Send a message and the platform team can qualify it from the admin console.</p>
        </div>
        <PublicLeadForm intent="contact" submitLabel="Send message" compact />
      </section>
    </main>
  );
}
