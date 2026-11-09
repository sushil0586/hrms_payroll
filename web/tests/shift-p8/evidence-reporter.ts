import { appendFileSync, closeSync, fsyncSync, openSync } from 'node:fs';
import path from 'node:path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestError, TestResult } from '@playwright/test/reporter';

/** Original per-event machine evidence; supplements, never reconstructs/replaces native results.json. */
export default class ShiftEvidenceJournal implements Reporter {
  private fd?: number;
  private sequence = 0;
  private completed = new Set<string>();
  private selected: string[] = [];
  private emit(event: string, value: object) {
    if (this.fd === undefined) throw new Error('Shift evidence journal was not initialized');
    appendFileSync(this.fd, JSON.stringify({ sequence: ++this.sequence, at: new Date().toISOString(), event, ...value }) + '\n');
    fsyncSync(this.fd);
  }
  constructor() {
    const run = process.env.HRMS_PILOT_RUN;
    if (!run) throw new Error('Reserved evidence directory required for incremental journal');
    this.fd = openSync(path.join(run, 'playwright-events.jsonl'), 'ax', 0o600);
    this.emit('reporterInitialized', { node: process.version, sourceInventory: 'source-candidate.json' });
  }
  onBegin(config: FullConfig, suite: Suite) {
    const tests = suite.allTests().map(test => ({ id: test.id, title: test.title, titlePath: test.titlePath(), location: test.location, project: test.parent.project()?.name, browser: test.parent.project()?.use.browserName, viewport: test.parent.project()?.use.viewport }));
    this.selected = tests.map(test => test.id);
    this.emit('begin', { kind: 'Original incremental Playwright reporter events, not reconstructed native results.json', sourceInventory: 'source-candidate.json', node: process.version, workers: config.workers, selectedTests: tests });
  }
  onTestBegin(test: TestCase, result: TestResult) {
    this.emit('testBegin', { id: test.id, project: test.parent.project()?.name, title: test.title, location: test.location, retry: result.retry, startTime: result.startTime.toISOString() });
  }
  onTestEnd(test: TestCase, result: TestResult) {
    this.completed.add(test.id);
    this.emit('testEnd', { id: test.id, project: test.parent.project()?.name, title: test.title, location: test.location, status: result.status, expectedStatus: test.expectedStatus, duration: result.duration, retry: result.retry, startTime: result.startTime.toISOString(), errors: result.errors, attachments: result.attachments.map(attachment => ({ name: attachment.name, contentType: attachment.contentType, path: attachment.path, body: attachment.body?.toString('base64') })) });
  }
  onError(error: TestError) { this.emit('runnerError', { error }); }
  onEnd(result: FullResult) {
    this.emit('end', { status: result.status, duration: result.duration, completed: this.completed.size, selected: this.selected.length, withoutCompletedResult: this.selected.filter(id => !this.completed.has(id)), note: 'Incomplete or absent testEnd records are never PASS.' });
  }
  async onExit() {
    if (this.fd !== undefined) closeSync(this.fd);
    this.fd = undefined;
  }
}
