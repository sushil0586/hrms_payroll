import Link from "next/link";

import { HolidayCalendarsWorkspace } from "@/app/hr-admin/holiday-calendars/holiday-calendars-workspace";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminAttendanceOperationOptions, getHrAdminHolidayCalendars } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminHolidayCalendarsPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["attendance.view", "attendance.policies.manage"], fallbackPath: "/hr-admin/attendance-operations" });
  const canManagePolicies = sessionHasPermission(sessionUser, "attendance.policies.manage");
  const currentParams = (await searchParams) ?? {};
  const [result, optionsResult] = await Promise.all([
    getHrAdminHolidayCalendars(),
    getHrAdminAttendanceOperationOptions(),
  ]);
  const editCalendarId = normalizeParam(currentParams.editCalendar) ?? "";
  const initialModal = editCalendarId ? { mode: "edit" as const, id: editCalendarId } : normalizeParam(currentParams.calendarModal) === "create" ? { mode: "create" as const, id: "" } : { mode: "" as const, id: "" };

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro appearance="accerio"
        eyebrow={result.state === "live" ? "Live calendar mode" : "Demo calendar mode"}
        title="Holiday calendars"
        description="Set scope-aware holiday schedules that policies and daily attendance records can reference."
        actions={
          <>
            {canManagePolicies ? <Link className="button button--primary" href="/hr-admin/holiday-calendars?calendarModal=create">Create holiday calendar</Link> : null}
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">Back to attendance operations</Link>
          </>
        }
      />

      <HolidayCalendarsWorkspace
        canManagePolicies={canManagePolicies}
        initialData={{ items: result.data, state: result.state === "live" && optionsResult.state === "live" ? "live" : "demo" }}
        initialModal={initialModal}
        options={optionsResult.data}
      />
    </main>
  );
}
