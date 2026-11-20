import test from 'node:test';
import assert from 'node:assert/strict';
import { expandEventProgram, localTimeToUtc } from './nre-event-program.mjs';
import { planActions, approvedEvents } from './nre-events.mjs';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('./event-program.json', import.meta.url), 'utf8'));

test('single combined NRE Game Night replaces separate Kiomet and Openfront plans', () => {
  assert.equal(source.programs.length, 1);
  const events = expandEventProgram(source, new Date('2026-12-01T12:00:00Z'));
  assert.equal(events.length, 2);
  assert(events.every(event => /Kiomet.*Openfront/.test(event.name)));
  assert(events.every(event => event.location.includes('Discord')));
  assert.deepEqual(events.map(event => event.id), [
    'nre-game-night-2026-12-05', 'nre-game-night-2026-12-12'
  ]);
});

test('Saturday 6 PM Pacific becomes Sunday 2 AM UTC in December', () => {
  const events = expandEventProgram(source, new Date('2026-12-01T12:00:00Z'));
  assert.equal(events[0].startAt, '2026-12-06T02:00:00.000Z');
  assert.equal(events[0].endAt, '2026-12-06T04:00:00.000Z');
});

test('one combined event results in one create and one announcement', () => {
  const events = approvedEvents({events: expandEventProgram(source, new Date('2026-12-01T12:00:00Z'))});
  const actions = planActions(events, {}, new Date('2026-12-01T12:00:00Z'));
  assert.equal(actions.filter(a => a.type === 'create').length, 2);
  assert.equal(actions.filter(a => a.type === 'announce').length, 2);
  const firstEvent = events[0];
  const done = { [firstEvent.id]: {discordEventId:'123456789012345678',announced:true,reminders:{}} };
  const next = planActions(events, done, new Date('2026-12-01T12:00:00Z'));
  assert(!next.some(a => a.event.id === firstEvent.id));
});

test('recurring program does not run if disabled or unapproved', () => {
  assert.deepEqual(expandEventProgram({...source, enabled:false}, new Date('2026-12-01T12:00:00Z')), []);
  assert.deepEqual(expandEventProgram({...source, programs:[{...source.programs[0], approved:false}]}, new Date('2026-12-01T12:00:00Z')), []);
});

test('never schedules dates before configured first session', () => {
  const events = expandEventProgram(source, new Date('2026-11-20T18:00:00Z'));
  assert.deepEqual(events, []);
});

test('Pacific time accounts for daylight-saving transitions', () => {
  assert.equal(localTimeToUtc(2027,3,6,18,0,'America/Los_Angeles').toISOString(), '2027-03-07T02:00:00.000Z');
  assert.equal(localTimeToUtc(2027,3,13,18,0,'America/Los_Angeles').toISOString(), '2027-03-14T02:00:00.000Z');
  assert.equal(localTimeToUtc(2027,3,20,18,0,'America/Los_Angeles').toISOString(), '2027-03-21T01:00:00.000Z');
  assert.throws(() => localTimeToUtc(2027,3,14,2,30,'America/Los_Angeles'), /Nonexistent/);
});

test('bad rules and duplicate program IDs are rejected', () => {
  const first = source.programs[0];
  assert.throws(() => expandEventProgram({...source, programs:[first, first]}, new Date('2026-12-01T12:00:00Z')), /Duplicate/);
  assert.throws(() => expandEventProgram({...source, programs:[{...first, localStart:'99:40'}]}, new Date('2026-12-01T12:00:00Z')), /Invalid localStart/);
});
