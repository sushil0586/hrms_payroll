import Link from "next/link";

type Props = {
  navigationMode?: "document";
  page: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onFirst?: () => void;
  onLast?: () => void;
  firstHref?: string;
  previousHref?: string;
  nextHref?: string;
  lastHref?: string;
};

function PaginationAction({
  disabled,
  href,
  label,
  onClick,
  navigationMode,
}: {
  navigationMode?: "document";
  disabled: boolean;
  href?: string;
  label: string;
  onClick?: () => void;
}) {
  if (!disabled && href) {
    if (navigationMode === "document") return <a data-navigation-mode="document" className="button button--secondary" href={href}>{label}</a>;
    return (
      <Link className="button button--secondary" href={href}>
        {label}
      </Link>
    );
  }

  return (
    <button className="button button--secondary" disabled={disabled} onClick={onClick} type="button">
      {label}
    </button>
  );
}

export function PaginationBar({
  navigationMode,
  page,
  pageSize,
  totalCount,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onFirst,
  onLast,
  firstHref,
  previousHref,
  nextHref,
  lastHref,
}: Props) {
  const safePageSize = Math.max(pageSize, 1);
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const start = totalCount === 0 ? 0 : ((page - 1) * safePageSize) + 1;
  const end = totalCount === 0 ? 0 : Math.min(page * safePageSize, totalCount);

  return (
    <section className="card panel pagination-panel">
      <div className="pagination-bar">
        <div className="pagination-bar__summary">
          <span className="queue-summary-chip">
            <strong>
              {start}-{end}
            </strong>
            of {totalCount} records
          </span>
          <span className="queue-summary-chip">
            <strong>Page {page}</strong>
            of {totalPages}
          </span>
        </div>
        {totalPages > 1 ? (
          <div className="pagination-bar__actions">
            <PaginationAction navigationMode={navigationMode} disabled={!hasPrevious} href={firstHref} label="First" onClick={onFirst} />
            <PaginationAction navigationMode={navigationMode} disabled={!hasPrevious} href={previousHref} label="Previous" onClick={onPrevious} />
            <PaginationAction navigationMode={navigationMode} disabled={!hasNext} href={nextHref} label="Next" onClick={onNext} />
            <PaginationAction navigationMode={navigationMode} disabled={!hasNext} href={lastHref} label="Last" onClick={onLast} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
