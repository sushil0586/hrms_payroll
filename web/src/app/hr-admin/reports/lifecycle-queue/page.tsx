import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleQueue } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { LifecycleQueueReportWorkspace } from "./lifecycle-queue-report-workspace";

export default async function LifecycleQueueReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminLifecycleQueue({ page: 1, page_size: 500 });
  const items = result.data.items;
  const highRiskCount = items.filter((item) => item.attention_rank >= 80 || item.attention_state === "blocked").length;
  const documentPressureCount = items.filter(
    (item) =>
      item.document_attention_state === "blocked" ||
      item.document_attention_state === "warning" ||
      item.missing_required_document_count > 0 ||
      item.expired_document_count > 0 ||
      item.expiring_document_count > 0,
  ).length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live HR core report" : "Demo HR core report"}
        title="Lifecycle Queue Report"
        description="Onboarding, probation, movement, exit, owner, status, document pressure, and due-date evidence."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/lifecycle">
              Lifecycle inbox
            </Link>
            <Link className="button button--primary" href="/hr-admin/onboardings/new">
              New onboarding
            </Link>
          </>
        }
        pills={["Lifecycle", "Owners", "Document pressure"]}
        showPills
      />

      <ReportInsightsStrip
        current="lifecycle"
        eyebrow="Lifecycle report"
        title="Lifecycle queue evidence"
        description="Review onboarding, probation, movement, exit, owner, status, document pressure, and due-date evidence."
        metrics={[
          { label: "items", value: items.length, tone: "neutral" },
          { label: "high risk", value: highRiskCount, tone: highRiskCount ? "blocked" : "ready" },
          { label: "doc pressure", value: documentPressureCount, tone: documentPressureCount ? "warning" : "ready" },
          { label: "source", value: result.state === "live" ? "Live" : "Demo", tone: result.state === "live" ? "ready" : "warning" },
        ]}
      />

      <LifecycleQueueReportWorkspace items={items} />
    </main>
  );
}
