import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledServers, routeEvents, recruitmentDue, recruitmentMessage } from './nre-servers.mjs';

const nre = {
  id: 'nre-empire', enabled: true, guildId: '111111111111111111',
  announcementChannelId: '222222222222222222',
  recruitmentEnabled: true, recruitmentChannelId: '333333333333333333',
  recruitmentIntervalHours: 72, games: ['kiomet', 'netquel', 'openfront'],
  regions: ['asia', 'europe', 'americas']
};
const nrc = {
  id: 'nrc-asia', enabled: true, guildId: '444444444444444444',
  announcementChannelId: '555555555555555555', recruitmentEnabled: false,
  games: ['kiomet', 'netquel'], regions: ['asia']
};
const events = [
  { id: 'kiomet-asia-1', game: 'kiomet', region: 'asia', startAt: '2026-12-05T10:00:00Z' },
  { id: 'kiomet-europe-1', game: 'kiomet', region: 'europe', startAt: '2026-12-05T17:00:00Z' },
  { id: 'netquel-asia-1', game: 'netquel', region: 'asia', startAt: '2026-12-05T10:00:00Z' },
  { id: 'openfront-americas-1', game: 'openfront', region: 'americas', startAt: '2026-12-06T02:00:00Z' },
  { id: 'special-nre-event', targetServerIds: ['nrc-asia'], startAt: '2026-12-04T10:00:00Z' },
  { id: 'unspecified-one-off', startAt: '2026-12-04T10:00:00Z' },
];

test('disabled servers do not receive posts and configurations are strictly validated', () => {
  assert.deepEqual(enabledServers({ servers: [nre, { ...nrc, enabled: false }] }), [nre]);
  assert.throws(() => enabledServers({ servers: [nre, nre] }), /Duplicate/);
  assert.throws(() => enabledServers({ servers: [{ ...nre, guildId: 'x' }] }), /Invalid Discord guild/);
  assert.throws(() => enabledServers({ servers: [{ ...nre, recruitmentChannelId: null }] }), /opt-in recruitment/);
  assert.throws(() => enabledServers({ servers: [{ ...nre, recruitmentIntervalHours: 2 }] }), /at least 72 hours/);
  assert.throws(() => enabledServers({ servers: [{ ...nre, games: [] }] }), /allowed game/);
});

test('NRC Asia receives only its opted-in games/region and specifically targeted one-offs', () => {
  assert.deepEqual(routeEvents(events, nrc).map(e => e.id),
    ['kiomet-asia-1', 'netquel-asia-1', 'special-nre-event']);
  assert.equal(routeEvents(events, nre).length, 4);
});

test('recruitment messages have a 72-hour minimum interval and cannot send DMs', () => {
  const now = new Date('2026-12-01T10:00:00Z');
  assert.equal(recruitmentDue(nre, {}, now), true);
  assert.equal(recruitmentDue(nre, {lastRecruitmentAt:'2026-11-30T10:00:00Z'}, now), false);
  assert.equal(recruitmentDue(nre, {lastRecruitmentAt:'2026-11-27T10:00:00Z'}, now), true);
  assert.equal(recruitmentDue(nrc, {}, now), false);
});

test('no recruitment message without an upcoming confirmed Discord event', () => {
  const now = new Date('2026-12-01T10:00:00Z');
  assert.equal(recruitmentMessage(nre, events, now), null);
  const message = recruitmentMessage(nre,
    [{...events[0], name:'NRE Kiomet Asia Session', discordEventId:'999999999999999999'}], now);
  assert.match(message, /Looking for players/);
  assert.match(message, /discord.com\/events\/111111111111111111\/999999999999999999/);
  assert(!message.includes('@everyone'));
});
