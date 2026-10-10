import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminShiftRosterRollouts, getHrAdminShiftRosterTemplates } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "../report-insights-strip";
import { RosterRolloutAuditReportWorkspace } from "./roster-rollout-audit-report-workspace";

export default async function RosterRolloutAuditReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const [rolloutsResult, templatesResult] = await Promise.all([
    getHrAdminShiftRosterRollouts({ page: 1, page_size: 500 }),
    getHrAdminShiftRosterTemplates(),
  ]);
  const rollouts = rolloutsResult.data.items;
  const skippedCount = rollouts.reduce((sum, item) => sum + item.skipped_count, 0);
  const createdCount = rollouts.reduce((sum, item) => sum + item.created_count, 0);

  return (
    <main className="shell hr-admin-compact-ui">
      <PageIntro
        eyebrow={rolloutsResult.state === "live" ? "Live attendance report" : "Demo attendance report"}
        title="Roster Rollout Audit Report"
        description="Roster rollout history by template, pattern, scope, window, completion, skipped rows, and risk."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports/attendance">Attendance reports</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">Attendance operations</Link>
            <Link className="button button--primary" href="/hr-admin/shift-roster-templates">Roster templates</Link>
          </>
        }
        pills={["Roster audit", "Pattern evidence", "Scope linked"]}
        showPills
      />

      <ReportInsightsStrip
        current="time"
        eyebrow="Roster audit report"
        title="Roster rollout evidence"
        description="Review rollout history, pattern metadata, generated assignment counts, skipped rows, and audit risk."
        metrics={[
          { label: "rollouts", value: rollouts.length, tone: "neutral" },
          { label: "created", value: createdCount, tone: "ready" },
          { label: "skipped", value: skippedCount, tone: skippedCount ? "warning" : "ready" },
          { label: "templates", value: templatesResult.data.total_count, tone: "neutral" },
        ]}
      />

      <RosterRolloutAuditReportWorkspace rollouts={rollouts} templates={templatesResult.data.items} />
    </main>
  );
}
