import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const validStatus = new Set(['unconfirmed', 'confirmed', 'cancelled']);
const validRegions = new Set(['asia', 'europe', 'americas']);
const validGames = new Set(['kiomet', 'openfront', 'netquel', 'mk48', 'mazean', 'turnfight', 'voxmaxa']);

export function validateReadiness(data) {
  if (!data || !Array.isArray(data.sessions)) throw new Error('sessions array required');
  const seen = new Set();
  for (const s of data.sessions) {
    if (!s || typeof s !== 'object') throw new Error('Invalid session');
    if (!validGames.has(s.game) || !validRegions.has(s.region)) throw new Error('Unknown game or region');
    const id = s.game + ':' + s.region;
    if (seen.has(id)) throw new Error('Duplicate session ' + id);
    seen.add(id);
    if (!validStatus.has(s.hostStatus)) throw new Error('Invalid host status for ' + id);
    if (!Number.isInteger(s.interestedPlayers) || s.interestedPlayers < 0)
      throw new Error('Invalid interestedPlayers for ' + id);
    if (!Number.isInteger(s.confirmedPlayers) || s.confirmedPlayers < 0 ||
        s.confirmedPlayers > s.interestedPlayers)
      throw new Error('Invalid confirmedPlayers for ' + id);
    // Require an unambiguous UTC instant, not Date.parse's permissive local-date guesses.
    // A bad timestamp can otherwise silently make a session appear ready.
    if (typeof s.updatedAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(s.updatedAt) ||
        !Number.isFinite(Date.parse(s.updatedAt)) ||
        new Date(s.updatedAt).toISOString().slice(0, 19) !== s.updatedAt.slice(0, 19))
      throw new Error('Invalid updatedAt for ' + id);
  }
  return data.sessions;
}

export function readinessReport(data, now = new Date()) {
  const sessions = validateReadiness(data);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()))
    throw new Error('Invalid report timestamp');
  // Counts are only useful while their human confirmation is recent.
  const fresh = s => {
    const age = now.getTime() - Date.parse(s.updatedAt);
    return age >= 0 && age <= 7 * 24 * 60 * 60_000;
  };
  const ready = sessions.filter(s => fresh(s) && s.hostStatus === 'confirmed' && s.confirmedPlayers >= 2);
  return {
    tracked: sessions.length,
    ready: ready.length,
    needsHost: sessions.filter(s => fresh(s) && s.hostStatus !== 'confirmed')
      .map(s => s.game + ':' + s.region),
    needsPlayers: sessions.filter(s => fresh(s) && s.hostStatus === 'confirmed' && s.confirmedPlayers < 2)
      .map(s => s.game + ':' + s.region),
    readySessions: ready.map(s => s.game + ':' + s.region),
    staleSessions: sessions.filter(s => !fresh(s)).map(s => s.game + ':' + s.region)
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2] || new URL('./host-readiness.json', import.meta.url);
  const report = readinessReport(JSON.parse(readFileSync(file, 'utf8')));
  console.log(JSON.stringify(report, null, 2));
}
