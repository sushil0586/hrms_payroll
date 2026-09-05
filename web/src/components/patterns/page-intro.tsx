type Props = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  pills?: string[];
  showPills?: boolean;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  pillsClassName?: string;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  pills,
  showPills = false,
  className,
  titleClassName,
  descriptionClassName,
  pillsClassName,
}: Props) {
  return (
    <section
      className={`page-intro page-intro--compact${className ? ` ${className}` : ""}`}
    >
      <div className="page-intro__meta">
        <span className="page-intro__eyebrow">{eyebrow}</span>
        <div className="page-intro__headline">
          <h1 className={`page-intro__title${titleClassName ? ` ${titleClassName}` : ""}`}>{title}</h1>
          {actions ? <div className="page-intro__actions">{actions}</div> : null}
        </div>
        <p className={`page-intro__description${descriptionClassName ? ` ${descriptionClassName}` : ""}`}>{description}</p>
      </div>
      {showPills && pills?.length ? (
        <div className={`page-intro__stats${pillsClassName ? ` ${pillsClassName}` : ""}`}>
          {pills.map((pill) => (
            <span className="pill pill--neutral" key={pill}>
              {pill}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
