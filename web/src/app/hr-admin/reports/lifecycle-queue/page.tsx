import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleQueue } from "@/lib/api";

import { LifecycleQueueReportWorkspace } from "./lifecycle-queue-report-workspace";

export default async function LifecycleQueueReportPage() {
  const result = await getHrAdminLifecycleQueue({ page: 1, page_size: 500 });

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

      <LifecycleQueueReportWorkspace items={result.data.items} />
    </main>
  );
}
