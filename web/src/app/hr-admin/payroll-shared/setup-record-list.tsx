"use client";

const SETUP_RECORD_PAGE_SIZE = 5;

export function SetupRecordList<Item extends { id: string }>({
  activeId,
  emptyLabel,
  items,
  label,
  onPageChange,
  onSelect,
  page,
  renderPrimary,
  renderSecondary,
}: {
  activeId?: string;
  emptyLabel: string;
  items: Item[];
  label: string;
  onPageChange: (page: number) => void;
  onSelect: (item: Item) => void;
  page: number;
  renderPrimary: (item: Item) => string;
  renderSecondary: (item: Item) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / SETUP_RECORD_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * SETUP_RECORD_PAGE_SIZE;
  const visibleItems = items.slice(start, start + SETUP_RECORD_PAGE_SIZE);

  return (
    <section className="salary-crud-record-list" aria-label={label}>
      <div className="salary-crud-list__header">
        <div>
          <strong>Saved records</strong>
          <span>{items.length ? `${start + 1}-${start + visibleItems.length} of ${items.length}` : emptyLabel}</span>
        </div>
      </div>

      <div className="salary-crud-list" aria-label={label}>
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <button
              aria-pressed={activeId === item.id}
              className={`salary-crud-record${activeId === item.id ? " salary-crud-record--selected" : ""}`}
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
            >
              <strong>{renderPrimary(item)}</strong>
              <span>{renderSecondary(item)}</span>
            </button>
          ))
        ) : (
          <div className="salary-crud-list__empty">{emptyLabel}</div>
        )}
      </div>

      <div className="salary-crud-list__pager" aria-label={`${label} pagination`}>
        <button
          className="button button--secondary button--compact"
          disabled={currentPage === 1}
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="button button--secondary button--compact"
          disabled={currentPage === totalPages}
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
