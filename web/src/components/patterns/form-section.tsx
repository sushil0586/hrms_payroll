type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
};

export function FormSection({ title, description, children, fullWidth = false }: Props) {
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
