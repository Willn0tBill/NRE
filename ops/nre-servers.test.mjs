import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledServers, routeEvents } from './nre-servers.mjs';
import { messageText } from './nre-events.mjs';
import { readFileSync } from 'node:fs';

const real = JSON.parse(readFileSync(new URL('./server-targets.json', import.meta.url), 'utf8'));
const nre = {
  id: 'nre-empire', enabled: true, guildId: '1544610643389456484',
  announcementChannelId: '1544872647400230912',
  games: ['kiomet', 'openfront', 'netquel', 'mk48'],
  regions: ['asia', 'europe', 'americas']
};
const nrc = {
  id: 'nrc-asia', enabled: true, guildId: '444444444444444444',
  announcementChannelId: '555555555555555555',
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

test('NRE Empire guild is configured for the approved shared events channel', () => {
  assert.equal(real.servers.length, 1);
  assert.deepEqual(enabledServers(real), [nre]);
  assert.equal(real.servers[0].guildId, '1544610643389456484');
  assert.equal(real.servers[0].announcementChannelId, '1544872647400230912');
  assert.equal('recruitmentChannelId' in real.servers[0], false);
});

test('disabled servers do not receive posts; invalid destinations fail validation', () => {
  assert.deepEqual(enabledServers({ servers: [nre, { ...nrc, enabled: false }] }), [nre]);
  assert.throws(() => enabledServers({ servers: [nre, nre] }), /Duplicate/);
  assert.throws(() => enabledServers({ servers: [{ ...nre, guildId: 'x' }] }), /Invalid Discord guild/);
  assert.throws(() => enabledServers({ servers: [{ ...nre, announcementChannelId: null }] }), /Invalid announcement/);
  assert.throws(() => enabledServers({ servers: [{ ...nre, games: [] }] }), /allowed game/);
});

test('NRC Asia receives only selected games and regions', () => {
  assert.deepEqual(routeEvents(events, nrc).map(e => e.id),
    ['kiomet-asia-1', 'netquel-asia-1', 'special-nre-event']);
  assert.equal(routeEvents(events, nre).length, 4);
});

test('every event announcement invites the entire Empire, including integrations', () => {
  const event = {
    id: 'kiomet-asia-2026-12-04',
    name: 'Empire Kiomet — Asia Session',
    description: 'Play together in Kiomet.',
    location: 'Kiomet',
    startAt: '2026-12-04T10:00:00Z'
  };
  const guildId = nre.guildId;
  const discordEventId = '999999999999999999';
  const announcement = messageText(event, 'announce', guildId, discordEventId);
  const reminder = messageText(event, '1h', guildId, discordEventId);
  assert.match(announcement, /ALL EMPIRE MEMBERS ARE INVITED/);
  assert.match(announcement, /integrated division/);
  assert.match(announcement, /play.*grow the Empire/);
  assert.match(announcement, /discord\.com\/events\/1544610643389456484\/999999999999999999/);
  assert.match(reminder, /All Empire members, including integrated communities/);
  assert.match(reminder, /play for the Empire/);
  assert.doesNotMatch(announcement, /@everyone|@here/);
  assert.doesNotMatch(reminder, /@everyone|@here/);
});
