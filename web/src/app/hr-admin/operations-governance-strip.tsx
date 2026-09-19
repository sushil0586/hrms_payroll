import Link from "next/link";

type OperationsArea = "overview" | "commercial" | "resilience" | "sla" | "notifications" | "remediation" | "imports";

type OperationsMetric = {
  label: string;
  value: string | number;
  tone?: "neutral" | "ready" | "warning" | "blocked";
};

const operationsNav: Array<{
  key: OperationsArea;
  label: string;
  href: string;
  helper: string;
}> = [
  {
    key: "overview",
    label: "Ops health",
    href: "/hr-admin/saas-operations",
    helper: "Tenant-facing operating posture",
  },
  {
    key: "commercial",
    label: "Control plane",
    href: "/hr-admin/saas-control-plane",
    helper: "Plan, usage, entitlements",
  },
  {
    key: "resilience",
    label: "Resilience",
    href: "/hr-admin/saas-resilience",
    helper: "Backup, restore, retention",
  },
  {
    key: "sla",
    label: "SLA ops",
    href: "/hr-admin/saas-sla-operations",
    helper: "Incidents and escalation",
  },
  {
    key: "notifications",
    label: "Notifications",
    href: "/hr-admin/notifications-admin",
    helper: "Templates, queue, delivery",
  },
  {
    key: "remediation",
    label: "Remediation",
    href: "/hr-admin/launch-remediation",
    helper: "Launch blockers and actions",
  },
  {
    key: "imports",
    label: "Import history",
    href: "/hr-admin/import-history",
    helper: "Batch evidence and rollback",
  },
];

export function OperationsGovernanceStrip({
  current,
  eyebrow = "HR operations governance",
  title,
  description,
  metrics = [],
}: {
  current: OperationsArea;
  eyebrow?: string;
  title: string;
  description: string;
  metrics?: OperationsMetric[];
}) {
  return (
    <section className="operations-governance-strip" aria-label="Operations governance control">
      <div className="operations-governance-strip__summary">
        <div>
          <span className="workspace-card__eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {metrics.length ? (
          <div className="operations-governance-strip__metrics" aria-label="Operations metrics">
            {metrics.map((metric) => (
              <span className={`operations-governance-strip__metric operations-governance-strip__metric--${metric.tone ?? "neutral"}`} key={metric.label}>
                <strong>{metric.value}</strong>
                <small>{metric.label}</small>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <nav className="operations-governance-strip__nav" aria-label="Operations workspace navigation">
        {operationsNav.map((item) => (
          <Link
            aria-current={item.key === current ? "page" : undefined}
            className={`operations-governance-strip__link${item.key === current ? " is-active" : ""}`}
            href={item.href}
            key={item.key}
          >
            <span>{item.label}</span>
            <small>{item.helper}</small>
          </Link>
        ))}
      </nav>
    </section>
  );
}
