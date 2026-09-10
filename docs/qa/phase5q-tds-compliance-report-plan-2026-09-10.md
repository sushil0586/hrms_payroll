# Phase 5Q: India TDS Compliance Report

Date: 2026-09-10

## Goal

Add and certify a browser-visible India TDS compliance report for HR admin payroll statutory operations. The report must show whether tenant payroll data is ready for TDS e-file generation without hardcoding government file formats or provider behavior into the product.

## Current Product Coverage

- TDS exists as configurable statutory component type `tax_deducted_at_source`.
- Employee statutory profiles capture PAN, tax regime, previous employment income, and previous tax deducted.
- Employee statutory declarations and proof items support submit, verify, reject, and lock lifecycle.
- Payroll calculation can consume configured TDS annualization, declarations, slabs, and previous employment values.
- Statutory filing calendars, employer registrations, output profile refs, provider refs, and config snapshots already exist.
- Generic statutory return and challan artifacts can flow through payroll outputs and finance handoff.

## Added Compliance Report

The HR admin Payroll Statutory workspace now exposes a `TDS e-file report` panel with:

- TDS component readiness.
- Form 24Q calendar readiness.
- Employee PAN coverage.
- Employee tax regime coverage.
- Locked declaration coverage.
- Provider route readiness.
- Configurable form reference.
- Configurable FVU/e-file validation profile reference.
- Configurable challan mapping reference.
- Configurable provider route reference.
- Explicit production filing guard for official Form 24Q/FVU/provider certification.

## Certification Boundary

This phase certifies tenant-data readiness and product traceability. It does not certify a real government-uploadable FVU file yet.

Production e-file certification still requires:

- Official Form 24Q row schema mapping.
- Deductee salary detail mapping.
- Challan/BIN/BSR/payment mapping.
- PAN validation outcomes.
- FVU-compatible file generation.
- Provider or portal submission integration.
- Acknowledgement/receipt lifecycle.

## Browser Done Gate

- HR admin can open `/hr-admin/payroll-statutory`.
- `TDS e-file report` is visible.
- Return profile, deductee coverage, form reference, FVU profile, challan mapping, provider route, PAN coverage, TDS component, Form 24Q calendar, and production filing guard are visible.
- Report renders readiness states as `Ready` or `Needs setup`.
- Existing statutory workspace sections remain visible.
- No horizontal overflow is introduced.

## Confidence

- TDS calculation confidence: 86%.
- TDS compliance readiness report confidence: 78%.
- TDS e-file production submission confidence: 50%.

## External Reference Boundary

The report uses configurable references for Form 24Q, FVU validation, challan mapping, and provider submission because statutory forms and filing utilities must be validated against official Income Tax Department and Protean/TIN channels before production use.
