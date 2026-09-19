import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleQueue } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { LifecycleAgingReportWorkspace } from "./lifecycle-aging-report-workspace";

export default async function LifecycleAgingReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminLifecycleQueue({ page: 1, page_size: 500 });
  const items = result.data.items;
  const highRiskCount = items.filter((item) => item.attention_rank >= 80 || item.attention_state === "blocked").length;
  const escalationCount = items.filter((item) => item.next_escalation_on).length;
  const unownedCount = items.filter((item) => !item.owner_value || item.owner_value === "unassigned").length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live HR core report" : "Demo HR core report"}
        title="Lifecycle Aging and SLA Report"
        description="Age buckets, overdue lifecycle work, owner gaps, escalation dates, and SLA risk."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports/lifecycle-queue">
              Lifecycle queue
            </Link>
            <Link className="button button--primary" href="/hr-admin/lifecycle">
              Lifecycle inbox
            </Link>
          </>
        }
        pills={["Aging", "SLA", "Escalations"]}
        showPills
      />

      <ReportInsightsStrip
        current="lifecycle"
        eyebrow="Lifecycle report"
        title="Lifecycle SLA and aging"
        description="Track stale lifecycle work, ownership gaps, escalation pressure, and overdue attention signals."
        metrics={[
          { label: "items", value: items.length, tone: "neutral" },
          { label: "high risk", value: highRiskCount, tone: highRiskCount ? "blocked" : "ready" },
          { label: "escalations", value: escalationCount, tone: escalationCount ? "warning" : "ready" },
          { label: "unowned", value: unownedCount, tone: unownedCount ? "warning" : "ready" },
        ]}
      />

      <LifecycleAgingReportWorkspace items={items} />
    </main>
  );
}
