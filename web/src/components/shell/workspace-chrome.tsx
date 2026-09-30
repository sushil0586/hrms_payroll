"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { LogoutButton } from "@/app/components/logout-button";
import { payrollCycleOperationalHrefs } from "@/lib/ui/navigation";

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
};

function isActivePath(pathname: string, href: string) {
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
}: {
  item: WorkspaceNavItem;
  pathname: string;
  router: ReturnType<typeof useRouter>;
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
        <span className="nav-item__glyph" aria-hidden="true">{item.shortLabel}</span>
        <span className="nav-item__content">
          <strong>{item.label}</strong>
          {item.blurb ? <small>{item.blurb}</small> : null}
          {item.disabledReason ? <small>{item.disabledReason}</small> : null}
        </span>
      </div>
    );
  }
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`nav-item${active ? " nav-item--active" : ""}`}
      href={item.href}
      onMouseEnter={() => router.prefetch(item.href)}
    >
      <span className="nav-item__glyph" aria-hidden="true">{item.shortLabel}</span>
      <span className="nav-item__content">
        <strong>{item.label}</strong>
        {item.blurb ? <small>{item.blurb}</small> : null}
      </span>
    </Link>
  );
}

function WorkspaceSearch({
  groups,
  quickLinks,
  searchDestinations,
  searchHint,
  router,
}: {
  groups: WorkspaceNavGroup[];
  quickLinks: Array<{ href: string; label: string }>;
  searchDestinations: WorkspaceSearchDestination[];
  searchHint: string;
  router: ReturnType<typeof useRouter>;
}) {
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
    setIsOpen(false);
    setQuery("");
    router.push(href);
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
                  onMouseEnter={() => router.prefetch(item.href)}
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
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = useMemo(
    () => (navGroups?.length ? navGroups : [{ title: navTitle, items: navItems }]),
    [navGroups, navItems, navTitle],
  );
  const prefetchItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => {
    prefetchItems.forEach((item) => router.prefetch(item.href));
    quickLinks.forEach((item) => router.prefetch(item.href));
  }, [prefetchItems, quickLinks, router]);

  return (
    <div className={`app-shell app-shell--workspace workspace-tone workspace-tone--${workspaceTone}`}>
      <aside className="app-sidebar app-sidebar--workspace">
        <div className="app-sidebar__brand">
          <div className="brand-mark brand-mark--calm" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
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
              <details className="nav-group nav-group--collapsible" key={group.title} open={activeInGroup || index === 0}>
                <summary className="nav-group__summary">
                  <span className="nav-group__title">{group.title}</span>
                  <span className="nav-group__chevron" aria-hidden="true">⌄</span>
                </summary>
                <div className="nav-group__items">
                  {group.items.map((item) => (
                    <NavEntry item={item} key={item.href} pathname={pathname} router={router} />
                  ))}
                </div>
              </details>
            );
          })}
        </nav>

        <div className="app-sidebar__footer">
          <div className="sidebar-promo sidebar-promo--quiet">
            <span className="pill pill--neutral">Live workspace</span>
            <strong>{footerTitle || workspaceLabel}</strong>
            <p>{footerDescription || "Compact navigation, short headers, and data-first review flow."}</p>
          </div>
        </div>
      </aside>

      <div className="app-main app-main--workspace">
        <header className="app-topbar app-topbar--workspace">
          <div className="topbar-context">
            <span className="topbar-context__label">{roleLabel}</span>
            <strong>{workspaceLabel}</strong>
          </div>

          <WorkspaceSearch groups={groups} quickLinks={quickLinks} router={router} searchDestinations={searchDestinations} searchHint={searchHint} />

          <div className="topbar-actions topbar-actions--workspace">
            <details className="mobile-workspace-nav">
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
                          aria-current={active ? "page" : undefined}
                          className={`mobile-workspace-nav__link${active ? " mobile-workspace-nav__link--active" : ""}`}
                          href={item.href}
                          key={item.href}
                          onMouseEnter={() => router.prefetch(item.href)}
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
                key={item.href}
                onMouseEnter={() => router.prefetch(item.href)}
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
      </div>
    </div>
  );
}
