"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { LogoutButton } from "@/app/components/logout-button";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  blurb?: string;
};

type Props = {
  children: React.ReactNode;
  roleLabel: string;
  productLabel: string;
  workspaceLabel: string;
  searchHint: string;
  workspaceTone?: "admin" | "employee" | "manager";
  userLabel?: string | null;
  navTitle?: string;
  navItems: WorkspaceNavItem[];
  quickLinks?: Array<{ href: string; label: string }>;
  footerTitle?: string;
  footerDescription?: string;
};

function isActivePath(pathname: string, href: string) {
  return href === pathname || pathname.startsWith(`${href}/`);
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
  quickLinks = [],
  footerTitle,
  footerDescription,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    navItems.forEach((item) => router.prefetch(item.href));
    quickLinks.forEach((item) => router.prefetch(item.href));
  }, [navItems, quickLinks, router]);

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
          <section className="nav-group">
            <span className="nav-group__title">{navTitle}</span>
            <div className="nav-group__items">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    className={`nav-item${active ? " nav-item--active" : ""}`}
                    href={item.href}
                    key={item.href}
                    onMouseEnter={() => router.prefetch(item.href)}
                  >
                    <span className="nav-item__glyph" aria-hidden="true">{item.shortLabel}</span>
                    <span className="nav-item__content">
                      <strong>{item.label}</strong>
                      {item.blurb ? <small>{item.blurb}</small> : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
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

          <div className="search-chip search-chip--calm" aria-label="Search placeholder">
            <span className="search-chip__icon" aria-hidden="true">⌕</span>
            <span>{searchHint}</span>
            <kbd>Cmd K</kbd>
          </div>

          <div className="topbar-actions topbar-actions--workspace">
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
