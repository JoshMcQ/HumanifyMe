# humanifyme-feedback (Cloudflare Worker)

Anonymous feedback intake + the public `/api/stats` aggregate that powers
`site/proof.html`. Counts only — no draft, rewrite, or edited text is ever stored
or served. MIT-spirit auditable: see `src/worker.ts`.

## Endpoints

- `POST /api/feedback` — three intake shapes by `source`:
  - `mcp`: cumulative counts aggregate from the MCP server (opt-in installs).
  - `try-it`: one `{ signal: accept|edit|reject }` from the Try-It widget.
  - `survey`: alpha-survey answers (`soundsLikeMe`, `recommend`, optional text).
- `GET /api/stats` — precomputed counts-only aggregate (cached in KV, recomputed
  by a 10-minute cron). Shape: `total_users`, `total_rewrites`, `sounds_like_me`,
  `accept_rate`, `by_context`, `by_provider`, `by_week`, `updated_at`.

Rate limit: 60 req/min/IP (KV counter).

## Deploy

Needs Wrangler auth. Either `wrangler login`, or set env vars:

- `CLOUDFLARE_API_TOKEN` — API token with Workers + D1 + KV edit rights.
- `CLOUDFLARE_ACCOUNT_ID` — the target account id.

```sh
cd cf-worker
npm install
wrangler d1 create humanifyme-feedback          # paste database_id into wrangler.toml
wrangler kv namespace create RL                  # paste id into wrangler.toml
npm run db:apply                                 # apply schema.sql to D1 (--remote)
npm run deploy                                   # or, from repo root: npm run deploy:worker
```

Then attach the route `humanifyme.com/api/*` (uncomment in `wrangler.toml`) once
the zone is in the account.

## Test

```sh
# from the repo root (runs in the main vitest suite):
npx vitest run cf-worker/
```

Tests use an in-memory `node:sqlite` as a fake D1 and a `Map` as fake KV, so the
worker's real SQL and routing run with no Cloudflare toolchain.
