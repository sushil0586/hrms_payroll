import Link from "next/link";

type ReportInsightsArea =
  | "catalog"
  | "workforce"
  | "payroll"
  | "time"
  | "lifecycle"
  | "compliance"
  | "delivery";

type ReportInsightsMetric = {
  label: string;
  value: string | number;
  tone?: "ready" | "warning" | "blocked" | "neutral";
};

type Props = {
  current: ReportInsightsArea;
  eyebrow?: string;
  title: string;
  description: string;
  metrics?: ReportInsightsMetric[];
};

const NAV_ITEMS: Array<{ key: ReportInsightsArea; label: string; href: string; description: string }> = [
  {
    key: "catalog",
    label: "Catalog",
    href: "/hr-admin/reports",
    description: "Find, filter, export, and audit reports",
  },
  {
    key: "workforce",
    label: "Workforce",
    href: "/hr-admin/reports/workforce",
    description: "Employees, documents, lifecycle, and organization state",
  },
  {
    key: "time",
    label: "Time & leave",
    href: "/hr-admin/reports/attendance-register",
    description: "Attendance, exceptions, and leave balances",
  },
  {
    key: "payroll",
    label: "Payroll",
    href: "/hr-admin/reports/payroll-register",
    description: "Payroll register, outputs, variances, and settlements",
  },
  {
    key: "compliance",
    label: "Compliance",
    href: "/hr-admin/reports/compliance",
    description: "Statutory, filings, provider receipts, and manifests",
  },
  {
    key: "delivery",
    label: "Audit & exports",
    href: "/hr-admin/reports/export-audits",
    description: "Download history, manifests, checksums, and traceability",
  },
];

export function ReportInsightsStrip({
  current,
  eyebrow = "Report control",
  title,
  description,
  metrics = [],
}: Props) {
  return (
    <section className="report-insights-strip" aria-label="Report insights control">
      <div className="report-insights-strip__summary">
        <div>
          <span className="workspace-card__eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {metrics.length ? (
          <div className="report-insights-strip__metrics" aria-label="Report metrics">
            {metrics.slice(0, 4).map((metric) => (
              <span className={`report-insights-strip__metric report-insights-strip__metric--${metric.tone ?? "neutral"}`} key={metric.label}>
                <strong>{metric.value}</strong>
                <small>{metric.label}</small>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <nav className="report-insights-strip__nav" aria-label="Report workspace navigation">
        {NAV_ITEMS.map((item) => (
          <Link
            aria-current={item.key === current ? "page" : undefined}
            className={`report-insights-strip__link${item.key === current ? " is-active" : ""}`}
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
