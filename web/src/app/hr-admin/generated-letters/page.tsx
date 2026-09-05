import Link from "next/link";

import { GeneratedLetterWorkspace } from "@/app/hr-admin/generated-letters/generated-letter-workspace";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentOptions, getHrAdminEmployees, getHrAdminGeneratedLetters } from "@/lib/api";

export default async function HrAdminGeneratedLettersPage() {
  const [lettersResult, optionsResult, employeesResult] = await Promise.all([
    getHrAdminGeneratedLetters(),
    getHrAdminDocumentOptions(),
    getHrAdminEmployees(),
  ]);
  const generatedWithArtifacts = lettersResult.data.items.filter((item) => item.artifact_id).length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={lettersResult.state === "live" && optionsResult.state === "live" ? "Live letter mode" : "Demo letter mode"}
        title="Generated HR letters"
        description="Preview employee variables, generate letter artifacts, and keep issued records attached to employee history."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/documents">Open document control center</Link>
            <Link className="button button--ghost" href="/hr-admin/employee-documents">Open employee documents</Link>
          </>
        }
        pills={["Employee context rendering", "Stored generated artifacts", "Workflow reference ready"]}
      />
      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Generated letters" value={lettersResult.data.total_count} trend="Employee artifacts" />
          <MetricTile label="Stored files" value={generatedWithArtifacts} trend="Downloadable records" />
          <MetricTile label="Letter types" value={optionsResult.data.letter_types.length} trend="Configured options" />
        </div>
      </section>
      <GeneratedLetterWorkspace
        employees={employeesResult.data}
        initialLetters={lettersResult.data.items}
        letterTypes={optionsResult.data.letter_types}
      />
    </main>
  );
}
