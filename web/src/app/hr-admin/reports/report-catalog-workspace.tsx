"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { reportCategories, type ReportCatalogItem } from "@/lib/report-catalog";

const PAGE_SIZE = 5;

function statusClass(status: ReportCatalogItem["status"]) {
  if (status === "Ready") return "record-chip record-chip--success";
  if (status === "Provider gated") return "record-chip record-chip--warning";
  return "record-chip";
}

export function ReportCatalogWorkspace({ reports }: { reports: ReportCatalogItem[] }) {
  const [category, setCategory] = useState<(typeof reportCategories)[number]>("All");
  const [persona, setPersona] = useState("All");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const personas = useMemo(() => ["All", ...Array.from(new Set(reports.map((report) => report.primaryPersona))).sort()], [reports]);
  const statuses = useMemo(() => ["All", ...Array.from(new Set(reports.map((report) => report.status))).sort()], [reports]);

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesCategory = category === "All" || report.category === category;
      const matchesPersona = persona === "All" || report.primaryPersona === persona;
      const matchesStatus = status === "All" || report.status === status;
      const matchesQuery =
        !normalizedQuery ||
        [report.title, report.key, report.description, report.primaryPersona, report.category, ...report.filters]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesPersona && matchesStatus && matchesQuery;
    });
  }, [category, persona, query, reports, status]);

  const pageCount = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleReports = filteredReports.slice(firstIndex, firstIndex + PAGE_SIZE);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section" aria-label="Report catalog workspace">
      <div className="report-catalog-workspace" data-testid="report-catalog-workspace">
        <div className="report-catalog-toolbar" aria-label="Report catalog filters">
          <label>
            <span>Search reports</span>
            <input
              className="input-control"
              type="search"
              value={query}
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
              placeholder="Search by report, field, or owner"
            />
          </label>
          <label>
            <span>Owner role</span>
            <select className="input-control" value={persona} onChange={(event) => updateFilter(() => setPersona(event.target.value))}>
              {personas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select className="input-control" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="report-category-tabs" role="tablist" aria-label="Report categories">
          {reportCategories.map((item) => {
            const selected = item === category;
            return (
              <button
                className="report-category-tab"
                type="button"
                role="tab"
                aria-selected={selected}
                key={item}
                onClick={() => updateFilter(() => setCategory(item))}
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip">
            <strong>{filteredReports.length}</strong> reports
          </span>
          <span className="queue-summary-chip">
            <strong>{reports.filter((report) => report.status === "Ready").length}</strong> ready
          </span>
          <span className="queue-summary-chip">
            <strong>{currentPage}</strong> of {pageCount} pages
          </span>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table">
            <thead>
              <tr>
                <th scope="col">Report</th>
                <th scope="col">Owner</th>
                <th scope="col">Filters</th>
                <th scope="col">Exports</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleReports.map((report) => (
                <tr key={report.key}>
                  <td>
                    <strong>{report.title}</strong>
                    <span>{report.description}</span>
                    <code>{report.key}</code>
                  </td>
                  <td>{report.primaryPersona}</td>
                  <td>{report.filters.join(", ")}</td>
                  <td>{report.exports.join(", ")}</td>
                  <td>
                    <span className={statusClass(report.status)}>{report.status}</span>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      {report.route ? (
                        <Link className="button button--secondary" href={report.route}>
                          Open
                        </Link>
                      ) : null}
                      {report.exportRoute ? (
                        <Link className="button button--ghost" href={report.exportRoute} prefetch={false}>
                          Export
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleReports.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">No reports match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Report catalog pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </button>
          <span>
            Showing {filteredReports.length === 0 ? 0 : firstIndex + 1}-{Math.min(firstIndex + PAGE_SIZE, filteredReports.length)} of {filteredReports.length}
          </span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
