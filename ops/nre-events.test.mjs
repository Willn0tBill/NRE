import test from 'node:test';
import assert from 'node:assert/strict';
import { approvedEvents, planActions } from './nre-events.mjs';

const sample = {
  id: 'community-skirmish',
  name: 'NRE Community Skirmish',
  description: 'Play a friendly coordinated strategy match.',
  location: 'Kiomet',
  startAt: '2026-11-28T19:00:00Z',
  endAt: '2026-11-28T20:00:00Z',
  approved: true,
};
const now = new Date('2026-11-27T19:30:00Z');

test('requires explicit approval before scheduling', () => {
  assert.deepEqual(approvedEvents({ events: [{ ...sample, approved: false }] }), []);
  assert.deepEqual(approvedEvents({ events: [sample] }), [sample]);
});

test('rejects duplicate IDs and invalid times', () => {
  assert.throws(() => approvedEvents({ events: [sample, sample] }), /Duplicate/);
  assert.throws(() => approvedEvents({ events: [{ ...sample, endAt: sample.startAt }] }), /endAt/);
  assert.throws(() => approvedEvents({ events: [{ ...sample, startAt: 'tomorrow' }] }), /startAt/);
  assert.throws(() => approvedEvents({ events: [{ ...sample, approved: 'yes' }] }), /approved/);
});

test('first encounter creates one scheduled event and one announcement', () => {
  const actions = planActions([sample], {}, now);
  assert.deepEqual(actions.map((action) => action.type), ['create', 'announce']);
});

test('repeat runs do not duplicate scheduling or announcements', () => {
  const state = { [sample.id]: { discordEventId: '123456789012345678', announced: true, reminders: {} } };
  assert.deepEqual(planActions([sample], state, new Date('2026-11-25T19:00:00Z')), []);
});

test('reminders are individually idempotent and only sent in their window', () => {
  const state = { [sample.id]: { discordEventId: '123456789012345678', announced: true, reminders: { '24h': true } } };
  const at3h = new Date('2026-11-28T16:30:00Z');
  assert.deepEqual(planActions([sample], state, at3h).map((action) => action.label), ['3h']);
  state[sample.id].reminders['3h'] = true;
  assert.deepEqual(planActions([sample], state, at3h), []);
  assert.deepEqual(planActions([sample], state, new Date('2026-11-28T18:30:00Z')).map((action) => action.label), ['1h']);
});

test('does not create stale, imminent or distant events', () => {
  assert.deepEqual(planActions([sample], {}, new Date('2026-11-28T19:05:00Z')), []);
  assert.deepEqual(planActions([sample], {}, new Date('2026-11-28T18:50:00Z')), []);
  assert.deepEqual(planActions([sample], {}, new Date('2026-11-01T00:00:00Z')), []);
});

test('does not send all three reminders on a late check', () => {
  const state = { [sample.id]: { discordEventId: '123456789012345678', announced: true, reminders: {} } };
  const actions = planActions([sample], state, new Date('2026-11-28T18:50:00Z'));
  assert.equal(actions.filter((action) => action.type === 'remind').length, 0);
});
