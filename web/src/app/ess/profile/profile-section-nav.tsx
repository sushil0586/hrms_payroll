"use client";

import Link from "next/link";

const sections = [
  ["overview", "Overview"],
  ["personal", "Personal details"],
  ["contact", "Contact information"],
  ["employment", "Employment & organization"],
  ["payroll", "Payroll & documents"],
  ["permissions", "Access & updates"],
] as const;

export function ProfileSectionNav({ section }: { section: string }) {
  return (
    <>
      <nav className="ess-profile-nav" aria-label="Profile sections">
        {sections.map(([key, label]) => (
          <Link
            prefetch={false}
            key={key}
            href={`/ess/profile?section=${key}`}
            aria-current={section === key ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="ess-profile-mobile-nav">
        <label htmlFor="ess-profile-section">Profile section</label>
        <select
          id="ess-profile-section"
          className="input-control"
          value={section}
          onChange={(event) => {
            const destination = new URL("/ess/profile", window.location.origin);
            destination.searchParams.set("section", event.target.value);
            window.location.assign(destination.href);
          }}
        >
          {sections.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
