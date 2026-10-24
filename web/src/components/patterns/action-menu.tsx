import Link from "next/link";

type ActionMenuItem = {
  href: string;
  title: string;
  description: string;
};

type Props = {
  label: string;
  items: ActionMenuItem[];
  documentNavigation?: boolean;
};

export function ActionMenu({ label, items, documentNavigation = false }: Props) {
  return (
    <details className="action-menu">
      <summary className="button button--secondary action-menu__trigger">{label}</summary>
      <div className="action-menu__panel">
        {items.map((item) => documentNavigation ? (
          <a className="action-menu__item" data-navigation-mode="document" href={item.href} key={item.href}>
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </a>
        ) : (
          <Link className="action-menu__item" href={item.href} key={item.href}>
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}
