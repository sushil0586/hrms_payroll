# Documentation QA

Use this page when you add or change menus, tabs, drilldowns, screenshots, or end-to-end workflows.

## Purpose

Documentation QA confirms that users can find help for every workspace menu and workflow without asking support for basic navigation or next-step questions.

## Run the full docs gate

From the project root:

```bash
pnpm qa:docs
```

This command runs two checks:

1. `scripts/audit-docs-coverage.mjs`
2. `mkdocs build --strict`

## What the audit checks

| Check | Why it matters |
| --- | --- |
| Menu links | Every sidebar and quick link must map to a user guide. |
| Child route families | Edit, create, review, and drilldown screens must be explained by a parent guide or workflow. |
| MkDocs navigation | Every guide must be reachable from the docs menu. |
| Missing docs | Navigation cannot point to files that do not exist. |
| Screenshots | Referenced screenshots must exist, and stored screenshots must be used. |
| Secret scan | Docs must not include passwords, mail-provider credentials, API secrets, or real login details. |
| Strict build | Broken internal links and MkDocs errors must block release. |

## When the audit fails

Use the failure message as the action list.

| Failure | Fix |
| --- | --- |
| Menu links are not mapped to docs | Add the route to `scripts/audit-docs-coverage.mjs`, then create or choose the matching guide. |
| Mapped menu docs are missing | Create the missing Markdown file or correct the mapping. |
| Mapped menu docs are missing from nav | Add the file to `docs-site/mkdocs.yml`. |
| Child or utility route families are not covered | Add a family mapping to the audit script or create a guide for the new workflow. |
| Docs exist but are not in navigation | Add the page to `mkdocs.yml` or remove the unused document. |
| Markdown image references are broken | Fix the screenshot path or restore the missing image. |
| Screenshots exist but are not referenced | Add the screenshot to a guide or remove it. |
| Possible credentials or secrets found | Remove the value immediately and replace it with a placeholder. |

## Add coverage for a new product page

1. Add or update the relevant guide under `docs-site/docs/`.
2. Add the page to `docs-site/mkdocs.yml`.
3. If the page is a sidebar or quick-link route, map it in `scripts/audit-docs-coverage.mjs`.
4. If the page is a child route, map the route family to the parent guide.
5. Add a workflow guide if the page changes an end-to-end operating process.
6. Add a screenshot only when it makes the page easier to understand.
7. Run `pnpm qa:docs`.

## Release rule

Do not mark documentation complete unless `pnpm qa:docs` passes and the coverage audit page still reflects the current route/menu counts.
