# Household Actual deployment

Actual 26.10.0 runs on Steven's Mac Mini in Docker. The image is pinned by digest
in `compose.yaml`; it is the stable upstream image, not a build of this checkout.
Custom patches need a separately built image and a deliberate compose update.

## Locations

- Mini: `/Users/steven/services/actual`
- Data: `data/` (SQLite databases and synchronized budget files)
- Web: `127.0.0.1:5006` on the Mini; never exposed directly on the LAN
- Public URL: `https://budget.stevengoff.dev`
- Cloudflare tunnel: `mac-mini-actual`, ID `d8226a7b-d5b8-4826-b36e-84d92a1bd7a8`
- Tunnel credentials: Mini's `~/.cloudflared/`, outside this repository
- Access policy required: only `steveng9@gmail.com` and `stephanie.r.goff@gmail.com`
- Server password: Mini's `services/actual/server-password`, mode 600
- Local password copy: MacBook's `~/.config/actual-budget/server-password`, mode 600

The DNS route and tunnel are live. Cloudflare Access application
`11cf3f77-0c93-4bef-a570-3338faa1dc31` protects the entire hostname. Its only
policy is Allow, matching the two exact emails above (policy
`e195f031-471b-4e6f-aefc-d9a768ad2fdb`), with a one-month application session and explicit one-month policy override.
The saved policy was verified in Steven's personal Chrome profile.
Unauthenticated HTTPS requests redirect to the existing organization's
`webtownhero.cloudflareaccess.com` email-code sign-in page. This team domain
is used by the personal Cloudflare account; it does not broaden the allowlist.

`com.steven.actual.tunnel` is installed and running on the Mini, with four
registered QUIC connections verified. Authenticated public access is verified: Actual displayed the Bank Sync Trial
budget file and Server online at the HTTPS URL. Local Actual health is UP.
New Access sessions last one month; existing cookies may retain their previous
expiry. Clearing cookies or using another browser requires signing in again. Policy evidence: [screenshot](evidence/cloudflare-access-policy.png).

## Operations

```sh
ssh mini 'cd ~/services/actual && /usr/local/bin/docker compose ps'
ssh mini 'curl -fsS http://127.0.0.1:5006/health'
ssh mini '/bin/sh ~/services/actual/backup.sh'
```

`com.steven.actual.docker` starts Docker Desktop at user login. The container's
`unless-stopped` policy restarts Actual when the engine starts. This is not a
pre-login boot service: after reboot, the macOS user session must start.

`com.steven.actual.backup` runs at 04:15 in the Mini's local timezone. It briefly
stops Actual, archives the entire data directory with compose configuration,
validates the archive, and restarts Actual even on failure. Retention is 14 days.
Archives are private but unencrypted and currently on the same disk; off-device
backup is still needed for disk-loss protection. Credentials remain in their
separate restricted files and are not included in the budget archive.

To restore: stop Actual, preserve the current data directory, extract a verified
archive into a separate directory, check its contents, replace data with the
restored copy, then start Actual using the matching pinned image. Never unpack
over a running database.

## Private MCP

Installed package: `actual-mcp-server@0.22.31`, using `@actual-app/api@26.10.0`.
Upstream: https://github.com/agigante80/actual-mcp-server (community maintained).
Runtime and lockfile: Mini's `services/actual/mcp/`.

`mcp.sh` starts the server on demand over SSH stdio. No HTTP MCP port is exposed.
Each process has a separate temporary API cache to avoid sharing SQLite files
between concurrent clients; normal exit removes that cache. Credentials and the
default budget's **Sync ID (`groupId`, not cloudFileId)** live in `mcp/.env`, mode 600.

- `mcp-client.json`: read/write client configuration (78 advertised tools).
- `mcp-client-readonly.json`: read-only configuration (35 tools, no write tools).
- Both use the Mini's Tailscale IP `100.89.165.109` and require an authorized SSH
  key, Tailscale connectivity, and a trusted SSH host key on the calling machine.
- Jobs running directly on the Mini can invoke the corresponding script without SSH.
- Default budget: **Bank Sync Trial**, Sync ID `de22c851-3b0c-4b40-9cf0-def3f52db125`.
- Change the `.env` Sync ID after importing/creating the eventual household budget.
- MCP money amounts are cents; YNAB API amounts are milliunits. Convert explicitly.

The future receipt reconciliation job should start with the read-only connection,
report matched/unmatched transactions and proposed changes, and use the write
connection only for authorized edits. Receipt database access and scheduling are
not configured in this deployment.

## Bank connection handoff

The empty trial budget is separate from YNAB; no financial history was migrated.
Sign up at https://beta-bridge.simplefin.org/, subscribe, and connect Chase or
Discover. Generate a one-use setup token and enter it directly in Actual's
SimpleFIN settings. Do not commit or paste the token into logs or this repository.
Link accounts, compare posted transactions/balances, repeat the import to check
deduplication, then check the next daily refresh. Live bank sync remains untested
until this user authorization step is completed.

## Verification performed

- Container healthy, HTTP health `UP`, app/server versions both 26.10.0.
- Browser login, budget download and budget rendering through SSH port forwarding.
- COOP/COEP response headers present for Actual's browser database runtime.
- Backup created, archive listed successfully, container restarted successfully.
- LaunchAgent definitions loaded; tunnel ingress configuration validated.
- MCP initialized over Tailscale SSH, listed tools, created a temporary zero-balance
  account, read it from a new read-only process, then deleted it and verified an
  empty account list. No real financial data was changed.
- Repository-wide typecheck attempted but unavailable: clone has no installed Yarn
  dependency state. No application TypeScript was modified.
