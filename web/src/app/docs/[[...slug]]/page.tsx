import { readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSessionUser } from "@/lib/api";
import {
  DOCS_ROOT,
  getDocsPages,
  renderMarkdown,
  resolveDocsMarkdownPath,
  searchDocs,
} from "@/lib/docs-content";
import { getPrimaryWorkspaceHref } from "@/lib/workspace-routing";

type SearchParamValue = string | string[] | undefined;

type DocsPageProps = {
  params?: Promise<{ slug?: string[] }>;
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function groupPages(pages: Awaited<ReturnType<typeof getDocsPages>>) {
  return pages.reduce<Record<string, typeof pages>>((groups, page) => {
    groups[page.section] = [...(groups[page.section] ?? []), page];
    return groups;
  }, {});
}

export default async function DocsPage({ params, searchParams }: DocsPageProps) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const slugParts = resolvedParams?.slug ?? [];
  const markdownPath = resolveDocsMarkdownPath(slugParts);
  if (!markdownPath) {
    notFound();
  }

  const query = firstParam(resolvedSearchParams?.q).trim();
  const markdown = await readFile(markdownPath, "utf8");
  const relativePath = path.relative(DOCS_ROOT, markdownPath).split(path.sep).join("/");
  const pages = await getDocsPages();
  const groupedPages = groupPages(pages);
  const currentSlug = slugParts.join("/");
  const currentPage = pages.find((page) => page.slug === currentSlug) ?? pages[0];
  const results = query ? await searchDocs(query) : [];
  const workspaceHref = getPrimaryWorkspaceHref(sessionUser) ?? "/workspace-access";

  return (
    <main className="docs-shell">
      <section className="docs-hero">
        <div>
          <span className="docs-eyebrow">Authenticated user guide</span>
          <h1>Accerio HRMS User Guide</h1>
          <p>
            Searchable operating documentation for HR, payroll, tenant admin, platform admin, ESS, MSS,
            finance, launch, and support workflows.
          </p>
        </div>
        <div className="docs-hero__actions">
          <Link className="button button--secondary" href={workspaceHref}>
            Back to workspace
          </Link>
        </div>
      </section>

      <section className="docs-search-panel" aria-label="Search documentation">
        <form className="docs-search" action="/docs">
          <label htmlFor="docs-search">Search guide</label>
          <div>
            <input
              id="docs-search"
              name="q"
              type="search"
              placeholder="Search payroll setup, leave approval, tenant roles..."
              defaultValue={query}
            />
            <button className="button button--primary" type="submit">
              Search
            </button>
          </div>
        </form>
      </section>

      <section className="docs-layout">
        <aside className="docs-sidebar" aria-label="Documentation menu">
          {Object.entries(groupedPages).map(([section, sectionPages]) => (
            <nav className="docs-nav-group" key={section} aria-label={section}>
              <h2>{section}</h2>
              {sectionPages.map((page) => (
                <Link
                  className={page.slug === currentSlug ? "is-active" : ""}
                  href={page.href}
                  key={page.href}
                >
                  {page.title}
                </Link>
              ))}
            </nav>
          ))}
        </aside>

        <article className="docs-content">
          {query ? (
            <div className="docs-results">
              <span className="docs-eyebrow">Search results</span>
              <h2>{results.length ? `Results for "${query}"` : `No results for "${query}"`}</h2>
              <p>
                Search checks page titles, sections, and guide content. Try a workflow name, page name, or
                status term.
              </p>
              <div className="docs-result-list">
                {results.map((result) => (
                  <Link className="docs-result-card" href={result.href} key={result.href}>
                    <span>{result.section}</span>
                    <strong>{result.title}</strong>
                    <p>{result.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="docs-current-page">
                <span className="docs-eyebrow">{currentPage?.section ?? "Guide"}</span>
                <span>{currentPage?.relativePath ?? relativePath}</span>
              </div>
              <div className="docs-article">{renderMarkdown(markdown, relativePath)}</div>
            </>
          )}
        </article>
      </section>
    </main>
  );
}
