import Link from "next/link";

type ComplianceEvidenceArea =
  | "statutory"
  | "providers"
  | "handoff"
  | "audit"
  | "reports"
  | "documents";

type ComplianceEvidenceMetric = {
  label: string;
  value: string | number;
  tone?: "ready" | "warning" | "blocked" | "neutral";
};

type Props = {
  current: ComplianceEvidenceArea;
  eyebrow?: string;
  title: string;
  description: string;
  metrics?: ComplianceEvidenceMetric[];
};

const NAV_ITEMS: Array<{ key: ComplianceEvidenceArea; label: string; href: string; description: string }> = [
  {
    key: "statutory",
    label: "Statutory setup",
    href: "/hr-admin/payroll-statutory",
    description: "Packs, registrations, declarations, and due calendars",
  },
  {
    key: "providers",
    label: "Providers",
    href: "/hr-admin/payroll-providers",
    description: "Certification, mapping packs, rehearsals, and live rail gates",
  },
  {
    key: "handoff",
    label: "Handoff",
    href: "/hr-admin/payroll-handoff",
    description: "Finance artifacts, delivery receipts, callbacks, and audit packs",
  },
  {
    key: "reports",
    label: "Reports",
    href: "/hr-admin/reports/compliance",
    description: "Compliance summaries, filing status, receipts, and exports",
  },
  {
    key: "documents",
    label: "Documents",
    href: "/hr-admin/reports/document-compliance",
    description: "Verification, expiry exposure, re-upload risk, and employee evidence",
  },
  {
    key: "audit",
    label: "Audit trail",
    href: "/hr-admin/audit",
    description: "Cross-module decision and evidence timeline",
  },
];

export function ComplianceEvidenceStrip({
  current,
  eyebrow = "Compliance evidence",
  title,
  description,
  metrics = [],
}: Props) {
  return (
    <section className="compliance-evidence-strip" aria-label="Compliance evidence control">
      <div className="compliance-evidence-strip__summary">
        <div>
          <span className="workspace-card__eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {metrics.length ? (
          <div className="compliance-evidence-strip__metrics" aria-label="Compliance evidence metrics">
            {metrics.slice(0, 4).map((metric) => (
              <span className={`compliance-evidence-strip__metric compliance-evidence-strip__metric--${metric.tone ?? "neutral"}`} key={metric.label}>
                <strong>{metric.value}</strong>
                <small>{metric.label}</small>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <nav className="compliance-evidence-strip__nav" aria-label="Compliance evidence navigation">
        {NAV_ITEMS.map((item) => (
          <Link
            aria-current={item.key === current ? "page" : undefined}
            className={`compliance-evidence-strip__link${item.key === current ? " is-active" : ""}`}
            href={item.href}
            key={item.key}
          >
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
