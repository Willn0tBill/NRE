# NRE Community Operations — Host & Recruitment Playbook

**Status:** operational guidance only. These are not claims that any Discord server is connected, that a volunteer host has been assigned, or that any event has been published.

## A real event needs a host

Every regional game slot has a distinct game and timezone. Use `ops/event-program.json` as the canonical schedule. Do not expand paused Mazean, Turnfight or Voxmaxa until a named volunteer host and a viable player group have agreed to run the session.

### Host checklist (per session)

- **72 hours before:** volunteer host confirms availability, game, region, Discord voice/text location, and any minimum player count. If nobody can host, tell participants the session is unhosted rather than claiming it will run.
- **24 hours before:** check actual Discord Scheduled Event RSVPs and confirm the game lobby or match instructions. Invite existing interested members through approved channels only.
- **3 hours before:** verify host and at least one backup contact are reachable. Avoid sending extra announcements outside the operator's existing reminder schedule.
- **At start:** host opens the lobby, welcomes new players, and posts a clear joining instruction in the event channel. No invented attendance.
- **Afterward:** record actual participants who consent to being counted, whether the match ran, and whether a follow-up session was requested. Never publish personal identifiers in a public report.

### Lightweight event record (manual until an approved integration exists)

| Field | Meaning |
| --- | --- |
| event_id / guild_id | Exact scheduled occurrence and authorized server |
| host_confirmed | yes / no / unknown |
| rsvp_count | Actual Discord RSVP count, or unknown |
| attendees | Actual observed count, or unknown |
| new_players | First-time attendees who self-identify, or unknown |
| completed | held / cancelled / no-show / unknown |
| return_interest | Count of members who opt in to the next event, or unknown |
| notes | Short host observations, no personal data |

**Never treat RSVPs as attendance.** For a new series, prioritize attendance and repeat-player interest before adding more weekly events. Review low-turnout slots after three real sessions, not after one quiet week.

## Regional game-specific invitations

**All Empire members are welcome**, including NRE, integrated divisions, and participating allied communities. Participation does not imply NRE owns or operates independent partner servers. These are optional host talking points, not extra automated messages.

Use these as human-approved, organic announcements in designated community channels. The automatic event operator embeds the recruitment invitation in **every approved game-event announcement** in the authorized `#game-events` channel. There is no separate recruitment channel, independent recruitment timer, or unsolicited campaign.

- **Kiomet:** “Playing Kiomet this Friday at 6 PM in your region? the Empire is organizing a team session. New players are welcome—RSVP to the Discord event so the host can plan teams.”
- **Openfront:** “Openfront session this Saturday at 6 PM local regional time. Join to coordinate a match, learn team strategies and meet other Empire players. RSVP if you intend to play.”
- **Netquel:** “Netquel players: we’re organizing a Sunday 6 PM regional session. Come join a community match and help us build a consistent group. Sign up through the Empire server event.”
- **MK48.io:** “MK48.io fleet meetup Thursday at 6 PM local regional time. New and returning captains welcome. RSVP to the Empire server event to help coordinate teams.”

Only use a message after the matching Discord event is actually published. Do not manufacture event URLs, imply confirmed hosts, DM strangers, or promise rewards.

## Growth without spam

1. Invite interested players from communities where invitations are permitted; respect each community's rules.
2. Provide one clear join path: approved server invite, game, region, event RSVP, and joining instructions.
3. Ask new players which game and timezone they prefer through an opt-in poll. Never scrape member lists or mass-message users.
4. Give new members a reason to return: beginner-friendly sessions, rotating team captains, rematch polls and recognition for actual volunteer hosts.
5. Report weekly **confirmed sessions held**, **observed attendees**, **new player participation**, **repeat interest**, and **cancelled/unhosted sessions**. Unknown data stays unknown.

## Escalation

- **No Discord bot token or verified permissions:** the Empire guild and `#game-events` channel IDs are configured, but event publishing remains blocked until an administrator stores the bot token as a GitHub Actions secret and confirms the bot's Manage Events and channel-message permissions. Never paste credentials into chat or commits.
- **No host or viable players:** keep the template visible as a proposal but pause the specific session until participation is realistic. Do not replace the problem with more announcements.
- **Operator fails:** inspect GitHub Actions logs, permissions, rate limits and delivery ledger. Do not manually resend everything without checking for duplicates.
- **Low attendance:** adjust the game, region or frequency based on opt-in polls, rather than artificially increasing the event count.
