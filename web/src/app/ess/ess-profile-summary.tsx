import { WorkspaceIdentity, WorkspaceInformation } from "@/components/patterns/workspace-information";
import type { EmployeeProfile } from "@/lib/types";

export function EssIdentity({ profile }: { profile: EmployeeProfile }) {
  const initials = profile.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
  return <WorkspaceIdentity name={profile.full_name || "Employee"} initials={initials}>
    <span>{profile.employee_code} · {profile.designation || "Designation not recorded"}</span>
    <span>{profile.department || "Department not recorded"}{profile.location ? ` · ${profile.location}` : ""}</span>
  </WorkspaceIdentity>;
}

export const EssFields = WorkspaceInformation;

export function essDate(value: string | null) {
  if (!value) return "Not recorded";
  // Date-only employee values must not shift with the browser/server timezone.
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function essStatus(value: string) {
  return value.replaceAll("_", " ");
}
