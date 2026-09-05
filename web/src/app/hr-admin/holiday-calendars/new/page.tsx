import Link from "next/link";

import { HolidayCalendarForm } from "@/app/hr-admin/holiday-calendars/holiday-calendar-form";
import { createEmptyHolidayCalendarValue } from "@/app/hr-admin/holiday-calendars/form-values";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceOperationOptions } from "@/lib/api";

export default async function HrAdminNewHolidayCalendarPage() {
  const optionsResult = await getHrAdminAttendanceOperationOptions();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live calendar mode" : "Demo calendar mode"}
        title="Create holiday calendar"
        description="Define a calendar year and the holidays that operational attendance should respect."
        actions={<Link className="button button--secondary" href="/hr-admin/holiday-calendars">Back to holiday calendars</Link>}
        pills={["Calendar-year setup", "Scoped holiday rows", "Attendance-ready references"]}
      />
      <HolidayCalendarForm initialValue={createEmptyHolidayCalendarValue()} mode="create" options={optionsResult.data} />
    </main>
  );
}
