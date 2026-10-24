"""Summarize retained Playwright executions without merging retries into unique cases."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / 'docs/qa/evidence/ui-ux-rollout-2026-10-22'
reports = []
for file in sorted(EVIDENCE.glob('*results.json')):
    data = json.loads(file.read_text())
    if not isinstance(data, dict) or 'suites' not in data:
        continue
    cases = []

    def visit(suites):
        for suite in suites:
            for spec in suite.get('specs', []):
                for test in spec.get('tests', []):
                    cases.append({
                        'title': spec.get('title'),
                        'project': test.get('projectName'),
                        'status': test.get('status'),
                        'attempts': [result.get('status') for result in test.get('results', [])],
                    })
            visit(suite.get('suites', []))

    visit(data['suites'])
    reports.append({'file': str(file.relative_to(ROOT)), 'stats': data.get('stats'), 'cases': cases})
output = EVIDENCE / 'execution-audit.json'
output.write_text(json.dumps({'note': 'Runner executions, including historical diagnostics and repeats. No combined product-pass claim.', 'reports': reports}, indent=2) + '\n')
for report in reports:
    stats = report['stats'] or {}
    print(Path(report['file']).name, {key: stats.get(key) for key in ['expected', 'unexpected', 'skipped', 'flaky']})
