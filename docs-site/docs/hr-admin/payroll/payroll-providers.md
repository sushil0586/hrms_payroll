# Payroll Providers

Payroll Providers manages integrations with external payroll, banking, filing, or delivery systems.

## Purpose

Use this page to configure and monitor provider connections, mapping packs, certification evidence, delivery jobs, and callbacks.

## Provider readiness rule

Do not use a provider for live payroll until the connection, mapping pack, and certification evidence are all ready for the tenant.

## Provider concepts

| Concept | Meaning |
| --- | --- |
| Connection | Provider endpoint and credential configuration. |
| Mapping pack | Field mapping between HRMS and provider format. |
| Certification | Proof that provider setup is ready. |
| Delivery | A file or payload sent to provider. |
| Callback | Provider response after delivery. |

![Payroll Providers certification](../../assets/screenshots/payroll/payroll-providers-certification.png)

## Buttons and actions

| Button | What it does |
| --- | --- |
| Run certification | Tests provider readiness. |
| Activate mapping pack | Makes mapping pack available for delivery. |
| Archive mapping pack | Retires old mapping pack. |
| Simulate | Tests mapping without real delivery. |
| Export | Downloads mapping pack or evidence. |
| Schedule retry | Retries failed provider delivery later. |

## Workflow

1. Create provider connection.
2. Configure credentials and endpoint.
3. Create or import mapping pack.
4. Simulate mapping.
5. Run certification.
6. Activate mapping pack.
7. Use provider in handoff.
8. Monitor deliveries and callbacks.

## Certification checklist

| Check | Expected result |
| --- | --- |
| Endpoint | Correct environment and provider URL. |
| Credentials | Stored securely and not visible in docs or screenshots. |
| Mapping pack | Active version matches provider format. |
| Simulation | Test payload maps without errors. |
| Certification | Latest certification is successful. |
| Callback | Provider responses are received and stored. |
| Retry policy | Failed jobs have clear retry behavior. |

## Common mistakes

- Using uncertified provider in live payroll.
- Activating wrong mapping pack version.
- Ignoring callback failures.
- Retrying permanent failures repeatedly.
- Not storing certification evidence.

## FAQ

### Should provider setup be completed before payroll close?

Yes, if the tenant depends on provider delivery for bank advice, statutory filing, or payroll handoff.

### What if provider certification fails?

Do not proceed with automated delivery. Fix endpoint, credentials, or mapping pack first, or use an approved manual handoff fallback with evidence.
