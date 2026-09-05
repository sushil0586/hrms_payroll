import Link from "next/link";

import { HolidayCalendarForm } from "@/app/hr-admin/holiday-calendars/holiday-calendar-form";
import { holidayCalendarToFormValue } from "@/app/hr-admin/holiday-calendars/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceOperationOptions, getHrAdminHolidayCalendar } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditHolidayCalendarPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([
    getHrAdminHolidayCalendar(itemId),
    getHrAdminAttendanceOperationOptions(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live calendar mode" : "Demo calendar mode"}
        title="Edit holiday calendar"
        description="Update scope, year, and holiday definitions for this calendar."
        actions={<Link className="button button--secondary" href="/hr-admin/holiday-calendars">Back to holiday calendars</Link>}
        pills={["Scope refinement", "Holiday maintenance", "Attendance-linked calendar"]}
      />
      <HolidayCalendarForm initialValue={holidayCalendarToFormValue(itemResult.data)} item={itemResult.data} mode="edit" options={optionsResult.data} itemId={itemId} />
    </main>
  );
}
