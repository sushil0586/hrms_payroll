import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceCard } from "@/components/patterns/workspace-card";
import {
  getHrAdminDocumentCategories,
  getHrAdminDocumentRequirements,
  getHrAdminEmployeeDocuments,
  getHrAdminGeneratedLetters,
} from "@/lib/api";

export default async function HrAdminDocumentsPage() {
  const [categoriesResult, requirementsResult, employeeDocumentsResult, generatedLettersResult] = await Promise.all([
    getHrAdminDocumentCategories(),
    getHrAdminDocumentRequirements(),
    getHrAdminEmployeeDocuments(),
    getHrAdminGeneratedLetters(),
  ]);

  const state =
    categoriesResult.state === "live" &&
    requirementsResult.state === "live" &&
    employeeDocumentsResult.state === "live" &&
    generatedLettersResult.state === "live"
      ? "live"
      : "demo";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live document mode" : "Demo document mode"}
        title="Documents control"
        description="Control categories, requirement rules, and employee review queues from one document workspace."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/document-categories">Open categories</Link>
            <Link className="button button--secondary" href="/hr-admin/document-requirements">Open requirements</Link>
            <Link className="button button--secondary" href="/hr-admin/employee-documents">Open employee documents</Link>
            <Link className="button button--secondary" href="/hr-admin/generated-letters">Open generated letters</Link>
            <Link className="button button--secondary" href="/hr-admin">Back to admin workspace</Link>
          </>
        }
      />

      <section className="section">
        <div className="metrics-grid">
          <MetricTile label="Categories" value={categoriesResult.data.length} trend="Configured document types" />
          <MetricTile label="Requirement rules" value={requirementsResult.data.length} trend="Scoped compliance rules" />
          <MetricTile label="Documents in queue" value={employeeDocumentsResult.data.total_count} trend="Review window size" />
          <MetricTile label="Generated letters" value={generatedLettersResult.data.total_count} trend="Issued employee artifacts" />
        </div>
      </section>

      <section className="section">
        <div className="workspace-grid">
          <WorkspaceCard
            eyebrow="Taxonomy"
            title="Document categories"
            description="Control reusable document types, upload rules, and verification behavior."
            href="/hr-admin/document-categories"
            cta="Manage categories"
            details={[
              { label: "Configured", value: categoriesResult.data.length },
              { label: "Verification required", value: categoriesResult.data.filter((item) => item.requires_verification).length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Compliance"
            title="Document requirements"
            description="Define where documents are mandatory by legal entity, branch, department, grade, and employment context."
            href="/hr-admin/document-requirements"
            cta="Manage requirements"
            details={[
              { label: "Rules", value: requirementsResult.data.length },
              { label: "Mandatory", value: requirementsResult.data.filter((item) => item.is_mandatory).length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Letters"
            title="Generated HR letters"
            description="Preview employee variables, create downloadable letter artifacts, and keep issue history attached to employee records."
            href="/hr-admin/generated-letters"
            cta="Generate letters"
            details={[
              { label: "Generated", value: generatedLettersResult.data.total_count },
              { label: "Downloadable", value: generatedLettersResult.data.items.filter((item) => item.artifact_id).length },
            ]}
          />
          <WorkspaceCard
            eyebrow="Operations"
            title="Employee document review"
            description="Keep the verification queue moving with shared filters, expiry tracking, and review actions."
            href="/hr-admin/employee-documents"
            cta="Open review queue"
            details={[
              { label: "Queue size", value: employeeDocumentsResult.data.total_count },
              { label: "Visible page", value: employeeDocumentsResult.data.items.length },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
