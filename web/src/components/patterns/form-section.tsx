type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summaryMeta?: React.ReactNode;
};

export function FormSection({ title, description, children, fullWidth = false, collapsible = false, defaultOpen = true, summaryMeta }: Props) {
  if (collapsible) {
    return (
      <details className={`form-section-card form-section-card--collapsible${fullWidth ? " form-section-card--full" : ""}`} open={defaultOpen}>
        <summary className="form-section-card__summary">
          <span>
            <h2 className="section-heading-soft">{title}</h2>
            {description ? <p className="section-copy section-copy-soft">{description}</p> : null}
          </span>
          {summaryMeta ? <span className="form-section-card__summary-meta">{summaryMeta}</span> : null}
        </summary>
        <div className="form-section-card__body">
          {children}
        </div>
      </details>
    );
  }

  return (
    <section className={`form-section-card${fullWidth ? " form-section-card--full" : ""}`}>
      <div className="form-section-card__header">
        <h2 className="section-heading-soft">{title}</h2>
        {description ? <p className="section-copy section-copy-soft">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
