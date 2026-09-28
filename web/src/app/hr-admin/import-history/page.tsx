import { PageIntro } from "@/components/patterns/page-intro";

import { OperationsGovernanceStrip } from "../operations-governance-strip";
import { ImportHistoryWorkspace } from "./import-history-workspace";

export default function HrAdminImportHistoryPage() {
  return (
    <main className="shell">
      <PageIntro
        eyebrow="Bulk import evidence"
        title="Import history"
        description="Review batch outcomes, source hashes, blocked rows, and rollback readiness."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        pills={["Batches", "Hashes", "Errors"]}
        showPills
      />
      <OperationsGovernanceStrip
        current="imports"
        title="Import evidence ledger"
        description="Inspect employee and organization upload evidence without reopening the import workbench."
        metrics={[
          { label: "scope", value: "HR data", tone: "neutral" },
          { label: "evidence", value: "Hashes", tone: "ready" },
          { label: "rollback", value: "Tracked", tone: "ready" },
          { label: "source", value: "Browser", tone: "neutral" },
        ]}
      />
      <ImportHistoryWorkspace />
    </main>
  );
}
