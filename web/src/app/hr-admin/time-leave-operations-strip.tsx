import Link from "next/link";

type TimeLeaveArea = "overview" | "records" | "regularizations" | "balances" | "policies" | "assignments" | "shifts";

type TimeLeaveOperationsStripProps = {
  current: TimeLeaveArea;
  title: string;
  description: string;
  primaryMetricLabel?: string;
  primaryMetricValue?: string | number;
  secondaryMetricLabel?: string;
  secondaryMetricValue?: string | number;
};

const timeLeaveLinks: Array<{
  key: TimeLeaveArea;
  label: string;
  href: string;
  helper: string;
}> = [
  {
    key: "overview",
    label: "Operations",
    href: "/hr-admin/attendance-operations",
    helper: "Daily control center",
  },
  {
    key: "records",
    label: "Records",
    href: "/hr-admin/attendance-records",
    helper: "Attendance rows",
  },
  {
    key: "regularizations",
    label: "Regularizations",
    href: "/hr-admin/attendance-regularizations",
    helper: "Correction queue",
  },
  {
    key: "balances",
    label: "Balances",
    href: "/hr-admin/leave-balances",
    helper: "Leave ledgers",
  },
  {
    key: "policies",
    label: "Policies",
    href: "/hr-admin/leave-policies",
    helper: "Configuration",
  },
  {
    key: "assignments",
    label: "Assignments",
    href: "/hr-admin/leave-policy-assignments",
    helper: "Effective scope",
  },
  {
    key: "shifts",
    label: "Shifts",
    href: "/hr-admin/shifts",
    helper: "Working windows",
  },
];

export function TimeLeaveOperationsStrip({
  current,
  title,
  description,
  primaryMetricLabel,
  primaryMetricValue,
  secondaryMetricLabel,
  secondaryMetricValue,
}: TimeLeaveOperationsStripProps) {
  return (
    <section className="section section--tight time-leave-strip" aria-label="Time and leave operations">
      <div className="time-leave-strip__summary panel-card-soft">
        <div>
          <span className="eyebrow-soft">Time & Leave</span>
          <h2 className="section-heading-soft">{title}</h2>
          <p className="section-copy section-copy-soft">{description}</p>
        </div>
        <div className="time-leave-strip__metrics">
          {primaryMetricLabel ? (
            <span>
              <strong>{primaryMetricValue ?? 0}</strong>
              {primaryMetricLabel}
            </span>
          ) : null}
          {secondaryMetricLabel ? (
            <span>
              <strong>{secondaryMetricValue ?? 0}</strong>
              {secondaryMetricLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="time-leave-strip__nav panel-card-soft">
        {timeLeaveLinks.map((item) => (
          <Link
            aria-current={item.key === current ? "page" : undefined}
            className={`time-leave-strip__link${item.key === current ? " time-leave-strip__link--active" : ""}`}
            href={item.href}
            key={item.key}
          >
            <strong>{item.label}</strong>
            <span>{item.helper}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
