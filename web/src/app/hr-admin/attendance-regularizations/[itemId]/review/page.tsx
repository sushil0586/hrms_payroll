import Link from "next/link";

import { AttendanceRegularizationReviewForm } from "@/app/hr-admin/attendance-regularizations/attendance-regularization-review-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceRegularization } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminAttendanceRegularizationReviewPage({ params }: PageProps) {
  const { itemId } = await params;
  const result = await getHrAdminAttendanceRegularization(itemId);
  const item = result.data;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live regularization review mode" : "Demo regularization review mode"}
        title="Review attendance regularization"
        description="Inspect the requested correction in context, then approve or reject it from the HR operations queue."
        actions={<Link className="button button--secondary" href="/hr-admin/attendance-regularizations">Back to regularizations</Link>}
        pills={["Context-rich review", "Approve or reject flow", "Queue-linked decisioning"]}
      />
      <AttendanceRegularizationReviewForm item={item} />
    </main>
  );
}
