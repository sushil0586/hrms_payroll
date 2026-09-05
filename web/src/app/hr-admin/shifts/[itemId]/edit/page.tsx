import Link from "next/link";

import { ShiftForm } from "@/app/hr-admin/shifts/shift-form";
import { getHrAdminShift } from "@/lib/api";
import { shiftToFormValue } from "@/app/hr-admin/shifts/form-values";
import { PageIntro } from "@/components/patterns/page-intro";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditShiftPage({ params }: PageProps) {
  const { itemId } = await params;
  const result = await getHrAdminShift(itemId);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live shift mode" : "Demo shift mode"}
        title="Edit shift"
        description="Update operational timing and weekly-off settings for this shift."
        actions={<Link className="button button--secondary" href="/hr-admin/shifts">Back to shifts</Link>}
        pills={["Timing refinement", "Weekly-off updates", "Attendance-linked schedule"]}
      />
      <ShiftForm initialValue={shiftToFormValue(result.data)} item={result.data} mode="edit" itemId={itemId} />
    </main>
  );
}
