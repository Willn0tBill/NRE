import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateReadiness, readinessReport, approvedSessionCoverage } from './host-readiness.mjs';

const source = JSON.parse(readFileSync(new URL('./host-readiness.json', import.meta.url), 'utf8'));

test('empty ledger is valid and never implies players or hosts', () => {
  assert.deepEqual(readinessReport(source), {
    tracked: 0, ready: 0, needsHost: [], needsPlayers: [], readySessions: [], staleSessions: []
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
  const report = readinessReport({ sessions }, new Date('2026-11-21T00:00:00Z'));
  assert.deepEqual(report.readySessions, ['kiomet:americas']);
  assert.deepEqual(report.needsHost, ['kiomet:asia']);
  assert.deepEqual(report.needsPlayers, ['kiomet:europe']);
  assert.deepEqual(report.staleSessions, []);
});

test('rejects invented or inconsistent readiness values', () => {
  const base = { game: 'kiomet', region: 'asia', hostStatus: 'confirmed',
    interestedPlayers: 1, confirmedPlayers: 1, updatedAt: '2026-11-20T00:00:00Z' };
  assert.throws(() => validateReadiness({ sessions: [base, base] }), /Duplicate/);
  assert.throws(() => validateReadiness({ sessions: [{ ...base, confirmedPlayers: 2 }] }), /Invalid confirmedPlayers/);
  assert.throws(() => validateReadiness({ sessions: [{ ...base, hostStatus: 'maybe' }] }), /Invalid host status/);
});

test('stale or future confirmations never imply a ready game', () => {
  const sessions = [
    { game: 'kiomet', region: 'asia', hostStatus: 'confirmed',
      interestedPlayers: 3, confirmedPlayers: 3, updatedAt: '2026-11-01T00:00:00Z' },
    { game: 'kiomet', region: 'europe', hostStatus: 'confirmed',
      interestedPlayers: 3, confirmedPlayers: 3, updatedAt: '2026-12-01T00:00:00Z' },
    { game: 'kiomet', region: 'americas', hostStatus: 'confirmed',
      interestedPlayers: 3, confirmedPlayers: 3, updatedAt: '2026-11-20T00:00:00Z' }
  ];
  const report = readinessReport({ sessions }, new Date('2026-11-21T00:00:00Z'));
  assert.equal(report.ready, 1);
  assert.deepEqual(report.readySessions, ['kiomet:americas']);
  assert.deepEqual(report.staleSessions, ['kiomet:asia', 'kiomet:europe']);
});

test('readiness rejects ambiguous local timestamps and invalid calendar dates', () => {
  const base = { game: 'kiomet', region: 'asia', hostStatus: 'confirmed',
    interestedPlayers: 2, confirmedPlayers: 2, updatedAt: '2026-11-20T00:00:00Z' };
  for (const timestamp of [
    '2026-11-20', '2026-11-20T00:00:00', '2026-11-20T00:00:00+08:00',
    '2026-02-30T00:00:00Z', '2026-11-20T25:00:00Z'
  ]) {
    assert.throws(() => validateReadiness({ sessions: [{ ...base, updatedAt: timestamp }] }),
      /Invalid updatedAt/, timestamp);
  }
  assert.equal(validateReadiness({ sessions: [{ ...base, updatedAt: '2026-11-20T00:00:00.123Z' }] }).length, 1);
});

test('empty ledger flags every approved weekly series without inventing a host gap', () => {
  const program = JSON.parse(readFileSync(new URL('./event-program.json', import.meta.url), 'utf8'));
  const coverage = approvedSessionCoverage(source, program);
  assert.equal(coverage.approvedSeries, 12);
  assert.equal(coverage.trackedApprovedSeries, 0);
  assert.equal(coverage.untrackedApprovedSeries.length, 12);
  assert(coverage.untrackedApprovedSeries.includes('kiomet:asia'));
  assert(!coverage.untrackedApprovedSeries.some(id => id.startsWith('mazean:')));
  assert.deepEqual(readinessReport(source).needsHost, []);
});

test('coverage removes only actually tracked approved series and ignores paused records', () => {
  const program = { programs: [
    { game: 'kiomet', region: 'asia', approved: true },
    { game: 'kiomet', region: 'europe', approved: true },
    { game: 'mazean', region: 'asia', approved: false }
  ] };
  const base = { hostStatus: 'unconfirmed', interestedPlayers: 0,
    confirmedPlayers: 0, updatedAt: '2026-11-20T00:00:00Z' };
  const data = { sessions: [
    { ...base, game: 'kiomet', region: 'asia' },
    { ...base, game: 'mazean', region: 'asia' }
  ] };
  assert.deepEqual(approvedSessionCoverage(data, program), {
    approvedSeries: 2, trackedApprovedSeries: 1, untrackedApprovedSeries: ['kiomet:europe']
  });
  assert.throws(() => approvedSessionCoverage(data, {}), /Approved event program/);
});

test('coverage rejects malformed approved game rules instead of reporting phantom series', () => {
  for (const rule of [
    { game: 'unknown-game', region: 'asia', approved: true },
    { game: 'kiomet', region: 'unknown-region', approved: true },
    { region: 'asia', approved: true },
    { game: 'kiomet', approved: true }
  ]) {
    assert.throws(
      () => approvedSessionCoverage(source, { programs: [rule] }),
      /Invalid approved game or region/
    );
  }
  assert.deepEqual(
    approvedSessionCoverage(source, { programs: [
      { game: 'kiomet', region: 'asia', approved: true },
      { game: 'kiomet', region: 'asia', approved: true }
    ] }),
    { approvedSeries: 1, trackedApprovedSeries: 0, untrackedApprovedSeries: ['kiomet:asia'] }
  );
});
