import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expandEventProgram, localTimeToUtc } from './nre-event-program.mjs';
import { approvedEvents, planActions } from './nre-events.mjs';

const source = JSON.parse(readFileSync(new URL('./event-program.json', import.meta.url), 'utf8'));
const now = new Date('2026-11-26T00:00:00Z');
const expectedGames = ['kiomet', 'openfront', 'netquel'];
const expectedRegions = ['asia', 'europe', 'americas'];

test('each of three games has independent 6 PM regional sessions, not a combined event', () => {
  assert.equal(source.enabled, true);
  assert.equal(source.programs.length, 9);
  const events = expandEventProgram(source, now);
  assert.equal(events.length, 18);
  assert.equal(approvedEvents({ events }).length, 18);
  for (const game of expectedGames) {
    for (const region of expectedRegions) {
      const matching = events.filter(e => e.game === game && e.region === region);
      assert.equal(matching.length, 2, game + '-' + region);
      assert(matching.every(e => (Date.parse(e.endAt) - Date.parse(e.startAt)) === 60 * 60_000));
      assert(matching.every(e => e.id.startsWith(game + '-' + region + '-')));
    }
  }
  assert(events.every(e => e.approved));
});

test('all three Kiomet Friday sessions begin 6 PM in their respective zones', () => {
  const events = expandEventProgram(source, now);
  const first = region => events.find(e => e.game === 'kiomet' && e.region === region);
  assert.equal(first('asia').startAt, '2026-11-27T10:00:00.000Z');
  assert.equal(first('europe').startAt, '2026-11-27T17:00:00.000Z');
  assert.equal(first('americas').startAt, '2026-11-28T02:00:00.000Z');
});

test('first processing pass creates upcoming events without blasting two weeks of announcements', () => {
  const events = expandEventProgram(source, now);
  const actions = planActions(events, {}, now);
  assert.equal(actions.filter(a => a.type === 'create').length, 18);
  assert(actions.filter(a => a.type === 'announce').length <= 9);
  assert(actions.filter(a => a.type === 'announce').length > 0);
});

test('future event IDs remain stable and state prevents duplicate actions', () => {
  const events = expandEventProgram(source, now);
  const state = Object.fromEntries(events.map(e => [e.id, {
    discordEventId: '123456789012345678', announced: true, reminders: {}
  }]));
  assert.equal(planActions(events, state, now).length, 0);
});

test('program off and individual unapproved sessions are not scheduled', () => {
  assert.deepEqual(expandEventProgram({ ...source, enabled: false }, now), []);
  const allDisabled = { ...source, programs: source.programs.map(rule => ({ ...rule, approved: false })) };
  assert.deepEqual(expandEventProgram(allDisabled, now), []);
});

test('Pacific, European, and Asian timezone conversions account for local daylight saving', () => {
  assert.equal(localTimeToUtc(2027, 3, 6, 18, 0, 'America/Los_Angeles').toISOString(), '2027-03-07T02:00:00.000Z');
  assert.equal(localTimeToUtc(2027, 3, 13, 18, 0, 'America/Los_Angeles').toISOString(), '2027-03-14T02:00:00.000Z');
  assert.equal(localTimeToUtc(2027, 3, 20, 18, 0, 'America/Los_Angeles').toISOString(), '2027-03-21T01:00:00.000Z');
  assert.equal(localTimeToUtc(2027, 3, 20, 18, 0, 'Europe/Berlin').toISOString(), '2027-03-20T17:00:00.000Z');
  assert.equal(localTimeToUtc(2027, 4, 3, 18, 0, 'Europe/Berlin').toISOString(), '2027-04-03T16:00:00.000Z');
  assert.equal(localTimeToUtc(2027, 4, 3, 18, 0, 'Asia/Shanghai').toISOString(), '2027-04-03T10:00:00.000Z');
  assert.throws(() => localTimeToUtc(2027, 3, 14, 2, 30, 'America/Los_Angeles'), /Nonexistent/);
});

test('reject malformed or duplicated regional rules', () => {
  const first = source.programs[0];
  assert.throws(() => expandEventProgram({ ...source, programs: [first, first] }, now), /Duplicate/);
  assert.throws(() => expandEventProgram({ ...source, programs: [{ ...first, localStart: '25:00' }] }, now), /Invalid localStart/);
  assert.throws(() => expandEventProgram({ ...source, programs: [{ ...first, timezone: 'Invalid/Zone' }] }, now), /timezone/);
});
