type PayrollWorkflowStep = {
  label: string;
  detail: string;
};

export function PayrollWorkflowGuide({
  description,
  steps,
  title,
}: {
  description: string;
  steps: PayrollWorkflowStep[];
  title: string;
}) {
  return (
    <section aria-label={title} className="payroll-cycle-workbench-guide">
      <div>
        <h2>{title}</h2>
        <p className="section-copy section-copy-soft">{description}</p>
      </div>
      <div className="payroll-cycle-workbench-guide__steps">
        {steps.map((step, index) => (
          <div key={step.label}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
