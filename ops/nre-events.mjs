import { readFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandEventProgram } from './nre-event-program.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const marker = '<!-- nre-event-operator-state:v1 -->';
const issueTitle = 'NRE Event Operator — delivery ledger (automated)';
const discordBase = 'https://discord.com/api/v10';
const leadMs = 14 * 24 * 60 * 60 * 1000;
const reminders = [
  { label: '24h', before: 24 * 60 * 60 * 1000, window: 3 * 60 * 60 * 1000 },
  { label: '3h', before: 3 * 60 * 60 * 1000, window: 60 * 60 * 1000 },
  { label: '1h', before: 60 * 60 * 1000, window: 45 * 60 * 1000 },
];

function requireValid(value, message) {
  if (!value) throw new Error(message);
}

export function approvedEvents(config) {
  requireValid(config && Array.isArray(config.events), 'events.json must contain an events array');
  requireValid(config.events.length <= 30, 'Maximum 30 registered events');
  const ids = new Set();
  for (const event of config.events) {
    requireValid(event && typeof event === 'object', 'Each event must be an object');
    requireValid(typeof event.id === 'string' && /^[a-z0-9][a-z0-9-]{2,49}$/.test(event.id), 'Invalid event ID');
    requireValid(!ids.has(event.id), 'Duplicate event ID: ' + event.id);
    ids.add(event.id);
    requireValid(typeof event.name === 'string' && event.name.length >= 3 && event.name.length <= 100, 'Invalid name for ' + event.id);
    requireValid(typeof event.description === 'string' && event.description.length >= 3 && event.description.length <= 700, 'Invalid description for ' + event.id);
    requireValid(typeof event.location === 'string' && event.location.length >= 2 && event.location.length <= 100, 'Invalid location for ' + event.id);
    requireValid(typeof event.startAt === 'string' && /(Z|[+-]\d{2}:\d{2})$/.test(event.startAt) && Number.isFinite(Date.parse(event.startAt)), 'Invalid startAt for ' + event.id);
    requireValid(typeof event.endAt === 'string' && /(Z|[+-]\d{2}:\d{2})$/.test(event.endAt) && Number.isFinite(Date.parse(event.endAt)), 'Invalid endAt for ' + event.id);
    requireValid(Date.parse(event.endAt) > Date.parse(event.startAt), 'endAt must follow startAt for ' + event.id);
    requireValid(event.approved === undefined || typeof event.approved === 'boolean', 'approved must be boolean for ' + event.id);
  }
  return config.events.filter((event) => event.approved === true);
}

export function planActions(events, state = {}, now = new Date()) {
  const result = [];
  for (const event of events) {
    const remaining = Date.parse(event.startAt) - now.getTime();
    if (remaining <= 15 * 60 * 1000 || remaining > leadMs) continue;
    const saved = state[event.id] || {};
    if (!saved.discordEventId) result.push({ event, type: 'create' });
    if (!saved.announced) {
      result.push({ event, type: 'announce' });
      continue;
    }
    for (const reminder of reminders) {
      if (!saved.reminders?.[reminder.label] && remaining <= reminder.before &&
          remaining > reminder.before - reminder.window) {
        result.push({ event, type: 'remind', label: reminder.label });
      }
    }
  }
  return result;
}

async function request(base, path, token, options = {}) {
  const headers = {
    Authorization: (base === discordBase ? 'Bot ' : 'Bearer ') + token,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'NRE-Event-Operator/1.0',
  };
  const response = await fetch(base + path, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error((base === discordBase ? 'Discord' : 'GitHub') + ' HTTP ' +
      response.status + ' on ' + (options.method || 'GET') + ' ' + path);
  }
  return response.status === 204 ? {} : response.json();
}

function stateBody(state) {
  return marker + '\n\nManaged by GitHub Actions. Do not edit this issue manually.\n\n' +
    JSON.stringify(state, null, 2) + '\n';
}

async function readLedger(token, repo) {
  const issues = await request('https://api.github.com', '/repos/' + repo +
    '/issues?state=all&per_page=100', token);
  const issue = issues.find((item) => !item.pull_request && item.title === issueTitle &&
    (item.body || '').includes(marker));
  if (!issue) return { issue: null, state: {} };
  const jsonStart = issue.body.indexOf('\n\n{');
  requireValid(jsonStart !== -1, 'The NRE event ledger is malformed');
  const state = JSON.parse(issue.body.slice(jsonStart + 2));
  requireValid(state && typeof state === 'object' && !Array.isArray(state), 'Invalid event ledger');
  return { issue, state };
}

async function saveLedger(ledger, token, repo) {
  const body = stateBody(ledger.state);
  if (!ledger.issue) {
    ledger.issue = await request('https://api.github.com', '/repos/' + repo + '/issues',
      token, { method: 'POST', body: { title: issueTitle, body } });
  } else {
    ledger.issue = await request('https://api.github.com', '/repos/' + repo +
      '/issues/' + ledger.issue.number, token,
    { method: 'PATCH', body: { body, state: 'open' } });
  }
}

function eventTag(id) { return '[NRE-EVENT:' + id + ']'; }
function messageTag(id, action) { return 'ref:NRE-EVENT/' + id + '/' + action; }
function eventLink(guildId, eventId) {
  return 'https://discord.com/events/' + guildId + '/' + eventId;
}

async function ensureScheduledEvent(event, guildId, token) {
  const endpoint = '/guilds/' + guildId + '/scheduled-events';
  const existing = await request(discordBase, endpoint, token);
  const found = existing.find((item) => String(item.description || '').includes(eventTag(event.id)) &&
    [1, 2].includes(item.status));
  if (found) return found.id;
  const created = await request(discordBase, endpoint, token, {
    method: 'POST',
    body: {
      name: event.name,
      description: event.description + '\n\n' + eventTag(event.id),
      scheduled_start_time: new Date(event.startAt).toISOString(),
      scheduled_end_time: new Date(event.endAt).toISOString(),
      privacy_level: 2,
      entity_type: 3,
      entity_metadata: { location: event.location },
    },
  });
  requireValid(created.id, 'Discord did not return the scheduled event ID');
  return created.id;
}

function messageText(event, action, guildId, eventId) {
  const time = Math.floor(Date.parse(event.startAt) / 1000);
  const title = action === 'announce' ? '**NRE event scheduled**' :
    '**NRE event reminder — ' + action + '**';
  return title + '\n**' + event.name + '**\n' +
    event.description + '\n**When:** <t:' + time + ':F> (<t:' + time + ':R>)\n' +
    '**Where:** ' + event.location + '\n' +
    eventLink(guildId, eventId) + '\n-# ' + messageTag(event.id, action);
}

async function ensureMessage(event, action, guildId, channelId, eventId, token) {
  const endpoint = '/channels/' + channelId + '/messages';
  const history = await request(discordBase, endpoint + '?limit=100', token);
  const tag = messageTag(event.id, action);
  const found = history.find((msg) => String(msg.content || '').includes(tag) && msg.author?.bot);
  if (found) return found.id;
  const sent = await request(discordBase, endpoint, token, {
    method: 'POST',
    body: {
      content: messageText(event, action, guildId, eventId),
      allowed_mentions: { parse: [] },
    },
  });
  requireValid(sent.id, 'Discord did not return the message ID');
  return sent.id;
}

function requireSnowflake(value, label) {
  requireValid(typeof value === 'string' && /^\d{15,22}$/.test(value), label + ' is missing or invalid');
}

export async function main() {
  const config = JSON.parse(readFileSync(join(dir, 'events.json'), 'utf8'));
  const recurring = JSON.parse(readFileSync(join(dir, 'event-program.json'), 'utf8'));
  const events = approvedEvents({ events: [...config.events, ...expandEventProgram(recurring)] });
  const dryRun = process.env.DRY_RUN === 'true';
  if (!events.length) {
    console.log('No approved NRE events; no Discord operations performed.');
    return;
  }
  if (dryRun) {
    const planned = planActions(events, {}, new Date());
    console.log('DRY RUN — this does not inspect past deliveries or contact Discord.');
    console.log(planned.map((action) => action.event.id + ': ' + action.type +
      (action.label ? ' ' + action.label : '')).join('\n') || 'No upcoming actions.');
    return;
  }
  const ghToken = process.env.GITHUB_TOKEN;
  const botToken = process.env.NRE_DISCORD_BOT_TOKEN;
  const guildId = process.env.NRE_DISCORD_GUILD_ID;
  const channelId = process.env.NRE_DISCORD_ANNOUNCEMENT_CHANNEL_ID;
  const repo = process.env.GITHUB_REPOSITORY;
  requireValid(ghToken && repo === 'Willn0tBill/NRE', 'GitHub credentials or expected repository are missing');
  if (!botToken || !guildId || !channelId) {
    const note = 'NRE Event Operator: ' + events.length + ' approved upcoming event(s); Discord connection not configured. No events or announcements delivered. Set the bot token secret and server/channel ID variables.';
    console.log(note);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, note + '\n');
    return;
  }
  requireSnowflake(guildId, 'Guild ID');
  requireSnowflake(channelId, 'Announcement channel ID');

  const ledger = await readLedger(ghToken, repo);
  const actions = planActions(events, ledger.state, new Date());
  for (const action of actions) {
    const event = action.event;
    const saved = ledger.state[event.id] || { reminders: {} };
    saved.reminders ||= {};
    if (action.type === 'create') {
      saved.discordEventId = await ensureScheduledEvent(event, guildId, botToken);
    } else {
      requireValid(saved.discordEventId, 'Event was not created: ' + event.id);
      const label = action.type === 'announce' ? 'announce' : action.label;
      await ensureMessage(event, label, guildId, channelId, saved.discordEventId, botToken);
      if (action.type === 'announce') saved.announced = true;
      else saved.reminders[label] = true;
    }
    ledger.state[event.id] = saved;
    await saveLedger(ledger, ghToken, repo);
    console.log('Completed ' + action.type + ' ' + (action.label || '') + ' for ' + event.id);
  }
  const summary = 'NRE Event Operator: ' + events.length + ' approved event(s), ' +
    actions.length + ' action(s) delivered.\n';
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
