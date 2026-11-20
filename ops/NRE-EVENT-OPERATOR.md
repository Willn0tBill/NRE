# NRE Shadow — Empire-wide event publishing

NRE Shadow oversees one Discord event operator, which runs through GitHub Actions approximately every 30 minutes. There is only one separate **hourly ChatGPT NRE Shadow maintenance task**. Neither scheduler needs a separate ChatGPT reminder for individual games or regions.

## Confirmed destination configuration

The user provided the following NRE Empire Discord destination:

- **Server (guild) ID:** `1544610643389456484`
- **Game events channel ID:** `1544872647400230912`
- **Supported games:** Kiomet, Openfront, Netquel, MK48.io
- **Supported regions:** Asia (Shanghai), Europe (Berlin), Americas (Los Angeles)

These IDs are stored in `ops/server-targets.json` on the rollout branch. The destination is configured, but **successful bot permissions and live Discord publishing have not been verified**.

The game-events channel is intentionally the **only announcement and recruitment channel**. There is no separate recruitment channel, independent recruitment posting timer, unsolicited message campaign or cold DM system. **Each event announcement invites all Empire members**, including NRE members, integrated communities and participating divisions, to play, bring friends and help the Empire grow. Reminders also welcome all Empire members. Announcements do not use `@everyone`, `@here`, role or user pings.

## Approved weekly regional event schedule

All times below are **6:00–7:00 p.m. local time** for each regional series. Separate Discord Scheduled Events are created for every game and region; there is no combined game night.

| Game | Weekday | Asia timezone | Europe timezone | Americas timezone |
| --- | --- | --- | --- | --- |
| MK48.io | Thursday | Asia/Shanghai | Europe/Berlin | America/Los_Angeles |
| Kiomet | Friday | Asia/Shanghai | Europe/Berlin | America/Los_Angeles |
| Openfront | Saturday | Asia/Shanghai | Europe/Berlin | America/Los_Angeles |
| Netquel | Sunday | Asia/Shanghai | Europe/Berlin | America/Los_Angeles |

Four approved games × three regions = **12 weekly series**. Future dates are generated automatically in `ops/nre-event-program.mjs`, including daylight-saving transitions. The first configured Kiomet, Openfront, and Netquel dates begin November 27–29, 2026; MK48.io begins December 3, 2026. Mazean, Turnfight and Voxmaxa have separate prepared game/region templates but are **paused**, pending players and hosts.

## Publishing behavior

- The operator uses the **authorized Discord bot** to create native Discord Scheduled Events within a rolling 14-day horizon, then posts the event link to the configured game-events channel within 72 hours of the event.
- A single announcement already contains the recruitment invitation. A 24-hour, 3-hour and 1-hour reminder is sent only when the timed check falls in its corresponding window. No separate recurring recruitment advertisements are posted.
- Each server opts into specific games/regions, and no event is routed to another server without its administrator's authorization. Duplicate event and message checks reduce accidental repeated posts, and a per-guild ledger stores delivery state.
- Posting an event does not prove an actual match, attendance, or a host is available. Teams and sessions still need real volunteers.

## One remaining connection step

1. Use an NRE-controlled Discord bot already present in the server and authorized to **Manage Events**.
2. Confirm it has **View Channel**, **Read Message History**, **Send Messages** in game-events (ID `1544872647400230912`).
3. In GitHub > `Willn0tBill/NRE` > **Settings → Secrets and variables → Actions → Secrets**, add `NRE_DISCORD_BOT_TOKEN` as a repository secret. **Never paste the token in a chat, PR, issue, file or repository commit.**
4. Merge the reviewed event-operator rollout PR only after tests and permission setup are verified. The branch configuration is not live on `main` until merged.
5. In GitHub Actions, manually run **NRE Discord Event Operator** with `dry_run=true` to preview the event queue. Then check an authorized real run and verify the created Discord event and announcement in the actual server.

If the token, bot presence or permissions are absent, publishing is **not active**. CI passing means the code and unit tests succeeded, **not** that Discord has received an event.

## Security, inclusion and reliability

Bot tokens must be stored only in GitHub Actions secrets. The operator never sends unsolicited DMs or mass mentions. Integrated communities and affiliated groups are welcome to participate; this does not imply NRE owns or controls an integration's server. Other guilds must be added with their administrator's explicit permission.

GitHub scheduled jobs are best-effort; 30-minute checks do not guarantee precise delivery. Workflows may be disabled after extended public repository inactivity. Live hosting, moderation, turnout and successful recruitment are not automated by the Discord event publisher.
