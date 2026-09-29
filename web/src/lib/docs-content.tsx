import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";
import { createElement, type ReactNode } from "react";

const REPO_ROOT = process.cwd().endsWith("/web") ? path.resolve(process.cwd(), "..") : process.cwd();
export const DOCS_ROOT = path.join(REPO_ROOT, "docs-site", "docs");
export const DOCS_ASSETS_ROOT = path.join(DOCS_ROOT, "assets");

export type DocsPageSummary = {
  slug: string;
  title: string;
  href: string;
  relativePath: string;
  excerpt: string;
  section: string;
};

type MarkdownBlock = {
  key: string;
  node: ReactNode;
};

function normalizeRelativePath(filePath: string) {
  return filePath.split(path.sep).join("/");
}

function slugFromRelativePath(relativePath: string) {
  const withoutExtension = relativePath.replace(/\.md$/, "");
  if (withoutExtension === "index") return "";
  if (withoutExtension.endsWith("/index")) return withoutExtension.slice(0, -"/index".length);
  return withoutExtension;
}

function titleFromMarkdown(markdown: string, fallback: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function excerptFromMarkdown(markdown: string) {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[#>*_`|[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 170 ? `${plain.slice(0, 167)}...` : plain;
}

function sectionFromSlug(slug: string) {
  const first = slug.split("/")[0];
  if (!first) return "Home";
  return first
    .split("-")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "assets") return [];
        return collectMarkdownFiles(entryPath);
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [entryPath];
      }
      return [];
    }),
  );
  return files.flat();
}

export async function getDocsPages() {
  const files = await collectMarkdownFiles(DOCS_ROOT);
  const pages = await Promise.all(
    files.map(async (filePath): Promise<DocsPageSummary> => {
      const relativePath = normalizeRelativePath(path.relative(DOCS_ROOT, filePath));
      const markdown = await readFile(filePath, "utf8");
      const slug = slugFromRelativePath(relativePath);
      const fallback = slug ? slug.split("/").at(-1)?.replace(/-/g, " ") ?? "Guide" : "User Guide";
      return {
        slug,
        title: titleFromMarkdown(markdown, fallback),
        href: slug ? `/docs/${slug}` : "/docs",
        relativePath,
        excerpt: excerptFromMarkdown(markdown),
        section: sectionFromSlug(slug),
      };
    }),
  );

  return pages.sort((a, b) => {
    if (a.slug === "") return -1;
    if (b.slug === "") return 1;
    return a.section.localeCompare(b.section) || a.title.localeCompare(b.title);
  });
}

export async function searchDocs(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const pages = await getDocsPages();
  const scored = await Promise.all(
    pages.map(async (page) => {
      const markdown = await readFile(path.join(DOCS_ROOT, page.relativePath), "utf8");
      const haystack = `${page.title} ${page.section} ${markdown}`.toLowerCase();
      if (!haystack.includes(normalized)) return null;
      const titleScore = page.title.toLowerCase().includes(normalized) ? 2 : 0;
      return { page, score: titleScore + 1 };
    }),
  );

  return scored
    .filter((item): item is { page: DocsPageSummary; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title))
    .map((item) => item.page);
}

export function resolveDocsMarkdownPath(slugParts: string[] = []) {
  const requestedSlug = slugParts.join("/");
  const candidates = requestedSlug
    ? [`${requestedSlug}.md`, `${requestedSlug}/index.md`]
    : ["index.md"];
  for (const candidate of candidates) {
    const candidatePath = path.normalize(path.join(DOCS_ROOT, candidate));
    if (candidatePath.startsWith(DOCS_ROOT) && existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  return null;
}

export function getDocsAssetPath(assetParts: string[] = []) {
  const candidatePath = path.normalize(path.join(DOCS_ASSETS_ROOT, ...assetParts));
  if (!candidatePath.startsWith(DOCS_ASSETS_ROOT) || !existsSync(candidatePath)) {
    return null;
  }
  return candidatePath;
}

function resolveDocsLink(href: string, currentRelativePath: string) {
  if (/^(https?:|mailto:|tel:)/.test(href) || href.startsWith("#")) return href;
  const [rawPath, hash = ""] = href.split("#");
  if (!rawPath) return `#${hash}`;
  if (!rawPath.endsWith(".md")) return href;

  const currentDir = path.dirname(currentRelativePath);
  const relativeTarget = normalizeRelativePath(path.normalize(path.join(currentDir, rawPath)));
  const slug = slugFromRelativePath(relativeTarget);
  const suffix = hash ? `#${hash}` : "";
  return slug ? `/docs/${slug}${suffix}` : `/docs${suffix}`;
}

function resolveAssetPath(src: string, currentRelativePath: string) {
  if (/^(https?:|data:)/.test(src)) return src;
  const currentDir = path.dirname(currentRelativePath);
  const relativeTarget = normalizeRelativePath(path.normalize(path.join(currentDir, src)));
  return `/docs-assets/${relativeTarget.replace(/^assets\//, "")}`;
}

function renderInline(text: string, currentRelativePath: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+]\([^)]+\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={`${match.index}-code`}>{token.slice(1, -1)}</code>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)]\(([^)]+)\)$/);
      if (linkMatch) {
        const href = resolveDocsLink(linkMatch[2], currentRelativePath);
        const isInternal = href.startsWith("/docs");
        nodes.push(
          isInternal ? (
            <Link key={`${match.index}-link`} href={href}>
              {linkMatch[1]}
            </Link>
          ) : (
            <a key={`${match.index}-link`} href={href}>
              {linkMatch[1]}
            </a>
          ),
        );
      }
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

function parseTable(lines: string[], currentRelativePath: string, key: string) {
  const rows = lines.map((line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim()),
  );
  const [header, , ...body] = rows;
  return (
    <div className="docs-table-wrap" key={key}>
      <table className="docs-table">
        <thead>
          <tr>
            {header.map((cell) => (
              <th key={cell}>{renderInline(cell, currentRelativePath)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={`${key}-row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${key}-cell-${cellIndex}`}>{renderInline(cell, currentRelativePath)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function renderMarkdown(markdown: string, currentRelativePath: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const key = `md-${index}`;

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ key, node: <pre><code>{codeLines.join("\n")}</code></pre> });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2], currentRelativePath);
      blocks.push({ key, node: createElement(`h${level}`, null, content) });
      index += 1;
      continue;
    }

    const image = line.trim().match(/^!\[([^\]]*)]\(([^)]+)\)$/);
    if (image) {
      blocks.push({
        key,
        node: (
          <figure className="docs-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveAssetPath(image[2], currentRelativePath)} alt={image[1]} />
            {image[1] ? <figcaption>{image[1]}</figcaption> : null}
          </figure>
        ),
      });
      index += 1;
      continue;
    }

    if (line.trim().startsWith("|") && lines[index + 1]?.includes("---")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push({ key, node: parseTable(tableLines, currentRelativePath, key) });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({
        key,
        node: <ul>{items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, currentRelativePath)}</li>)}</ul>,
      });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({
        key,
        node: <ol>{items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, currentRelativePath)}</li>)}</ol>,
      });
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith(">")) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ key, node: <blockquote>{renderInline(quoteLines.join(" "), currentRelativePath)}</blockquote> });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,4})\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !lines[index].trim().startsWith("|") &&
      !lines[index].startsWith("```")
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ key, node: <p>{renderInline(paragraphLines.join(" "), currentRelativePath)}</p> });
  }

  return blocks.map((block) => <div className="docs-block" key={block.key}>{block.node}</div>);
}
