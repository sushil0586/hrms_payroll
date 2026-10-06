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

const NAV_ITEMS: Array<{ activeKeys: ReportInsightsArea[]; label: string; href: string; description: string }> = [
  {
    activeKeys: ["catalog"],
    label: "Catalog",
    href: "/hr-admin/reports",
    description: "Search every report",
  },
  {
    activeKeys: ["workforce", "lifecycle"],
    label: "HR Core",
    href: "/hr-admin/reports/hr-core",
    description: "Workforce, documents, lifecycle",
  },
  {
    activeKeys: ["time"],
    label: "Attendance",
    href: "/hr-admin/reports/attendance",
    description: "Time, leave, exceptions",
  },
  {
    activeKeys: ["payroll"],
    label: "Payroll",
    href: "/hr-admin/reports/payroll",
    description: "Finance, variance, handoff",
  },
  {
    activeKeys: ["compliance"],
    label: "Compliance",
    href: "/hr-admin/reports/compliance",
    description: "Statutory and filings",
  },
  {
    activeKeys: ["delivery"],
    label: "Audit & exports",
    href: "/hr-admin/reports/export-audits",
    description: "Download evidence",
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
        {NAV_ITEMS.map((item) => {
          const active = item.activeKeys.includes(current);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`report-insights-strip__link${active ? " is-active" : ""}`}
              href={item.href}
              key={item.href}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
