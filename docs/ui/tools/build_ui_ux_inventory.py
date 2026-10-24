"""Rebuild the static route inventory. No browser or compliance claims are inferred."""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
APP = ROOT / 'web/src/app'
OUT = ROOT / 'docs/ui'
DATE = '2026-10-22'
# Exact 30-route certificate scope, retained independently of untracked evidence.
ATTENDANCE_ROUTES = ['/hr-admin/attendance-close', '/hr-admin/attendance-operations', '/hr-admin/attendance-policies', '/hr-admin/attendance-policies/[itemId]/edit', '/hr-admin/attendance-policies/new', '/hr-admin/attendance-policy-assignments', '/hr-admin/attendance-policy-assignments/[itemId]/edit', '/hr-admin/attendance-policy-assignments/new', '/hr-admin/attendance-records', '/hr-admin/attendance-records/[itemId]/edit', '/hr-admin/attendance-regularizations', '/hr-admin/attendance-regularizations/[itemId]/review', '/hr-admin/employee-shift-assignments', '/hr-admin/employee-shift-assignments/[itemId]/edit', '/hr-admin/employee-shift-assignments/new', '/hr-admin/holiday-calendars', '/hr-admin/holiday-calendars/[itemId]/edit', '/hr-admin/holiday-calendars/new', '/hr-admin/reports/attendance', '/hr-admin/reports/attendance-derivation-exceptions', '/hr-admin/reports/attendance-exceptions', '/hr-admin/reports/attendance-register', '/hr-admin/reports/leave-attendance-collisions', '/hr-admin/shift-roster-templates', '/hr-admin/shift-roster-templates/[itemId]/edit', '/hr-admin/shift-roster-templates/new', '/hr-admin/shifts', '/hr-admin/shifts/[itemId]/edit', '/hr-admin/shifts/new']
tracked = (OUT / 'hrms-hr-admin-coverage-tracker.md').read_text()
old_rows = {}
for line in tracked.splitlines():
    match = re.match(r'\| \[(/hr-admin[^\]]*)\]', line)
    if match:
        old_rows[match[1]] = line


def classify(route):
    old = old_rows.get(route, '')
    if route in ATTENDANCE_ROUTES:
        return 'aligned-scoped', 'hrms-hr-admin-attendance-family-certification.md', 'G01'
    if route.startswith('/hr-admin/leave-') or route == '/hr-admin/reports/leave-balance':
        return 'aligned-scoped', 'hrms-leave-phase2-design-certification.md', 'G01'
    if route == '/hr-admin/employees':
        return 'aligned-scoped', 'hrms-hr-admin-employees-standardization-certification.md', 'G02'
    if route == '/ess/leave' or route == '/tenant-admin/leave-year' or route == '/mss/approvals':
        return 'aligned-scoped', 'hrms-leave-phase2-design-certification.md', 'G01'
    if route == '/ess/attendance':
        return 'aligned-scoped', 'hrms-ess2-attendance-certification.md', 'G03'
    if route == '/ess' or route.startswith('/ess/'):
        return 'partial-evidence', 'hrms-ess-coverage-tracker.md', 'G04'
    if route == '/mss':
        return 'pending-review', None, 'G05'
    if route == '/mss/notifications':
        return 'pending-review', None, 'G06'
    if route.startswith('/tenant-admin'):
        return 'partial-shell', 'hrms-leave-blocker-closure-certification.md', 'G07'
    if route.startswith('/platform-admin') or route.startswith('/finance-manager'):
        return 'pending-review', None, 'G08'
    if route.startswith('/hr-admin/employees/'):
        return 'pending-review', 'hrms-hr-admin-coverage-tracker.md', 'G02'
    if route.startswith('/hr-admin/document') or route.startswith('/hr-admin/employee-documents') or route.startswith('/hr-admin/generated-letters'):
        return 'pending-review', 'hrms-hr-admin-coverage-tracker.md', 'G09'
    if route.startswith('/hr-admin/') or route == '/hr-admin':
        return 'pending-review', 'hrms-hr-admin-coverage-tracker.md', 'G10'
    return 'pending-review', None, 'G11'


def local_sources(page):
    """Follow literal local imports/re-exports; external/dynamic modules remain unexpanded."""
    seen = set()
    queue = [page]
    while queue:
        path = queue.pop()
        if path in seen:
            continue
        seen.add(path)
        source = path.read_text()
        for spec in re.findall(r'(?:from\s*|import\s*)[\'\"]([^\'\"]+)[\'\"]', source):
            if spec.startswith('@/'):
                base = ROOT / 'web/src' / spec[2:]
            elif spec.startswith('.'):
                base = path.parent / spec
            else:
                continue
            for candidate in [base.with_suffix('.tsx'), base.with_suffix('.ts'), base / 'index.tsx', base / 'index.ts']:
                if candidate.is_file():
                    queue.append(candidate.resolve())
                    break
    return seen


rows = []
for page in sorted(APP.rglob('page.tsx')):
    route = '/' + page.parent.relative_to(APP).as_posix()
    if route == '/.':
        route = '/'
    workspace = page.relative_to(APP).parts[0] if len(page.relative_to(APP).parts) > 1 else 'public-root'
    status, evidence, gap = classify(route)
    direct = page.read_text()
    closure = local_sources(page)
    combined = '\n'.join(p.read_text() for p in closure)
    components = [name for name in ['PageIntro', 'WorkspaceStandardHeader', 'WorkspaceFilterForm', 'WorkspaceTableScrollRegion', 'PaginationBar', 'HrAdminActionModal', 'MetricTile'] if name in combined]
    signals = []
    if '<table' in direct:
        signals.append('direct table: inspect semantics/scroll')
    if 'useState' in direct:
        signals.append('direct state: inspect committed/draft behavior')
    if 'window.confirm' in combined:
        signals.append('native confirm in import closure: inspect owning action')
    layout = APP / workspace / 'layout.tsx'
    shell = 'no workspace layout'
    if layout.exists():
        text = layout.read_text()
        shell = 'HR adapter' if 'HrAdminChrome' in text else ('explicit Accerio' if 'appearance="accerio"' in text else ('WorkspaceChrome default' if 'WorkspaceChrome' in text else 'custom layout'))
    rows.append(dict(route=route, workspace=workspace, source=page.relative_to(ROOT).as_posix(), status=status, evidence=evidence, gap=gap, shell=shell, shared_component_signals=components, direct_review_signals=signals, scanned_local_modules=len(closure), fresh_browser_review=False))

coverage_path = ROOT / 'docs/qa/evidence/ui-ux-rollout-2026-10-22/presentation-coverage.json'
coverage = json.loads(coverage_path.read_text()) if coverage_path.exists() else {}
for row in rows:
    row['presentation_execution'] = coverage.get('rows', {}).get(row['route'], {'status': 'unexecuted'})

payload = dict(snapshot_date=DATE, method='Static route census, literal local import closure, curated prior-certificate mappings. Historical evidence classification plus separately linked executed presentation scopes. Component presence is not compliance.', counts=dict(total=len(rows), by_workspace=dict(sorted(Counter(r['workspace'] for r in rows).items())), by_status=dict(sorted(Counter(r['status'] for r in rows).items()))), routes=rows)
(OUT / 'hrms-ui-ux-route-inventory.json').write_text(json.dumps(payload, indent=2) + '\n')
lines = ['# UI/UX route inventory', '', f'Snapshot: {DATE}. Generated by `python3 docs/ui/tools/build_ui_ux_inventory.py`.', '', 'Read the [gap tracker](hrms-ui-ux-gap-tracker.md) for status definitions, priorities and acceptance rules. Every row is a route pattern, not a count of records, dialogs or permission permutations. Historical status labels are retained. Later executed presentation scopes are recorded separately in [the rollout report](hrms-ui-ux-rollout-certification.md) and the machine inventory; `fresh_browser_review=false` means no claim of complete manual workflow review. Shared signals follow literal local imports, including transitive shared helpers; presence/absence does not establish compliance or a defect. Ancestor layout behavior is recorded separately. Dynamic imports, runtime branches, menu visibility and server authorization are not resolved by this scan.', '', '| Workspace | Route patterns |', '| --- | ---: |']
for key, value in payload['counts']['by_workspace'].items():
    lines.append(f'| {key} | {value} |')
lines += [f'| **Total** | **{len(rows)}** |', '', '| Status | Routes |', '| --- | ---: |']
for key, value in payload['counts']['by_status'].items():
    lines.append(f'| {key} | {value} |')
for workspace in payload['counts']['by_workspace']:
    lines += ['', f'## {workspace}', '', '| Route / source | Status | Shell | Shared signals | Evidence | Review item | Presentation execution |', '| --- | --- | --- | --- | --- | --- | --- |']
    for row in rows:
        if row['workspace'] != workspace:
            continue
        evidence = f"[record]({row['evidence']})" if row['evidence'] else 'No mapping in this audit'
        components = ', '.join(row['shared_component_signals']) or 'No selected signal; inspect composition'
        lines.append(f"| [{row['route']}](../../{row['source']}) | {row['status']} | {row['shell']} | {components} | {evidence} | [{row['gap']}](hrms-ui-ux-gap-tracker.md#{row['gap'].lower()}) | {row['presentation_execution']['status']} |")
(OUT / 'hrms-ui-ux-route-inventory.md').write_text('\n'.join(lines) + '\n')
print(json.dumps(payload['counts'], indent=2))
