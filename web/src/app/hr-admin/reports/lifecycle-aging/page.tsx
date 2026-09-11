import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleQueue } from "@/lib/api";

import { LifecycleAgingReportWorkspace } from "./lifecycle-aging-report-workspace";

export default async function LifecycleAgingReportPage() {
  const result = await getHrAdminLifecycleQueue({ page: 1, page_size: 500 });

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

      <LifecycleAgingReportWorkspace items={result.data.items} />
    </main>
  );
}
