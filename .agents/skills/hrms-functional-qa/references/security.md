# Security verification

Use synthetic HR Admin, permitted checker, ESS employee, MSS manager/reportee, unrelated manager, and second-tenant identities according to actual permissions. Do not assume a role name grants an action.

For each protected read/write/export/lookup, test allowed role, denied role, unauthenticated access, foreign-tenant IDs, own versus other employee, and current versus former manager scope where applicable. Exercise backend endpoints directly as well as the UI/BFF; hidden buttons are not authorization evidence. Confirm no data leakage, business mutation, or successful-mutation audit on rejection. Preserve any legitimate denial audit separately.

Exercise duplicate submit, repeated idempotency key, stale version, and simultaneous competing writes in isolated PostgreSQL. Freeze expected winner/conflict behavior from existing contracts. Use deterministic coordination rather than timing-only sleeps; record both responses and final business/audit effects. Include locked historical records and downstream protection. Never weaken guards to make fixtures pass.

Evidence records role/permission snapshot, redacted request/response, exact owned object IDs, expected denial contract, final persistence, and audit attribution. Mask personal/financial data and never store tokens or passwords in reports, screenshots, or shared traces.
