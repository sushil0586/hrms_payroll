"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { WorkspaceStandardHeader, WorkspaceStandardPanel, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import type { EmployeeProfile, EssPayrollPayslipListResponse } from "@/lib/types";

import { EssFields, EssIdentity, essDate, essStatus } from "../ess-profile-summary";
import { ProfileEditForm } from "./profile-edit-form";
import { ProfileSectionNav } from "./profile-section-nav";

const sections = ["overview", "personal", "contact", "employment", "payroll", "permissions"] as const;
const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

type Section = (typeof sections)[number];

export function ProfileWorkspace({ initialProfile, initialSection, payroll, permissions, isDemo }: {
  initialProfile: EmployeeProfile;
  initialSection: Section;
  payroll: EssPayrollPayslipListResponse;
  permissions: { attendance: boolean; documents: boolean; leave: boolean; statutory: boolean };
  isDemo: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [profile, setProfile] = useState(initialProfile);
  const [section, setSection] = useState<Section>(initialSection);
  const select = useCallback((nextValue: string, history: "push" | "none" = "push") => {
    const next = sections.includes(nextValue as Section) ? nextValue as Section : "overview";
    setSection(next);
    if (history === "push") {
      const url = new URL(window.location.href);
      if (next === "overview") url.searchParams.delete("section"); else url.searchParams.set("section", next);
      window.history.pushState(window.history.state, "", `${url.pathname}${url.search}`);
    }
  }, []);
  useEffect(() => {
    const restore = () => select(new URLSearchParams(window.location.search).get("section") || "overview", "none");
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [select]);

  return <main className="shell shell--workspace ess-experience-shell ess-compact accerio-page" data-hydrated={hydrated} id="ess-main">
    <WorkspaceStandardHeader title="My Profile" description="Your employee information and related services." actions={<Link prefetch={false} className="button button--secondary" href="/ess">Back to dashboard</Link>} />
    <EssIdentity profile={profile} />
    {isDemo ? <p className="notice">Preview data · Your employee information is available in a connected workspace.</p> : null}
    <ProfileSectionNav section={section} onSelect={select} />
    <div className="ess-profile-content">
      {section === "overview" ? <WorkspaceStandardPanel title="Overview" meta={<WorkspaceStatusBadge tone="neutral">{essStatus(profile.employment_status)}</WorkspaceStatusBadge>}><EssFields fields={[["Employee code", profile.employee_code], ["Designation", profile.designation], ["Department", profile.department], ["Manager", profile.reporting_manager], ["Date of joining", essDate(profile.date_of_joining)], ["Work email", profile.work_email]]} /><p className="ess-section-note">These details are maintained by HR. Use the sections above to review your information.</p></WorkspaceStandardPanel> : null}
      {section === "personal" ? <WorkspaceStandardPanel title="Personal details" meta={<WorkspaceStatusBadge>HR controlled</WorkspaceStatusBadge>}><EssFields fields={[["Full name", profile.full_name], ["Preferred name", profile.preferred_name], ["Employee code", profile.employee_code]]} /><p className="ess-section-note">Date of birth, emergency contacts, qualifications and skills are unavailable in this self-service profile.</p></WorkspaceStandardPanel> : null}
      {section === "contact" ? <WorkspaceStandardPanel title="Contact information" meta={<WorkspaceStatusBadge>Self service</WorkspaceStatusBadge>}><EssFields fields={[["Work email", profile.work_email]]} /><ProfileEditForm profile={profile} onSaved={setProfile} /><p className="ess-section-note">Work email, employment, organization, payroll and statutory fields remain HR controlled.</p></WorkspaceStandardPanel> : null}
      {section === "employment" ? <WorkspaceStandardPanel title="Employment & organization" meta={<WorkspaceStatusBadge>HR controlled</WorkspaceStatusBadge>}><EssFields fields={[["Employment status", essStatus(profile.employment_status)], ["Date of joining", essDate(profile.date_of_joining)], ["Designation", profile.designation], ["Department", profile.department], ["Legal entity", profile.legal_entity], ["Branch", profile.branch], ["Location", profile.location], ["Manager", profile.reporting_manager]]} /><p className="ess-section-note">Current employment information. Historical changes and organization updates are managed by HR.</p></WorkspaceStandardPanel> : null}
      {section === "payroll" ? <WorkspaceStandardPanel title="Payroll & documents" description="Open your secure employee services.">
        <h3>Published payslips</h3>
        {payroll.items.length ? <ul className="ess-request-list" aria-label="Published payslips">{payroll.items.map((item) => <li key={item.id}><div><strong>{item.period_name}</strong><span>Pay date: {essDate(item.pay_date)}</span></div><Link prefetch={false} href={`/ess/payslips?payslipId=${encodeURIComponent(item.id)}`}>View {item.period_name} payslip</Link></li>)}</ul> : <p className="ess-empty">No published payslips are available.</p>}
        <p className="ess-section-note">Salary amounts are available in your secure payslip view.</p>
        <ul className="ess-service-list"><li><Link prefetch={false} href="/ess/payslips">View published payslips →</Link><p>View, download and acknowledge your available payroll documents.</p></li>{permissions.statutory ? <li><Link prefetch={false} href="/ess/statutory-declarations">Tax declarations →</Link><p>Review your tax information and permitted declaration updates.</p></li> : null}{permissions.documents ? <li><Link prefetch={false} href="/ess/documents">Employee documents →</Link><p>Check requirements, verification and permitted uploads.</p></li> : null}</ul>
        <p className="ess-section-note">Bank account and statutory identifiers are not displayed as profile fields. Your published payroll documents remain available through secure payslips.</p>
      </WorkspaceStandardPanel> : null}
      {section === "permissions" ? <WorkspaceStandardPanel title="Access & updates"><WorkspaceTableScrollRegion label="Profile field permissions scroll region" className="workspace-table-scroll workspace-table-region"><table className="workspace-table" aria-label="Profile field permissions"><thead><tr><th scope="col">Access</th><th scope="col">Fields and availability</th></tr></thead><tbody><tr><th scope="row">HR controlled</th><td>Legal name, work email and displayed employment details.</td></tr><tr><th scope="row">Directly editable</th><td>Preferred name, personal email and phone number.</td></tr><tr><th scope="row">Approval required</th><td>Other profile change requests and their history are currently unavailable.</td></tr><tr><th scope="row">Restricted</th><td>Bank and statutory identifiers, addresses and other personal records are not exposed in this profile.</td></tr></tbody></table></WorkspaceTableScrollRegion><div className="ess-related-links">{permissions.attendance ? <Link prefetch={false} href="/ess/attendance">My attendance</Link> : null}{permissions.leave ? <Link prefetch={false} href="/ess/leave">My leave</Link> : null}</div></WorkspaceStandardPanel> : null}
    </div>
  </main>;
}
