# NRE Event Operator

Independent GitHub Actions scheduler for NRE Discord events. It does not need a Windows computer online and does not replace the current NRE Bot, KC Bot or JARVIS.

## What it does

- Checks approved upcoming events approximately every 30 minutes (GitHub scheduled jobs are best-effort).
- Creates an external Discord Scheduled Event within 14 days of its start.
- Sends one announcement and separate 24-hour, 3-hour and 1-hour reminders if a check falls in the relevant time window.
- Keeps a delivery ledger in a single GitHub issue, checks existing Discord events and the last 100 announcements to reduce duplicate posts.
- Never sends mass mentions, moderates users, changes permissions, claims winners or starts events without explicit approval.

## One-time administrator setup

1. Use an NRE Discord bot account you control, with Manage Events in the guild plus View Channel, Read Message History and Send Messages in the announcement channel.
2. Add the GitHub Actions repository secret NRE_DISCORD_BOT_TOKEN containing the bot token. Never commit or paste the token in chat.
3. Add GitHub Actions repository variables NRE_DISCORD_GUILD_ID and NRE_DISCORD_ANNOUNCEMENT_CHANNEL_ID with numeric Discord IDs.
4. Edit ops/events.json through a reviewed pull request. Include a unique event ID, name, description, location, approved=true, and ISO timestamps with time zones.
5. Run Actions > NRE Discord Event Operator > Run workflow with dry_run=true for a preview. Once the approved event configuration is merged to main, scheduled jobs deliver actions. Check Actions logs and the automated issue ledger for results.

## Example (NOT an actual scheduled event)

{
  "id": "community-skirmish-2026-12-05",
  "name": "NRE Community Skirmish",
  "description": "A friendly coordinated Kiomet match.",
  "location": "Kiomet",
  "startAt": "2026-12-05T19:00:00-08:00",
  "endAt": "2026-12-05T20:00:00-08:00",
  "approved": true
}

## Boundaries

The operator can schedule Discord Events and announcements; it cannot personally play games or facilitate live voice chat. It uses the Discord REST API through the authorized bot token, not the currently offline Windows bot process. No actual NRE events are in the configuration yet because no dates were provided.

GitHub Actions schedules can be delayed or disabled after 60 days of repository inactivity. Use Discord's built-in event notifications for additional coverage. For changed dates, update the Discord Scheduled Event and JSON together; the first version deliberately avoids modifying existing event times automatically.
