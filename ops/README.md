# NRE Shadow — automated asset health

NRE Shadow performs a **read-only** hourly audit of approved public websites and the most recent main-branch GitHub Actions results for ten projects. It opens or updates one deduplicated incident issue in this repository if checks fail, and closes that issue when all detected incidents recover.

This is not a generic uptime guarantee. GitHub Actions scheduling is best-effort, can be delayed, and may eventually be disabled by GitHub if this public repository becomes inactive. A blocked probe may be a bot-protection response rather than a site outage.

- Edit `ops/watch.json` to add or remove **verified public** website URLs or GitHub repositories. Never add a password-protected endpoint or private URL.
- Visit the **NRE Shadow asset health** workflow in Actions to review summaries and run it manually using **Run workflow**.
- A new PR touching `ops/**` runs offline unit tests before merge.
- The watcher **does not auto-merge, deploy, publish, restart bots, modify data, or touch billing**.
- The GitHub token is limited to this repository's issue write operation; cross-repository workflow history is read through public GitHub API endpoints.
- Check other existing publishers and CI in each project. Civora and Troop 710 already operate their own scheduled jobs and are not replaced here.

Local Discord bots and JARVIS cannot be monitored by this workflow without separately deployed, authenticated heartbeat or health endpoints; do not expose bot tokens to public web checks.
