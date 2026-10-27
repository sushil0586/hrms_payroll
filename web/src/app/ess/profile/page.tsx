
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import Link from "next/link";

import { ProfileSectionNav } from "./profile-section-nav";
import { ProfileEditForm } from "./profile-edit-form";

import { WorkspaceStandardHeader, WorkspaceStandardPanel, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { getEssPayrollPayslips, getEssProfile } from "@/lib/api";
import { requireWorkspaceAccess, sessionHasPermission } from "@/lib/workspace-access";
import { EssFields, EssIdentity, essDate, essStatus } from "../ess-profile-summary";

const sections = ["overview", "personal", "contact", "employment", "payroll", "permissions"] as const;

export default async function EssProfilePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireWorkspaceAccess({ workspace: "ess" });
  const { data: profile, state } = await getEssProfile();
  const params = await searchParams;
  const requested = typeof params?.section === "string" ? params.section : "overview";
  const section = sections.find((item) => item === requested) ?? "overview";
  const payroll = section === "payroll" ? await getEssPayrollPayslips({ page: 1, page_size: 3 }, 15_000) : null;
  const can = (permission: string) => state === "demo" || sessionHasPermission(session, permission);
  return (
    <main className="shell shell--workspace ess-experience-shell ess-compact accerio-page" id="ess-main">
      <WorkspaceStandardHeader title="My Profile" description="Your employee information and related services." actions={<Link prefetch={false} className="button button--secondary" href="/ess">Back to dashboard</Link>} />
      <EssIdentity profile={profile} />
      {state === "demo" ? <p className="notice">Preview data · Your employee information is available in a connected workspace.</p> : null}
      <ProfileSectionNav section={section} />
      <div className="ess-profile-content">
        {section === "overview" ? <WorkspaceStandardPanel title="Overview" meta={<WorkspaceStatusBadge tone="neutral">{essStatus(profile.employment_status)}</WorkspaceStatusBadge>}><EssFields fields={[["Employee code", profile.employee_code], ["Designation", profile.designation], ["Department", profile.department], ["Manager", profile.reporting_manager], ["Date of joining", essDate(profile.date_of_joining)], ["Work email", profile.work_email]]} /><p className="ess-section-note">These details are maintained by HR. Use the sections above to review your information.</p></WorkspaceStandardPanel> : null}
        {section === "personal" ? <WorkspaceStandardPanel title="Personal details" meta={<WorkspaceStatusBadge>HR controlled</WorkspaceStatusBadge>}><EssFields fields={[["Full name", profile.full_name], ["Preferred name", profile.preferred_name], ["Employee code", profile.employee_code]]} /><p className="ess-section-note">Date of birth, emergency contacts, qualifications and skills are unavailable in this self-service profile.</p></WorkspaceStandardPanel> : null}
        {section === "contact" ? <WorkspaceStandardPanel title="Contact information" meta={<WorkspaceStatusBadge>Self service</WorkspaceStatusBadge>}><EssFields fields={[["Work email", profile.work_email]]} /><ProfileEditForm profile={profile} /><p className="ess-section-note">Work email, employment, organization, payroll and statutory fields remain HR controlled.</p></WorkspaceStandardPanel> : null}
        {section === "employment" ? <WorkspaceStandardPanel title="Employment & organization" meta={<WorkspaceStatusBadge>HR controlled</WorkspaceStatusBadge>}><EssFields fields={[["Employment status", essStatus(profile.employment_status)], ["Date of joining", essDate(profile.date_of_joining)], ["Designation", profile.designation], ["Department", profile.department], ["Legal entity", profile.legal_entity], ["Branch", profile.branch], ["Location", profile.location], ["Manager", profile.reporting_manager]]} /><p className="ess-section-note">Current employment information. Historical changes and organization updates are managed by HR.</p></WorkspaceStandardPanel> : null}
        {section === "payroll" ? <WorkspaceStandardPanel title="Payroll & documents" description="Open your secure employee services.">
          <h3>Published payslips</h3>
          {payroll?.data.items.length ? <ul className="ess-request-list" aria-label="Published payslips">{payroll.data.items.map((item) => <li key={item.id}><div><strong>{item.period_name}</strong><span>Pay date: {essDate(item.pay_date)}</span></div><Link prefetch={false} href={`/ess/payslips?payslipId=${encodeURIComponent(item.id)}`}>View {item.period_name} payslip</Link></li>)}</ul> : <p className="ess-empty">No published payslips are available.</p>}
          <p className="ess-section-note">Salary amounts are available in your secure payslip view.</p>
          <ul className="ess-service-list"><li><Link prefetch={false} href="/ess/payslips">View published payslips →</Link><p>View, download and acknowledge your available payroll documents.</p></li>{can("statutory.declarations.view") || can("statutory.declarations.manage") ? <li><Link prefetch={false} href="/ess/statutory-declarations">Tax declarations →</Link><p>Review your tax information and permitted declaration updates.</p></li> : null}{can("documents.view") ? <li><Link prefetch={false} href="/ess/documents">Employee documents →</Link><p>Check requirements, verification and permitted uploads.</p></li> : null}</ul><p className="ess-section-note">Bank account and statutory identifiers are not displayed as profile fields. Your published payroll documents remain available through secure payslips.</p></WorkspaceStandardPanel> : null}
        {section === "permissions" ? <WorkspaceStandardPanel title="Access & updates"><WorkspaceTableScrollRegion label="Profile field permissions scroll region" className="workspace-table-scroll workspace-table-region"><table className="workspace-table" aria-label="Profile field permissions"><thead><tr><th scope="col">Access</th><th scope="col">Fields and availability</th></tr></thead><tbody><tr><th scope="row">HR controlled</th><td>Legal name, work email and displayed employment details.</td></tr><tr><th scope="row">Directly editable</th><td>Preferred name, personal email and phone number.</td></tr><tr><th scope="row">Approval required</th><td>Other profile change requests and their history are currently unavailable.</td></tr><tr><th scope="row">Restricted</th><td>Bank and statutory identifiers, addresses and other personal records are not exposed in this profile.</td></tr></tbody></table></WorkspaceTableScrollRegion><div className="ess-related-links">{can("attendance.view") ? <Link prefetch={false} href="/ess/attendance">My attendance</Link> : null}{can("leave.view") ? <Link prefetch={false} href="/ess/leave">My leave</Link> : null}</div></WorkspaceStandardPanel> : null}
      </div>
    </main>
  );
}
