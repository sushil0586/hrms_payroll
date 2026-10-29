import { getEssPayrollPayslips, getEssProfile } from "@/lib/api";
import { requireWorkspaceAccess, sessionHasPermission } from "@/lib/workspace-access";

import { ProfileWorkspace } from "./profile-workspace";

const sections = ["overview", "personal", "contact", "employment", "payroll", "permissions"] as const;

export default async function EssProfilePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireWorkspaceAccess({ workspace: "ess" });
  const [{ data: profile, state }, payroll, params] = await Promise.all([getEssProfile(), getEssPayrollPayslips({ page: 1, page_size: 3 }, 15_000), searchParams]);
  const requested = typeof params?.section === "string" ? params.section : "overview";
  const section = sections.find((item) => item === requested) ?? "overview";
  const can = (permission: string) => state === "demo" || sessionHasPermission(session, permission);
  return <ProfileWorkspace initialProfile={profile} initialSection={section} payroll={payroll.data} isDemo={state === "demo"} permissions={{ attendance: can("attendance.view"), documents: can("documents.view"), leave: can("leave.view"), statutory: can("statutory.declarations.view") || can("statutory.declarations.manage") }} />;
}
