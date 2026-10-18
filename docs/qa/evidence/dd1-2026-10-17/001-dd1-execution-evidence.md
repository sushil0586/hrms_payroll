# DD-1 execution evidence

Date: 2026-10-17  
Environment: isolated local PostgreSQL 16 (`hrms-dd1-postgres`, port `55455`), Django API, production-built Next.js, single Playwright worker.

## Executed results

- `dd1-employee-lifecycle-fnf.spec.ts`: 1 passed in 34.5s. The browser created a settlement linked to the exact approved exit, persisted two lines, rejected same-maker approval, approved with a separate HR checker, applied once, and reconciled INR 42,000 gross less INR 3,000 recovery to INR 39,000 net. Disposable workspace cleanup passed.
- Probation browser scenario: 1 passed in the focused two-case run.
- Exit browser scenario: initial fixture calls failed before workflow execution because a separate Playwright request context did not inherit the production cookie. After using `requestWithBrowserSession`, the full scenario passed: 1 passed in 26.1s.
- PostgreSQL settlement lifecycle: final rerun 1 passed in 41.75s. It proved duplicate-create rejection, maker/checker separation, terminal-row mutation rejection, three applied adjustment lines, and payroll totals of gross INR 50,000, deductions INR 4,300, and net INR 45,700.
- PostgreSQL probation/exit regressions: 3 passed in the focused four-test run; the settlement test in that run failed only on the test's exception-class expectation and passed after correction.
- Django checks: no issues. Migration drift: no changes detected.
- TypeScript: passed.
- Production frontend build: passed after the settlement UI change; existing CSS mixed-support warning retained.

## Historical reruns retained

- One backend invocation used default local PostgreSQL credentials and failed during test database setup. It did not execute application code and is classified as command/environment error.
- The first real PostgreSQL settlement rerun expected `IntegrityError`; the pre-existing terminal-row trigger correctly rejected the write first as `OperationalError`. The assertion now accepts `DatabaseError` and verifies the persisted approver remains the checker.
- The first neighboring exit reruns failed in fixture creation (`Not authenticated`) before opening the exit form. The helper now makes the prerequisite request from the authenticated browser session; the complete rerun passed.

## Remaining boundary

Automatic policy-derived FnF components (leave encashment, statutory deductions, gratuity where configured) and same-record settlement-to-payment-to-finance continuity are not yet fully implemented and certified. `DD-EL-006` is therefore Partial, not Passed.
