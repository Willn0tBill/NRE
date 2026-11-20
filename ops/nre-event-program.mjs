const DAY = 86_400_000;
const WINDOW = 14 * DAY;

function assert(value, message) {
  if (!value) throw new Error(message);
}

function zonedParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(date)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, Number(part.value)]));
  return parts;
}

export function localTimeToUtc(year, month, day, hour, minute, timezone) {
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desired;
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = zonedParts(new Date(candidate), timezone);
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const delta = desired - actual;
    if (delta === 0) break;
    candidate += delta;
  }
  const checked = zonedParts(new Date(candidate), timezone);
  assert(checked.year === year && checked.month === month && checked.day === day &&
    checked.hour === hour && checked.minute === minute,
    'Nonexistent or unsupported local time in ' + timezone);
  return new Date(candidate);
}

/**
 * Expand explicit approved weekly NRE programs into stable event IDs.
 * This is only a plan; dispatching still requires Discord authorization.
 * The output is bounded to 14 days so no maintenance of dated event JSON is needed.
 */
export function expandEventProgram(config, now = new Date()) {
  assert(config && typeof config === 'object', 'Event program must be an object');
  assert(config.enabled === true || config.enabled === false, 'Program enabled must be boolean');
  if (!config.enabled) return [];
  assert(config.timezone === 'America/Los_Angeles', 'Unsupported event program timezone');
  assert(Array.isArray(config.programs) && config.programs.length <= 6,
    'Program must contain at most six weekly rules');

  const current = zonedParts(now, config.timezone);
  const localDayStart = Date.UTC(current.year, current.month - 1, current.day);
  const planned = [];
  const ruleNames = new Set();

  for (const rule of config.programs) {
    assert(rule && typeof rule.id === 'string' && /^[a-z0-9][a-z0-9-]{2,24}$/.test(rule.id),
      'Invalid program ID');
    assert(!ruleNames.has(rule.id), 'Duplicate program ID ' + rule.id);
    ruleNames.add(rule.id);
    assert(Number.isInteger(rule.dayOfWeek) && rule.dayOfWeek >= 0 && rule.dayOfWeek <= 6,
      'Invalid dayOfWeek for ' + rule.id);
    assert(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(rule.localStart || ''),
      'Invalid localStart for ' + rule.id);
    assert(Number.isInteger(rule.durationMinutes) && rule.durationMinutes >= 15 &&
      rule.durationMinutes <= 240, 'Invalid duration for ' + rule.id);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(rule.startOn || ''),
      'Invalid startOn for ' + rule.id);
    assert(typeof rule.name === 'string' && rule.name.length >= 3 && rule.name.length <= 100,
      'Invalid name for ' + rule.id);
    assert(typeof rule.description === 'string' && rule.description.length >= 3 &&
      rule.description.length <= 650, 'Invalid description for ' + rule.id);
    assert(typeof rule.location === 'string' && rule.location.length >= 2 &&
      rule.location.length <= 100, 'Invalid location for ' + rule.id);
    assert(rule.approved === true || rule.approved === false, 'Explicit approved flag required');
    if (!rule.approved) continue;

    for (let offset = 0; offset <= 15; offset++) {
      const date = new Date(localDayStart + offset * DAY);
      if (date.getUTCDay() !== rule.dayOfWeek) continue;
      const y = date.getUTCFullYear();
      const m = date.getUTCMonth() + 1;
      const d = date.getUTCDate();
      const dateString = [String(y).padStart(4, '0'), String(m).padStart(2, '0'),
        String(d).padStart(2, '0')].join('-');
      if (dateString < rule.startOn) continue;

      const [hour, minute] = rule.localStart.split(':').map(Number);
      const start = localTimeToUtc(y, m, d, hour, minute, config.timezone);
      const remaining = start.getTime() - now.getTime();
      if (remaining <= 15 * 60_000 || remaining > WINDOW) continue;
      planned.push({
        id: rule.id + '-' + dateString,
        name: rule.name,
        description: rule.description,
        location: rule.location,
        startAt: start.toISOString(),
        endAt: new Date(start.getTime() + rule.durationMinutes * 60_000).toISOString(),
        approved: true
      });
    }
  }

  assert(planned.length <= 30, 'Expanded program generated too many events');
  return planned.sort((a, b) => a.startAt.localeCompare(b.startAt));
}
