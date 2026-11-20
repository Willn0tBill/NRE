const snowflake = /^\d{15,22}$/;
const slug = /^[a-z0-9][a-z0-9-]{2,39}$/;
const key = /^[a-z0-9][a-z0-9-]{2,39}$/;
function assert(ok, message) { if (!ok) throw new Error(message); }

export function enabledServers(config) {
  assert(config && Array.isArray(config.servers), 'server-targets.json must have a servers array');
  assert(config.servers.length <= 20, 'At most 20 Discord servers may be configured');
  const ids = new Set();
  const guildIds = new Set();
  for (const s of config.servers) {
    assert(s && typeof s === 'object', 'Invalid Discord server entry');
    assert(typeof s.id === 'string' && slug.test(s.id), 'Invalid server ID');
    assert(!ids.has(s.id), 'Duplicate server ID ' + s.id);
    ids.add(s.id);
    assert(typeof s.enabled === 'boolean', 'enabled flag is required for ' + s.id);
    assert(typeof s.guildId === 'string' && snowflake.test(s.guildId), 'Invalid Discord guild ID for ' + s.id);
    assert(!guildIds.has(s.guildId), 'Duplicate Discord guild ID');
    guildIds.add(s.guildId);
    assert(typeof s.announcementChannelId === 'string' && snowflake.test(s.announcementChannelId),
      'Invalid announcement channel ID for ' + s.id);
    assert(Array.isArray(s.games) && s.games.length > 0 &&
      s.games.every(g => typeof g === 'string' && key.test(g)),
      'At least one allowed game is required for ' + s.id);
    assert(Array.isArray(s.regions) && s.regions.length > 0 &&
      s.regions.every(g => typeof g === 'string' && key.test(g)),
      'At least one allowed region is required for ' + s.id);
    assert(typeof s.recruitmentEnabled === 'boolean', 'recruitmentEnabled is required for ' + s.id);
    if (s.recruitmentEnabled) {
      assert(typeof s.recruitmentChannelId === 'string' && snowflake.test(s.recruitmentChannelId),
        'A specific opt-in recruitment channel is required for ' + s.id);
      assert(Number.isInteger(s.recruitmentIntervalHours) && s.recruitmentIntervalHours >= 72,
        'Recruitment interval must be at least 72 hours for ' + s.id);
    }
  }
  return config.servers.filter(s => s.enabled);
}

export function routeEvents(events, server) {
  return events.filter(e => {
    if (Array.isArray(e.targetServerIds)) return e.targetServerIds.includes(server.id);
    return Boolean(e.game && e.region && server.games.includes(e.game) && server.regions.includes(e.region));
  });
}

export function recruitmentDue(server, state, now = new Date()) {
  if (!server.recruitmentEnabled) return false;
  const last = Date.parse(state?.lastRecruitmentAt || '');
  return !Number.isFinite(last) || now.getTime() - last >= server.recruitmentIntervalHours * 60 * 60_000;
}

export function recruitmentMessage(server, nextEvents) {
  const upcoming = nextEvents
    .filter(event => event.discordEventId && Date.parse(event.startAt) > Date.now())
    .sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 3);
  if (!upcoming.length) return null;
  const links = upcoming.map(event =>
    '- **' + event.name + '** — <t:' + Math.floor(Date.parse(event.startAt) / 1000) +
    ':F> — https://discord.com/events/' + server.guildId + '/' + event.discordEventId).join('\n');
  return '**Looking for players — NRE community sessions**\n' +
    'New and returning players are welcome. RSVP for a game below, join a team and invite a friend who wants to participate. ' +
    'No prior experience required; games depend on available volunteer hosts.\n\n' + links +
    '\n\nPrefer a different region? Ask the organizers for the right session. No mass mentions or unsolicited DMs.';
}
