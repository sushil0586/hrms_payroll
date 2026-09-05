import Link from "next/link";

type Detail = {
  label: string;
  value: string | number;
};

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  details: Detail[];
  className?: string;
  descriptionClassName?: string;
};

export function WorkspaceCard({ eyebrow, title, description, href, cta, details, className, descriptionClassName }: Props) {
  return (
    <article className={`workspace-card${className ? ` ${className}` : ""}`}>
      <div className="workspace-card__header">
        <span className="workspace-card__eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <p className={`section-copy${descriptionClassName ? ` ${descriptionClassName}` : ""}`}>{description}</p>
      <div className="workspace-card__details">
        {details.map((detail) => (
          <div className="workspace-card__detail" key={detail.label}>
            <span className="detail-label">{detail.label}</span>
            <span className="detail-value">{detail.value}</span>
          </div>
        ))}
      </div>
      <Link className="button button--secondary workspace-card__cta" href={href}>
        {cta}
      </Link>
    </article>
  );
}
