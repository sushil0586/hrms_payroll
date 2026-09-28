import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotificationTemplates } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminNotificationTemplatesPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const q = (normalizeParam(currentParams.q) ?? "").trim().toLowerCase();
  const status = normalizeParam(currentParams.status) ?? "all";
  const channel = normalizeParam(currentParams.channel) ?? "all";
  const source = normalizeParam(currentParams.source) ?? "all";
  const result = await getHrAdminNotificationTemplates();
  const channelOptions = Array.from(new Set(result.data.map((item) => item.channel))).sort();
  const filteredTemplates = result.data.filter((item) => {
    if (q) {
      const haystack = `${item.name} ${item.code} ${item.channel}`.toLowerCase();
      if (!haystack.includes(q)) {
        return false;
      }
    }
    if (status !== "all" && item.status !== status) {
      return false;
    }
    if (channel !== "all" && item.channel !== channel) {
      return false;
    }
    if (source === "system" && !item.is_system_seeded) {
      return false;
    }
    if (source === "custom" && item.is_system_seeded) {
      return false;
    }
    return true;
  });
  const activeCount = result.data.filter((item) => item.status === "active").length;
  const activeInView = filteredTemplates.filter((item) => item.status === "active").length;
  const seededInView = filteredTemplates.filter((item) => item.is_system_seeded).length;

  return (
    <main className="shell notification-shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live notification mode" : "Demo notification mode"}
        title="Notification templates"
        description="Manage channel-specific message templates for operational alerts and user updates without drifting away from the shared admin design system."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/notification-templates/new">
              Create template
            </Link>
            <Link className="button button--secondary" href="/hr-admin/notifications-admin">
              Back to notifications
            </Link>
          </>
        }
        pills={["Channel-aware content", "Metadata-ready templates", "System and custom template mix"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Total templates" value={result.data.length} trend="Content library" />
          <MetricTile label="Matching templates" value={filteredTemplates.length} trend="Current filtered view" />
          <MetricTile label="Active templates" value={activeCount} trend="Ready for delivery" />
          <MetricTile label="Active in view" value={activeInView} trend="Filtered coverage" />
          <MetricTile label="System seeded in view" value={seededInView} trend="Baseline coverage slice" />
        </div>
      </section>

      <section className="section">
        <section className="card panel queue-toolbar panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Template filters</h2>
              <p className="section-copy section-copy-soft">
                Narrow the template library by channel, status, and source so diagnostics links land in a focused view.
              </p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip"><strong>{filteredTemplates.length}</strong> matching</span>
              <span className="queue-summary-chip"><strong>{activeInView}</strong> active in view</span>
              <span className="queue-summary-chip"><strong>{seededInView}</strong> system seeded</span>
            </div>
          </div>

          <form className="queue-toolbar__grid" method="get">
            <label className="form-field">
              <span className="muted">Search</span>
              <input className="input-control" defaultValue={normalizeParam(currentParams.q) ?? ""} name="q" placeholder="Template name or code" />
            </label>
            <label className="form-field">
              <span className="muted">Status</span>
              <select className="input-control" defaultValue={status} name="status">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Channel</span>
              <select className="input-control" defaultValue={channel} name="channel">
                <option value="all">All channels</option>
                {channelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Source</span>
              <select className="input-control" defaultValue={source} name="source">
                <option value="all">System and custom</option>
                <option value="system">System seeded</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <div className="queue-toolbar__actions">
              <button className="button button--primary" type="submit">
                Apply filters
              </button>
              <Link className="button button--ghost" href="/hr-admin/notification-templates">
                Clear filters
              </Link>
            </div>
          </form>
        </section>
      </section>

      <section className="section">
        <div className="card panel panel-card-soft notification-catalog-panel">
          <div className="section-header-row">
            <div>
              <h2 className="section-heading-soft">Template catalog</h2>
              <p className="section-copy-soft">Edit content or jump to matching queue activity from one compact register.</p>
            </div>
            <span className="queue-summary-chip">
              <strong>{filteredTemplates.length}</strong> shown
            </span>
          </div>
          {filteredTemplates.length ? (
            <div className="notification-table-scroll">
              <table className="notification-catalog-table">
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Template">
                        <strong>{item.name}</strong>
                        <span>{item.code}</span>
                      </td>
                      <td data-label="Channel">
                        <span className="record-chip record-chip--accent">{item.channel}</span>
                      </td>
                      <td data-label="Status">
                        <span className={`record-chip${item.status === "active" ? "" : " record-chip--accent"}`}>{item.status}</span>
                      </td>
                      <td data-label="Source">{item.is_system_seeded ? "System seeded" : "Custom"}</td>
                      <td data-label="Actions">
                        <div className="notification-row-actions">
                          <Link className="button button--secondary" href={`/hr-admin/notification-templates/${item.id}/edit`}>
                            Edit
                          </Link>
                          <Link className="button button--ghost" href={`/hr-admin/notifications?channel=${encodeURIComponent(item.channel)}`}>
                            Queue
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {filteredTemplates.length === 0 ? (
            <div className="card panel panel-card-soft">
              <strong>No templates match the current filters.</strong>
              <p className="muted">Try clearing one or more filters to widen the template catalog view.</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
