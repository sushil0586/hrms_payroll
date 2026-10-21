"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { WorkspaceIcon } from "./workspace-icon";

import { LogoutButton } from "@/app/components/logout-button";
import { payrollCycleOperationalHrefs } from "@/lib/ui/navigation";

import { useWorkspaceNavigationFeedback, WorkspaceNavigationFeedback } from "./workspace-navigation-feedback";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  blurb?: string;
  disabled?: boolean;
  disabledReason?: string;
  permissions?: string[];
};

export type WorkspaceNavGroup = {
  title: string;
  items: WorkspaceNavItem[];
};

export type WorkspaceSearchDestination = {
  href: string;
  label: string;
  description?: string;
  section?: string;
};

type Props = {
  children: React.ReactNode;
  prefetch?: boolean;
  documentNavigation?: boolean;
  roleLabel: string;
  productLabel: string;
  workspaceLabel: string;
  searchHint: string;
  workspaceTone?: "admin" | "employee" | "manager" | "tenant" | "hr";
  userLabel?: string | null;
  navTitle?: string;
  navItems: WorkspaceNavItem[];
  navGroups?: WorkspaceNavGroup[];
  quickLinks?: Array<{ href: string; label: string }>;
  searchDestinations?: WorkspaceSearchDestination[];
  footerTitle?: string;
  footerDescription?: string;
  appearance?: "standard" | "accerio";
};

const HR_NAV_CONTEXT: Record<string, string[]> = {
  "/hr-admin/attendance-operations": ["/hr-admin/attendance-records", "/hr-admin/attendance-regularizations", "/hr-admin/attendance-close", "/hr-admin/shifts", "/hr-admin/employee-shift-assignments", "/hr-admin/shift-roster-templates"],
  "/hr-admin/policies": ["/hr-admin/leave-policies", "/hr-admin/leave-types", "/hr-admin/leave-policy-assignments", "/hr-admin/attendance-policies", "/hr-admin/attendance-policy-assignments", "/hr-admin/holiday-calendars", "/hr-admin/policy-assignments"],
  "/hr-admin/leave-requests": ["/hr-admin/leave-balances", "/hr-admin/leave-year"],
  "/hr-admin/lifecycle": ["/hr-admin/onboardings", "/hr-admin/probation-reviews", "/hr-admin/movements", "/hr-admin/exits"],
  "/hr-admin/notifications-admin": ["/hr-admin/notifications", "/hr-admin/notification-events", "/hr-admin/notification-templates", "/hr-admin/notification-delivery", "/hr-admin/notification-diagnostics"],
};

function isActivePath(pathname: string, href: string) {
  if (HR_NAV_CONTEXT[href]?.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  if (href === "/platform-admin" || href === "/tenant-admin" || href === "/hr-admin" || href === "/ess" || href === "/mss") {
    return pathname === href;
  }
  if (href === "/hr-admin/payroll-readiness") {
    return [
      "/hr-admin/payroll-readiness",
      ...payrollCycleOperationalHrefs,
    ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }
  if (href === "/hr-admin/payroll-adjustments") {
    return [
      "/hr-admin/payroll-adjustments",
      "/hr-admin/payroll-settlements",
    ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }
  return href === pathname || pathname.startsWith(`${href}/`);
}

function NavEntry({
  item,
  pathname,
  router,
  prefetch,
  appearance,
}: {
  item: WorkspaceNavItem;
  pathname: string;
  router: ReturnType<typeof useRouter>;
  prefetch: boolean;
  appearance: "standard" | "accerio";
}) {
  const active = isActivePath(pathname, item.href);
  if (item.disabled) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${item.label} unavailable`}
        className="nav-item nav-item--disabled"
        title={item.disabledReason || `${item.label} is unavailable`}
      >
        <span className="nav-item__glyph" aria-hidden="true">{appearance === "accerio" ? <WorkspaceIcon path={item.href} /> : item.shortLabel}</span>
        <span className="nav-item__content">
          <strong>{item.label}</strong>
          {item.disabledReason ? <small>{item.disabledReason}</small> : null}
        </span>
      </div>
    );
  }
  return (
    <Link
      aria-current={active ? (appearance === "accerio" && pathname !== item.href ? "location" : "page") : undefined}
      className={`nav-item${active ? " nav-item--active" : ""}`}
      href={item.href}
      prefetch={prefetch ? undefined : false}
      onMouseEnter={prefetch ? () => router.prefetch(item.href) : undefined}
    >
      <span className="nav-item__glyph" aria-hidden="true">{appearance === "accerio" ? <WorkspaceIcon path={item.href} /> : item.shortLabel}</span>
      <span className="nav-item__content">
        <strong>{item.label}</strong>
      </span>
    </Link>
  );
}

function WorkspaceSearch({
  groups,
  quickLinks,
  searchDestinations,
  searchHint,
  prefetch,
}: {
  groups: WorkspaceNavGroup[];
  quickLinks: Array<{ href: string; label: string }>;
  searchDestinations: WorkspaceSearchDestination[];
  searchHint: string;
  prefetch: boolean;
}) {
  const navigate = useWorkspaceNavigationFeedback();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchableItems = useMemo(() => {
    const navResults = groups.flatMap((group) =>
      group.items
        .filter((item) => !item.disabled)
        .map((item) => ({
          href: item.href,
          label: item.label,
          description: item.blurb || group.title,
          section: group.title,
        })),
    );
    const quickResults = quickLinks.map((item) => ({
      href: item.href,
      label: item.label,
      description: "Shortcut",
      section: "Quick links",
    }));
    const extraResults = searchDestinations.map((item) => ({
      href: item.href,
      label: item.label,
      description: item.description || item.section || "Workspace page",
      section: item.section || "Pages",
    }));
    const seen = new Set<string>();
    return [...navResults, ...quickResults, ...extraResults].filter((item) => {
      const key = `${item.href}:${item.label}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [groups, quickLinks, searchDestinations]);
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return searchableItems.slice(0, 6);
    }
    return searchableItems
      .filter((item) =>
        [item.label, item.description, item.section, item.href].some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 8);
  }, [query, searchableItems]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function openResult(href: string) {
    navigate(href, results.find((item) => item.href === href)?.label || "workspace page", inputRef.current);
    setIsOpen(false);
    setQuery("");
  }

  return (
    <div className="workspace-search" onFocus={() => setIsOpen(true)}>
      <label className="search-chip search-chip--calm" aria-label="Workspace search">
        <span className="search-chip__icon" aria-hidden="true">⌕</span>
        <input
          aria-label="Workspace search"
          autoComplete="off"
          className="workspace-search__input"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              openResult(results[0].href);
            }
          }}
          placeholder={searchHint}
          ref={inputRef}
          type="search"
          value={query}
        />
        <kbd>Cmd K</kbd>
      </label>
      {isOpen ? (
        <div className="workspace-search__panel" role="region" aria-label="Workspace search results">
          <div className="workspace-search__summary">
            <strong>{query.trim() ? "Search results" : "Common destinations"}</strong>
            <button className="workspace-search__close" onClick={() => setIsOpen(false)} type="button">Close</button>
          </div>
          {results.length ? (
            <div className="workspace-search__results">
              {results.map((item) => (
                <button
                  className="workspace-search__result"
                  key={`${item.href}:${item.label}`}
                  onClick={() => openResult(item.href)}
                  onMouseEnter={prefetch ? () => router.prefetch(item.href) : undefined}
                  type="button"
                >
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <em>{item.section}</em>
                </button>
              ))}
            </div>
          ) : (
            <div className="workspace-search__empty">
              <strong>No matching page</strong>
              <span>Try employee, payroll, leave, attendance, reports, or a menu name.</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceChrome({
  children,
  prefetch = true,
  documentNavigation = false,
  roleLabel,
  productLabel,
  workspaceLabel,
  searchHint,
  workspaceTone = "admin",
  userLabel,
  navTitle = "Workspace",
  navItems,
  navGroups,
  quickLinks = [],
  searchDestinations = [],
  footerTitle,
  footerDescription,
  appearance = "standard",
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = useMemo(
    () => (navGroups?.length ? navGroups : [{ title: navTitle, items: navItems }]),
    [navGroups, navItems, navTitle],
  );
  const mobileNavRef = useRef<HTMLDetailsElement>(null);

  const prefetchItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => {
    if (!prefetch) return;
    prefetchItems.forEach((item) => router.prefetch(item.href));
    quickLinks.forEach((item) => router.prefetch(item.href));
  }, [prefetch, prefetchItems, quickLinks, router]);

  return (
    <WorkspaceNavigationFeedback documentNavigation={documentNavigation}>
    <div className={`app-shell app-shell--workspace workspace-tone workspace-tone--${workspaceTone}${appearance === "accerio" ? " accerio-shell" : ""}${workspaceTone === "employee" || workspaceTone === "manager" ? " accerio-workspace" : ""}`}>
      <aside className="app-sidebar app-sidebar--workspace">
        <div className="app-sidebar__brand">
          <div className="brand-mark brand-mark--calm" aria-hidden="true">
            {appearance === "accerio" ? <span className="workspace-brand-initial">A</span> : <><span /><span /><span /><span /></>}
          </div>
          <div>
            <strong>{productLabel}</strong>
            <p>{roleLabel}</p>
          </div>
        </div>

        <nav className="app-sidebar__nav" aria-label={`${roleLabel} navigation`}>
          {groups.map((group, index) => {
            const activeInGroup = group.items.some((item) => isActivePath(pathname, item.href));
            return (
              <details className="nav-group nav-group--collapsible" key={group.title} open={activeInGroup || (workspaceTone !== "hr" && index === 0)}>
                <summary className="nav-group__summary">
                  <span className="nav-group__title">{group.title}</span>
                  <span className="nav-group__chevron" aria-hidden="true">⌄</span>
                </summary>
                <div className="nav-group__items">
                  {group.items.map((item) => (
                    <NavEntry item={item} key={item.href} pathname={pathname} router={router} prefetch={prefetch} appearance={appearance} />
                  ))}
                </div>
              </details>
            );
          })}
        </nav>

        <div className="app-sidebar__footer">
          {appearance === "accerio" ? <div className="workspace-shell-utility"><span>{roleLabel}</span><span>Accerio</span></div> : <div className="sidebar-promo sidebar-promo--quiet">
            <span className="pill pill--neutral">Live workspace</span>
            <strong>{footerTitle || workspaceLabel}</strong>
            <p>{footerDescription || "Compact navigation, short headers, and data-first review flow."}</p>
          </div>}
        </div>
      </aside>

      <div className="app-main app-main--workspace">
        <header className="app-topbar app-topbar--workspace">
          <div className="topbar-context">
            <span className="topbar-context__label">{roleLabel}</span>
            <strong>{workspaceLabel}</strong>
          </div>

          <WorkspaceSearch prefetch={prefetch} groups={groups} quickLinks={quickLinks} searchDestinations={searchDestinations} searchHint={searchHint} />

          <div className="topbar-actions topbar-actions--workspace">
            <details className="mobile-workspace-nav" ref={mobileNavRef} onKeyDown={(event) => {
              if (appearance !== "accerio" || event.key !== "Escape") return;
              event.preventDefault();
              mobileNavRef.current?.removeAttribute("open");
              mobileNavRef.current?.querySelector("summary")?.focus();
            }}>
              <summary className="button button--secondary button--compact">Menu</summary>
              <nav
                aria-label={`${roleLabel} mobile navigation`}
                className="mobile-workspace-nav__panel"
              >
                {groups.map((group) => (
                  <div className="mobile-workspace-nav__group" key={group.title}>
                    <span>{group.title}</span>
                    {group.items.map((item) => {
                      const active = isActivePath(pathname, item.href);
                      if (item.disabled) {
                        return (
                          <div
                            aria-disabled="true"
                            className="mobile-workspace-nav__link mobile-workspace-nav__link--disabled"
                            key={item.href}
                            title={item.disabledReason || `${item.label} is unavailable`}
                          >
                            <strong>{item.label}</strong>
                            <small>{item.disabledReason || item.blurb || "Unavailable"}</small>
                          </div>
                        );
                      }
                      return (
                        <Link
                          aria-current={active ? (appearance === "accerio" && pathname !== item.href ? "location" : "page") : undefined}
                          className={`mobile-workspace-nav__link${active ? " mobile-workspace-nav__link--active" : ""}`}
                          href={item.href}
                          prefetch={prefetch ? undefined : false}
                          key={item.href}
                          onClick={(event) => {
                            if (appearance !== "accerio" && workspaceTone !== "employee" && workspaceTone !== "manager") return;
                            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                            event.currentTarget.closest("details")?.removeAttribute("open");
                          }}
                          onMouseEnter={prefetch ? () => router.prefetch(item.href) : undefined}
                        >
                          <strong>{item.label}</strong>
                          {item.blurb ? <small>{item.blurb}</small> : null}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </details>
            {quickLinks.map((item) => (
              <Link
                className="button button--secondary button--compact"
                href={item.href}
                prefetch={prefetch ? undefined : false}
                key={item.href}
                onMouseEnter={prefetch ? () => router.prefetch(item.href) : undefined}
              >
                {item.label}
              </Link>
            ))}
            {userLabel ? (
              <div className="user-chip user-chip--workspace">
                <span className="user-chip__avatar" aria-hidden="true">
                  {userLabel.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{userLabel}</strong>
                  <small>{roleLabel}</small>
                </div>
              </div>
            ) : null}
            <LogoutButton />
          </div>
        </header>

        <div className="app-content app-content--workspace">{children}</div>
        {appearance === "accerio" ? <footer className="workspace-shell-footer" aria-label="Workspace footer"><span>{productLabel} · {workspaceLabel}</span><span>{roleLabel}</span></footer> : null}
      </div>
    </div>
    </WorkspaceNavigationFeedback>
  );
}
