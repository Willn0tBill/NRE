# NRE Event Operator — weekly combined Game Night

One **NRE Community Game Night** each Saturday, rather than separate Kiomet and Openfront events.

## Approved starter calendar

- **Every Saturday, 6:00–8:00 p.m. America/Los_Angeles**, beginning December 5, 2026.
- **6:00–7:00 p.m.:** Kiomet community rally and coordinated match.
- **7:00–8:00 p.m.:** Openfront community strategy and coordinated match.
- Players may attend either session or both. Live games still require available members; the automation does not play or host matches itself.
- Both sessions share **one Discord Scheduled Event**, one event announcement and a single set of 24-hour, 3-hour and 1-hour reminders.

The schedule lives in `ops/event-program.json`, and `ops/nre-event-program.mjs` generates dated occurrences in Pacific time (including daylight saving changes) automatically. Special one-off events can still be defined in `ops/events.json`. Editing either event file requires a reviewed repository change.

## How it runs

GitHub Actions workflow `nre-events.yml` checks twice per hour at :07 and :37 UTC (best effort, not a guaranteed to-the-minute trigger). It runs unit tests, validates the event queue, creates the next occurrence as an external Discord Scheduled Event within 14 days of its start, posts one announcement and sends reminders when due. It records completed actions in an automated GitHub issue and checks recent Discord events/messages to minimize duplicate posting. It does **not** mass ping, moderate members, invent winners, or change existing event dates automatically.

**This event delivery workflow is separate from the hourly ChatGPT NRE Shadow maintenance worker.** Combining GitHub's 30-minute runner and ChatGPT's hourly automation into one literal task is not supported. They coordinate around the same NRE repository, and Shadow can audit GitHub Actions failures.

## One-time Discord authorization (required before live delivery)

1. Choose an existing NRE bot you control that is authorized to **Manage Events** in the NRE Discord server. In the announcement channel it also needs **View Channel**, **Read Message History** and **Send Messages**. Ensure it is actually a guild member.
2. In GitHub > NRE > Settings > Secrets and variables > Actions, create **repository secret** `NRE_DISCORD_BOT_TOKEN`. Never paste this token into chat, the repository, a PR or an issue.
3. Create **repository variables** `NRE_DISCORD_GUILD_ID` and `NRE_DISCORD_ANNOUNCEMENT_CHANNEL_ID` using the server and announcement-channel numeric IDs.
4. Open Actions > **NRE Discord Event Operator** > Run workflow with dry_run enabled. Check its log and ensure the correct upcoming event is listed.
5. With credentials configured and approved events on the main branch, the scheduled workflow can post automatically. Monitor Actions runs and the delivery-ledger issue for confirmation.

If credentials are absent, the operator reports **not connected** and does not contact Discord or fabricate success. A credential or permissions error must be fixed rather than bypassed. No actual Discord event is considered created until the API succeeds and GitHub records delivery.

## Limitations

This service can publish event listings and announcements but cannot replace a human match host. The Windows NRE Bot, KC Bot and JARVIS remain untouched. Scheduled Actions may be delayed or disabled after long periods of inactivity. Do not depend on these as exact-second reminders; Discord's native event notifications are an additional safeguard.
