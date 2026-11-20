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
    // Recruitment is part of each game event announcement. A separate outreach
    // channel or recurring recruitment campaign is deliberately unsupported.
  }
  return config.servers.filter(s => s.enabled);
}

export function routeEvents(events, server) {
  return events.filter(e => {
    if (Array.isArray(e.targetServerIds)) return e.targetServerIds.includes(server.id);
    return Boolean(e.game && e.region && server.games.includes(e.game) && server.regions.includes(e.region));
  });
}

