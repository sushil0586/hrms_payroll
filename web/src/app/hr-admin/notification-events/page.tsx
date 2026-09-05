import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotificationEvents } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminNotificationEventsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const q = (normalizeParam(currentParams.q) ?? "").trim().toLowerCase();
  const moduleFilter = normalizeParam(currentParams.module) ?? "all";
  const channelFilter = normalizeParam(currentParams.channel) ?? "all";
  const activeFilter = normalizeParam(currentParams.active) ?? "all";
  const templateMode = normalizeParam(currentParams.template_mode) ?? "all";
  const result = await getHrAdminNotificationEvents();
  const activeCount = result.data.filter((item) => item.is_active).length;
  const templatedCount = result.data.filter((item) => item.template_name).length;
  const documentEventCount = result.data.filter((item) => item.module === "documents" || item.trigger_key.includes("document")).length;
  const lifecycleEventCount = result.data.filter((item) => item.module === "lifecycle").length;
  const moduleOptions = Array.from(new Set(result.data.map((item) => item.module))).sort();
  const channelOptions = Array.from(new Set(result.data.map((item) => item.channel))).sort();
  const filteredEvents = result.data.filter((item) => {
    if (q) {
      const haystack = `${item.name} ${item.code} ${item.trigger_key} ${item.module} ${item.channel}`.toLowerCase();
      if (!haystack.includes(q)) {
        return false;
      }
    }
    if (moduleFilter !== "all" && item.module !== moduleFilter) {
      return false;
    }
    if (channelFilter !== "all" && item.channel !== channelFilter) {
      return false;
    }
    if (activeFilter === "active" && !item.is_active) {
      return false;
    }
    if (activeFilter === "inactive" && item.is_active) {
      return false;
    }
    if (templateMode === "templated" && !item.template_name) {
      return false;
    }
    if (templateMode === "direct" && item.template_name) {
      return false;
    }
    return true;
  });
  const activeInView = filteredEvents.filter((item) => item.is_active).length;
  const templatedInView = filteredEvents.filter((item) => item.template_name).length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live notification mode" : "Demo notification mode"}
        title="Notification events"
        description="Map operational triggers to audiences, templates, priorities, and channel delivery rules in a way that feels explicit and easy to audit."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/notification-events/new">
              Create event
            </Link>
            <Link className="button button--secondary" href="/hr-admin/notifications-admin">
              Back to notifications
            </Link>
          </>
        }
        pills={["Trigger-driven routing", "Template-linked delivery", "Priority-aware automation"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Total events" value={result.data.length} trend="Configured triggers" />
          <MetricTile label="Matching events" value={filteredEvents.length} trend="Current filtered view" />
          <MetricTile label="Active events" value={activeCount} trend="Currently routing" />
          <MetricTile label="Active in view" value={activeInView} trend="Filtered routing coverage" />
          <MetricTile label="Document events" value={documentEventCount} trend="Expiry and onboarding coverage" />
          <MetricTile label="Lifecycle events" value={lifecycleEventCount} trend="Operational workflow routing" />
          <MetricTile label="Templated in view" value={templatedInView} trend={`${templatedCount} templated overall`} />
        </div>
      </section>

      <section className="section">
        <section className="card panel queue-toolbar panel-card-soft">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Event filters</h2>
              <p className="section-copy section-copy-soft">
                Focus on trigger rules by module, channel, activity state, and template usage when diagnostics point to a specific catalog slice.
              </p>
            </div>
            <div className="queue-toolbar__meta">
              <span className="queue-summary-chip"><strong>{filteredEvents.length}</strong> matching</span>
              <span className="queue-summary-chip"><strong>{activeInView}</strong> active in view</span>
              <span className="queue-summary-chip"><strong>{templatedInView}</strong> templated</span>
            </div>
          </div>

          <form className="queue-toolbar__grid" method="get">
            <label className="form-field">
              <span className="muted">Search</span>
              <input className="input-control" defaultValue={normalizeParam(currentParams.q) ?? ""} name="q" placeholder="Event name, code, or trigger key" />
            </label>
            <label className="form-field">
              <span className="muted">Module</span>
              <select className="input-control" defaultValue={moduleFilter} name="module">
                <option value="all">All modules</option>
                {moduleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Channel</span>
              <select className="input-control" defaultValue={channelFilter} name="channel">
                <option value="all">All channels</option>
                {channelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Activity</span>
              <select className="input-control" defaultValue={activeFilter} name="active">
                <option value="all">Active and inactive</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Template mode</span>
              <select className="input-control" defaultValue={templateMode} name="template_mode">
                <option value="all">Templated and direct</option>
                <option value="templated">Template linked</option>
                <option value="direct">Direct content</option>
              </select>
            </label>
            <div className="queue-toolbar__actions">
              <button className="button button--primary" type="submit">
                Apply filters
              </button>
              <Link className="button button--ghost" href="/hr-admin/notification-events">
                Clear filters
              </Link>
            </div>
          </form>
        </section>
      </section>

      <section className="section queue-layout">
        <div className="queue-list">
          {filteredEvents.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <h2>{item.name}</h2>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className="record-chip record-chip--accent">{item.module}</span>
                    <span className="record-chip">{item.channel}</span>
                    <span className="record-chip">{item.priority}</span>
                    <span className="record-chip">{item.is_active ? "active" : "inactive"}</span>
                    {item.trigger_key.includes("document") ? <span className="record-chip record-chip--danger">Document attention</span> : null}
                  </div>
                  <p className="section-copy">{item.trigger_key}</p>
                </div>
                <div className="record-card__actions">
                  <Link className="button button--secondary" href={`/hr-admin/notification-events/${item.id}/edit`}>
                    Edit
                  </Link>
                  <Link
                    className="button button--ghost"
                    href={`/hr-admin/notifications?module=${encodeURIComponent(item.module)}&channel=${encodeURIComponent(item.channel)}`}
                  >
                    Queue
                  </Link>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Audience</span>
                  <span className="detail-value">{item.audience_type}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Channel</span>
                  <span className="detail-value">{item.channel}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Template</span>
                  <span className="detail-value">{item.template_name || "Direct content"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Priority</span>
                  <span className="detail-value">{item.priority}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Delivery delay</span>
                  <span className="detail-value">{item.delivery_delay_minutes} min</span>
                </div>
              </div>
              {item.trigger_key.includes("document") ? (
                <div className="notice">
                  <strong>Document-linked trigger.</strong>
                  <span className="muted">Use this event to route onboarding blockers, expiry reminders, or upload follow-ups without frontend hardcoding.</span>
                </div>
              ) : null}
            </article>
          ))}
          {filteredEvents.length === 0 ? (
            <div className="card panel panel-card-soft">
              <strong>No events match the current filters.</strong>
              <p className="muted">Try clearing one or more filters to widen the event catalog view.</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
