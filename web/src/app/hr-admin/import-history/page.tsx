import { PageIntro } from "@/components/patterns/page-intro";

import { OperationsGovernanceStrip } from "../operations-governance-strip";
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
      <OperationsGovernanceStrip
        current="imports"
        title="Bulk import evidence ledger"
        description="Use this page to inspect HR Admin import batches, source hashes, blocked rows, actor evidence, and rollback readiness after employee or organization uploads."
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
