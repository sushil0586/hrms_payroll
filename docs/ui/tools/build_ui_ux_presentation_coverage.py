"""Map executed route scopes to evidence; never infer whole-workflow acceptance."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / 'docs/qa/evidence/ui-ux-rollout-2026-10-22'
inventory = json.loads((ROOT / 'docs/ui/hrms-ui-ux-route-inventory.json').read_text())
latest = {}
for report_name in ['release-results.json', 'closure-results.json', 'final-results.json']:
    path = EVIDENCE / report_name
    if not path.exists():
        continue
    report = json.loads(path.read_text())

    def visit(suites):
        for suite in suites:
            for spec in suite.get('specs', []):
                for test in spec.get('tests', []):
                    attempts = test.get('results', [])
                    latest[(spec['title'], test.get('projectName'))] = {
                        'report': report_name,
                        'status': attempts[-1].get('status') if attempts else 'unexecuted',
                        'runner_status': test.get('status'),
                    }
            visit(suite.get('suites', []))

    visit(report.get('suites', []))

rows = {}
for row in inventory['routes']:
    route = row['route']
    scope = 'Static core route: render/reflow and table access where applicable.'
    if row['workspace'] == 'hr-admin' and '[' in route:
        title = 'dynamic form and detail route variants'
        scope = 'Grouped synthetic edit/detail coverage: 44 concrete variants across 28 route patterns; no service-driven mutation claim.'
    elif row['workspace'] == 'finance-manager':
        title = 'finance shell preserves its authorized dashboard at every width'
    elif row['workspace'] == 'support' or route == '/workspace-access':
        title = 'support keeps an ungranted employee session denied in the shared standalone presentation'
        scope = 'Ungranted Support denial, or assigned-employee workspace redirect; other support grants/access states remain unexecuted.'
    elif row['workspace'] == 'docs':
        title = 'standalone route /docs'
        scope = 'Authenticated guide root; not every documentation slug.'
    elif row['workspace'] in ['public-root', 'login', 'forgot-password', 'reset-password']:
        title = f'standalone route {route}'
        scope = 'Standalone layout render/reflow; no exhaustive account-recovery/security claim.'
    else:
        title = f'screen {route}'
    projects = {project: latest.get((title, project), {'status': 'pending', 'report': None}) for project in ['chromium', 'firefox', 'webkit']}
    passed = all(item['status'] == 'passed' for item in projects.values())
    rows[route] = {'status': 'passed' if passed else 'pending-or-failed', 'case': title, 'scope': scope, 'projects': projects}

output = {'scope': 'Executed presentation scopes across separately identified immutable builds. Not full product/workflow/WCAG/release acceptance.', 'route_count': len(rows), 'passed_route_scopes': sum(row['status'] == 'passed' for row in rows.values()), 'rows': rows}
(EVIDENCE / 'presentation-coverage.json').write_text(json.dumps(output, indent=2) + '\n')
print(f"Executed three-engine route scopes: {output['passed_route_scopes']}/{output['route_count']}")
