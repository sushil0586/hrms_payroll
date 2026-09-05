import Link from "next/link";

import { probationReviewToFormValue } from "@/app/hr-admin/probation-reviews/form-values";
import { ProbationReviewForm } from "@/app/hr-admin/probation-reviews/probation-review-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions, getHrAdminProbationReview } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditProbationReviewPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminProbationReview(itemId), getHrAdminLifecycleOptions()]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Edit probation review"
        description="Adjust the decision, reviewer assignment, and extension timeline while staying aligned with queue safety checks."
        actions={<Link className="button button--secondary" href="/hr-admin/probation-reviews">Back to probation reviews</Link>}
        pills={["Queue-linked extension rules", "Shared owner contract", "Review timeline clarity"]}
      />
      <ProbationReviewForm initialValue={probationReviewToFormValue(itemResult.data)} mode="edit" options={optionsResult.data} itemId={itemId} />
    </main>
  );
}
