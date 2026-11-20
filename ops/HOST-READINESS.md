# Host readiness and turnout ledger (manual, opt-in)

This is a **local planning tool**, not a Discord integration. The initial `host-readiness.json` is empty because no real host or attendance confirmations have been verified. Do not prepopulate with invented users, hosts or counts.

For a real opt-in response, add one entry per game and region to `host-readiness.json`:

```json
{
  "sessions": [
    {
      "game": "kiomet",
      "region": "asia",
      "hostStatus": "unconfirmed",
      "interestedPlayers": 0,
      "confirmedPlayers": 0,
      "updatedAt": "2026-11-20T00:00:00Z"
    }
  ]
}
```

The example above is **illustrative only**, not recorded participation. Record counts only after an organizer has consent-based confirmation. Avoid names, user IDs, invite links and personal information in the public repository. Host status may be `unconfirmed`, `confirmed`, or `cancelled`; count only members who explicitly opted in. Run `node ops/host-readiness.mjs` to see which tracked sessions have a confirmed host and at least two confirmed players. This two-player threshold is a planning heuristic, **not a Discord event publication gate**; scheduled templates remain separate and unchanged.

The ledger intentionally does not create events, send Discord messages, assign roles, collect personal information, or claim turnout. Only human organizers may update it from verified opt-in counts. If a session lacks a host or participants, reduce frequency or recruit volunteers organically within the existing approved event announcement; do not manufacture activity.
