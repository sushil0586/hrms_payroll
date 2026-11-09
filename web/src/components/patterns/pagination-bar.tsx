import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  controls?: ReactNode;
  navigationMode?: "document" | "scoped";
  pending?: boolean;
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
  navigationMode?: "document" | "scoped";
  disabled: boolean;
  href?: string;
  label: string;
  onClick?: () => void;
}) {
  if (!disabled && href) {
    if (navigationMode === "document") return <a data-navigation-mode="document" className="button button--secondary" href={href}>{label}</a>;
    if (navigationMode === "scoped" && onClick) return <a data-navigation-mode="local" className="button button--secondary" href={href} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onClick(); }}>{label}</a>;
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
  controls,
  navigationMode,
  pending = false,
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
            <PaginationAction navigationMode={navigationMode} disabled={pending || !hasPrevious} href={firstHref} label="First" onClick={onFirst} />
            <PaginationAction navigationMode={navigationMode} disabled={pending || !hasPrevious} href={previousHref} label="Previous" onClick={onPrevious} />
            <PaginationAction navigationMode={navigationMode} disabled={pending || !hasNext} href={nextHref} label="Next" onClick={onNext} />
            <PaginationAction navigationMode={navigationMode} disabled={pending || !hasNext} href={lastHref} label="Last" onClick={onLast} />
          </div>
        ) : null}
        {controls}
      </div>
    </section>
  );
}
