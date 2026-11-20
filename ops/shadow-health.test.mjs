import test from 'node:test';
import assert from 'node:assert/strict';
import { latestMainWorkflowFailures, renderIssueBody } from './shadow-health.mjs';

const now = new Date('2026-11-20T17:00:00Z');
const makeRun = (overrides) => ({
  workflow_id: 2, name: 'Tests', head_branch: 'main', event: 'push',
  status: 'completed', conclusion: 'failure',
  created_at: '2026-11-20T16:00:00Z', html_url: 'https://github.com/example/actions/1',
  ...overrides,
});

test('a newer success clears an older failure for the same workflow', () => {
  const runs = [
    makeRun({ conclusion: 'success', created_at: '2026-11-20T16:30:00Z' }),
    makeRun({ conclusion: 'failure', created_at: '2026-11-20T16:00:00Z' }),
  ];
  assert.equal(latestMainWorkflowFailures(runs, now).length, 0);
});

test('failed PR runs, old main failures and cancelled runs do not create incidents', () => {
  const runs = [
    makeRun({ workflow_id: 1, event: 'pull_request' }),
    makeRun({ workflow_id: 2, created_at: '2026-10-01T00:00:00Z' }),
    makeRun({ workflow_id: 3, conclusion: 'cancelled' }),
  ];
  assert.equal(latestMainWorkflowFailures(runs, now).length, 0);
});

test('the latest recent main-branch failure creates one incident', () => {
  const runs = [
    makeRun({ workflow_id: 4, conclusion: 'failure' }),
    makeRun({ workflow_id: 4, created_at: '2026-11-19T00:00:00Z' }),
  ];
  const result = latestMainWorkflowFailures(runs, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Tests');
});

test('stable incident body is independent of check order, avoiding update spam', () => {
  const first = { name: 'A', detail: 'HTTP 500', url: 'https://a.example' };
  const second = { name: 'B', detail: 'HTTP 500', url: 'https://b.example' };
  assert.equal(renderIssueBody([first, second]), renderIssueBody([second, first]));
});
