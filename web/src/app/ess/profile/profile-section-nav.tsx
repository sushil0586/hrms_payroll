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

export function ProfileSectionNav({ section, onSelect }: { section: string; onSelect: (section: string) => void }) {
  return (
    <>
      <nav className="ess-profile-nav" aria-label="Profile sections">
        {sections.map(([key, label]) => (
          <Link
            data-navigation-mode="local"
            prefetch={false}
            key={key}
            href={`/ess/profile?section=${key}`}
            aria-current={section === key ? "page" : undefined}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onSelect(key);
            }}
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
            onSelect(event.target.value);
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
