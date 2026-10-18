# Disposable fixture cleanup

Date: 2026-10-17

The database audit found eight tenants matching both supported ownership markers:

- tenant code prefix: `pw-qa-`
- owner email domain: `@playwright.qa.invalid`

Each tenant was removed with `manage_playwright_workspace --cleanup`; every command returned `verified_absent: true`.

Final query result:

```text
playwright_owned_tenants_after_cleanup= 0
[]
```

No Northstar or ambiguous tenant record was modified.
