import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantAdminTrustAuditReview } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePositiveNumber(value: SearchParamValue, fallback: number, max: number) {
  const parsed = Number(normalizeParam(value) || String(fallback));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function queryFor(params: Record<string, string | number>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

function shortHash(value: string) {
  return value ? value.slice(0, 10) : "pending";
}

export default async function TenantAdminTrustAuditPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const eventGroup = normalizeParam(currentParams.event_group) || "all";
  const eventType = normalizeParam(currentParams.event_type) || "";
  const actor = normalizeParam(currentParams.actor) || "";
  const sourceRef = normalizeParam(currentParams.source_ref) || "";
  const supportSessionRef = normalizeParam(currentParams.support_session_ref) || "";
  const page = normalizePositiveNumber(currentParams.page, 1, 10_000);
  const pageSize = normalizePositiveNumber(currentParams.page_size, 12, 50);
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["tenant.audit.view", "tenant.audit.export"],
    workspace: "tenant_admin",
    fallbackPath: "/tenant-admin",
  });
  const result = await getTenantAdminTrustAuditReview({
    event_group: eventGroup,
    event_type: eventType,
    actor,
    source_ref: sourceRef,
    support_session_ref: supportSessionRef,
    page,
    page_size: pageSize,
  });
  const data = result.data;
  const canExportAudit = sessionHasPermission(sessionUser, "tenant.audit.export");
  const basePageQuery = {
    event_group: data.filters.event_group,
    event_type: data.filters.event_type,
    actor: data.filters.actor,
    source_ref: data.filters.source_ref,
    support_session_ref: data.filters.support_session_ref,
    page_size: data.page_size,
  };
  const totalPages = Math.max(1, Math.ceil(data.total_count / Math.max(data.page_size, 1)));
  const activeFilters = [
    data.filters.event_group !== "all" ? `Group: ${titleCase(data.filters.event_group)}` : "",
    data.filters.event_type ? `Event: ${titleCase(data.filters.event_type)}` : "",
    data.filters.actor ? `Actor: ${data.filters.actor}` : "",
    data.filters.source_ref ? `Source: ${data.filters.source_ref}` : "",
    data.filters.support_session_ref ? `Session: ${data.filters.support_session_ref}` : "",
  ].filter(Boolean);

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live tenant trust" : "Demo tenant trust"}
        title="Tenant Trust Audit"
        description="Customer-visible commercial, tenant-admin, and support-access evidence."
        actions={
          <>
            {canExportAudit ? (
              <a className="button button--primary" href="/api/tenant-admin/commercial-support-audit/download">
                Download audit
              </a>
            ) : null}
            <Link className="button button--secondary" href="/tenant-admin">
              Console
            </Link>
          </>
        }
        pills={[data.tenant.code, data.profile_source, `${data.summary.total_event_count} events`]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Visible events" value={data.summary.visible_event_count} trend={`${data.summary.total_event_count} matching`} />
          <MetricTile label="Event types" value={data.summary.event_type_count} trend={`${data.summary.configured_group_count} groups`} />
          <MetricTile label="Sources" value={data.summary.source_ref_count} trend={data.profile_source} />
          <MetricTile label="Support sessions" value={data.summary.support_session_count} trend={data.filters.support_session_ref || "All sessions"} />
        </div>
      </section>

      <section className="section tenant-audit-filter-workspace">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Event groups</span>
              <h2>Review scope</h2>
            </div>
            <span className="record-chip">{data.options.event_groups.length} groups</span>
          </div>
          <div className="support-session-scopes">
            {data.options.event_groups.map((group) => (
              <Link
                className="record-chip"
                href={`/tenant-admin/trust-audit?${queryFor({ event_group: group.group_ref, support_session_ref: supportSessionRef })}`}
                key={group.group_ref}
              >
                {group.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Active filters</span>
              <h2>{activeFilters.length ? `${activeFilters.length} applied` : "All evidence"}</h2>
            </div>
            <Link className="record-chip" href="/tenant-admin/trust-audit">
              Clear
            </Link>
          </div>
          <div className="support-session-scopes">
            {activeFilters.length ? (
              activeFilters.map((filter) => (
                <span className="record-chip" key={filter}>
                  {filter}
                </span>
              ))
            ) : (
              <span className="record-chip">No filters</span>
            )}
          </div>
        </div>
      </section>

      <section className="section tenant-audit-filter-workspace">
        <div className="panel-card-soft tenant-console-panel tenant-audit-ledger">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Event types</span>
              <h2>Audit taxonomy</h2>
            </div>
            <span className="record-chip">{data.options.event_types.length} types</span>
          </div>
          <div className="support-session-scopes">
            {data.options.event_types.slice(0, 10).map((type) => (
              <Link
                className="record-chip"
                href={`/tenant-admin/trust-audit?${queryFor({ event_group: eventGroup, event_type: type, support_session_ref: supportSessionRef })}`}
                key={type}
              >
                {titleCase(type)}
              </Link>
            ))}
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Support sessions</span>
              <h2>Session evidence</h2>
            </div>
            <span className="record-chip">{data.options.support_session_refs.length} sessions</span>
          </div>
          <div className="support-session-scopes">
            {data.options.support_session_refs.length ? (
              data.options.support_session_refs.map((sessionRef) => (
                <Link
                  className="record-chip"
                  href={`/tenant-admin/trust-audit?${queryFor({ event_group: "support", support_session_ref: sessionRef })}`}
                  key={sessionRef}
                >
                  {sessionRef}
                </Link>
              ))
            ) : (
              <span className="record-chip">No support sessions</span>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Audit events</span>
              <h2>Evidence ledger</h2>
            </div>
            <span className="record-chip">Page {data.page}</span>
          </div>
          <div className="tenant-console-list">
            {data.events.map((event) => (
              <div className="tenant-console-row" key={event.id}>
                <div>
                  <strong>{titleCase(event.event_type)}</strong>
                  <span>{event.source_ref}</span>
                  <span>{event.support_session_ref ? `Session ${event.support_session_ref}` : event.event_group_refs.map(titleCase).join(" / ")}</span>
                </div>
                <div className="tenant-console-row__meta">
                  <span>{event.actor_identifier || "system"}</span>
                  <span>{formatDateTime(event.occurred_at)}</span>
                  <span>{shortHash(event.source_hash)}</span>
                </div>
              </div>
            ))}
            {!data.events.length ? (
              <p className="tenant-console-empty">No audit events match the selected trust filters.</p>
            ) : null}
          </div>
          <div aria-label="Trust audit pagination" className="pagination-bar">
            <div className="pagination-bar__summary">
              <span className="queue-summary-chip">
                <strong>
                  {data.total_count === 0 ? 0 : (data.page - 1) * data.page_size + 1}-{data.total_count === 0 ? 0 : Math.min(data.page * data.page_size, data.total_count)}
                </strong>
                of {data.total_count}
              </span>
              <span className="queue-summary-chip">
                <strong>Page {data.page}</strong>
                of {totalPages}
              </span>
            </div>
            <div className="pagination-bar__actions">
              <Link
                aria-disabled={!data.has_previous}
                className="button button--secondary"
                href={data.has_previous ? `/tenant-admin/trust-audit?${queryFor({ ...basePageQuery, page: 1 })}` : `/tenant-admin/trust-audit?${queryFor({ ...basePageQuery, page: data.page })}`}
              >
                First
              </Link>
              <Link
                aria-disabled={!data.has_previous}
                className="button button--secondary"
                href={data.has_previous ? `/tenant-admin/trust-audit?${queryFor({ ...basePageQuery, page: data.page - 1 })}` : `/tenant-admin/trust-audit?${queryFor({ ...basePageQuery, page: data.page })}`}
              >
                Previous
              </Link>
              <Link
                aria-disabled={!data.has_next}
                className="button button--secondary"
                href={data.has_next ? `/tenant-admin/trust-audit?${queryFor({ ...basePageQuery, page: data.page + 1 })}` : `/tenant-admin/trust-audit?${queryFor({ ...basePageQuery, page: data.page })}`}
              >
                Next
              </Link>
              <Link
                aria-disabled={!data.has_next}
                className="button button--secondary"
                href={data.has_next ? `/tenant-admin/trust-audit?${queryFor({ ...basePageQuery, page: totalPages })}` : `/tenant-admin/trust-audit?${queryFor({ ...basePageQuery, page: data.page })}`}
              >
                Last
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
