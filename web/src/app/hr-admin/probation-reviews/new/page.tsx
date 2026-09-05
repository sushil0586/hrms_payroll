import Link from "next/link";

import { createEmptyProbationReviewValue } from "@/app/hr-admin/probation-reviews/form-values";
import { ProbationReviewForm } from "@/app/hr-admin/probation-reviews/probation-review-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions } from "@/lib/api";

export default async function HrAdminNewProbationReviewPage() {
  const optionsResult = await getHrAdminLifecycleOptions();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Create probation review"
        description="Capture review timing, ownership, and extension details in the same language used across lifecycle queues."
        actions={<Link className="button button--secondary" href="/hr-admin/probation-reviews">Back to probation reviews</Link>}
        pills={["Extension-aware review flow", "Shared owner contract", "Queue-linked decisions"]}
      />
      <ProbationReviewForm initialValue={createEmptyProbationReviewValue(optionsResult.data.probation_decisions[0]?.value)} mode="create" options={optionsResult.data} />
    </main>
  );
}
