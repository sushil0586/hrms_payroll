import { PageIntro } from "@/components/patterns/page-intro";
import { ImportHistoryWorkspace } from "./import-history-workspace";

export default function HrAdminImportHistoryPage() {
  return (
    <main className="shell">
      <PageIntro
        eyebrow="Bulk import evidence"
        title="Import History"
        description="Review browser-driven import batches, source hashes, row outcomes, blocked rows, and rollback readiness."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        pills={["Batches", "Hashes", "Errors"]}
        showPills
      />
      <ImportHistoryWorkspace />
    </main>
  );
}
