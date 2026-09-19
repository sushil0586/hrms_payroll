import Link from "next/link";

type PayrollCycleStepKey = "readiness" | "inputs" | "calculations" | "review" | "outputs" | "handoff";

type PayrollCycleJourneyProps = {
  current: PayrollCycleStepKey;
  selectedRunName?: string | null;
  selectedRunStatus?: string | null;
  primaryMetricLabel?: string;
  primaryMetricValue?: string | number;
  secondaryMetricLabel?: string;
  secondaryMetricValue?: string | number;
};

const payrollCycleSteps: Array<{
  key: PayrollCycleStepKey;
  label: string;
  href: string;
  description: string;
}> = [
  {
    key: "readiness",
    label: "Readiness",
    href: "/hr-admin/payroll-readiness",
    description: "Source data and profile coverage",
  },
  {
    key: "inputs",
    label: "Inputs",
    href: "/hr-admin/payroll-inputs",
    description: "Immutable employee snapshots",
  },
  {
    key: "calculations",
    label: "Calculation",
    href: "/hr-admin/payroll-calculations",
    description: "Draft payroll and validations",
  },
  {
    key: "review",
    label: "Review",
    href: "/hr-admin/payroll-review",
    description: "Exceptions, approval, final lock",
  },
  {
    key: "outputs",
    label: "Outputs",
    href: "/hr-admin/payroll-outputs",
    description: "Payslips, registers, publication",
  },
  {
    key: "handoff",
    label: "Handoff",
    href: "/hr-admin/payroll-handoff",
    description: "Finance delivery and evidence",
  },
];

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function PayrollCycleJourney({
  current,
  selectedRunName,
  selectedRunStatus,
  primaryMetricLabel,
  primaryMetricValue,
  secondaryMetricLabel,
  secondaryMetricValue,
}: PayrollCycleJourneyProps) {
  const currentIndex = payrollCycleSteps.findIndex((step) => step.key === current);
  const nextStep = payrollCycleSteps[currentIndex + 1] ?? null;

  return (
    <section className="section section--tight payroll-cycle-journey" aria-label="Payroll cycle journey">
      <div className="payroll-cycle-journey__context panel-card-soft">
        <div>
          <span className="eyebrow-soft">Payroll cycle</span>
          <h2 className="section-heading-soft">{selectedRunName || "Current payroll operation"}</h2>
          <p className="section-copy section-copy-soft">
            {selectedRunStatus ? `Run status: ${titleCase(selectedRunStatus)}.` : "Follow the cycle from readiness through finance handoff."}
          </p>
        </div>
        <div className="payroll-cycle-journey__metrics">
          {primaryMetricLabel ? (
            <span>
              <strong>{primaryMetricValue ?? "0"}</strong>
              {primaryMetricLabel}
            </span>
          ) : null}
          {secondaryMetricLabel ? (
            <span>
              <strong>{secondaryMetricValue ?? "0"}</strong>
              {secondaryMetricLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="payroll-cycle-journey__steps panel-card-soft">
        {payrollCycleSteps.map((step, index) => {
          const isCurrent = step.key === current;
          const isComplete = currentIndex > index;
          return (
            <Link
              aria-current={isCurrent ? "page" : undefined}
              className={`payroll-cycle-step${isCurrent ? " payroll-cycle-step--current" : ""}${isComplete ? " payroll-cycle-step--complete" : ""}`}
              href={step.href}
              key={step.key}
            >
              <span className="payroll-cycle-step__index">{index + 1}</span>
              <span>
                <strong>{step.label}</strong>
                <em>{step.description}</em>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="payroll-cycle-journey__next panel-card-soft">
        <span className="eyebrow-soft">Next action</span>
        {nextStep ? (
          <>
            <strong>{nextStep.label}</strong>
            <p>{nextStep.description}</p>
            <Link className="button button--secondary" href={nextStep.href}>
              Open {nextStep.label}
            </Link>
          </>
        ) : (
          <>
            <strong>Cycle evidence</strong>
            <p>Finance handoff is the final operating step. Keep delivery evidence and audit packs complete.</p>
            <Link className="button button--secondary" href="/hr-admin/reports/export-audits">
              Audit exports
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
