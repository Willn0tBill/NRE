import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateReadiness, readinessReport } from './host-readiness.mjs';

const source = JSON.parse(readFileSync(new URL('./host-readiness.json', import.meta.url), 'utf8'));

test('empty ledger is valid and never implies players or hosts', () => {
  assert.deepEqual(readinessReport(source), {
    tracked: 0, ready: 0, needsHost: [], needsPlayers: [], readySessions: []
  });
});

test('only confirmed hosts with two confirmed players are ready', () => {
  const sessions = [
    { game: 'kiomet', region: 'asia', hostStatus: 'unconfirmed',
      interestedPlayers: 3, confirmedPlayers: 3, updatedAt: '2026-11-20T00:00:00Z' },
    { game: 'kiomet', region: 'europe', hostStatus: 'confirmed',
      interestedPlayers: 3, confirmedPlayers: 1, updatedAt: '2026-11-20T00:00:00Z' },
    { game: 'kiomet', region: 'americas', hostStatus: 'confirmed',
      interestedPlayers: 3, confirmedPlayers: 2, updatedAt: '2026-11-20T00:00:00Z' },
  ];
  const report = readinessReport({ sessions });
  assert.deepEqual(report.readySessions, ['kiomet:americas']);
  assert.deepEqual(report.needsHost, ['kiomet:asia']);
  assert.deepEqual(report.needsPlayers, ['kiomet:europe']);
});

test('rejects invented or inconsistent readiness values', () => {
  const base = { game: 'kiomet', region: 'asia', hostStatus: 'confirmed',
    interestedPlayers: 1, confirmedPlayers: 1, updatedAt: '2026-11-20T00:00:00Z' };
  assert.throws(() => validateReadiness({ sessions: [base, base] }), /Duplicate/);
  assert.throws(() => validateReadiness({ sessions: [{ ...base, confirmedPlayers: 2 }] }), /Invalid confirmedPlayers/);
  assert.throws(() => validateReadiness({ sessions: [{ ...base, hostStatus: 'maybe' }] }), /Invalid host status/);
});
