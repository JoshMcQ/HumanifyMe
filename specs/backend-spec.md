# Backend Spec

## Decision: no backend in MVP

The MVP is fully local. The MCP server runs on the user's machine and calls the user's chosen LLM provider directly using a key the user supplies in `~/.humanifyme/config.json`. This decision is deliberate and is documented here so that future contributors do not unconsciously reintroduce server dependencies.

**Why no backend in MVP:**

1. Privacy story is simpler and stronger. No server means no breach surface for raw samples. MCPs are expected to be local; running a backend would be a category-leaving choice.
2. Faster to ship and faster to iterate.
3. No infra cost, no on-call burden, no T&S workflow needed at launch.
4. BYO-API-key shifts LLM cost to the user. Removes our largest variable cost and our biggest abuse vector.
5. Lets us validate the product hypothesis before paying for infra.
6. Distribution via plugin marketplaces (Cowork, Claude Code) does not require us to host anything.

**Why a backend will eventually exist (post-MVP, Milestone 6+):**

- Accounts and cross-device sync of profiles (the local MCP installs on one machine; users with a laptop + desktop want one profile).
- "We manage the LLM key" for the share of users who do not BYO key.
- Billing (Stripe).
- Team profiles and admin (where teams want a shared brand voice across multiple users' agents).
- Telemetry (opt-in).
- A hosted/remote MCP variant for users on agents that don't run local subprocesses (browser-only agents, mobile agents).
- Future: server-side fine-tunes.

## When the backend question gets revisited

After MVP launch, when **any one** of these signals appears:

- Onboarding funnel data shows BYO-key drop-off is the dominant churn point (likely > 40%).
- A signed-up user explicitly requests sync.
- We want to ship a paid plan.

Before that, do not build it.

## When we do build it: choice = Node + Fastify (recommended) over FastAPI

If the project has reached the trigger and we are now building a server, **recommended stack is Node + Fastify + TypeScript** with a Postgres database via Drizzle or Prisma.

| Criterion             | Node + Fastify (TS)                                                                          | FastAPI (Python)                                                                |
| --------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Language reuse        | Same TS as the MCP server; share schemas (zod), share types, share validators.               | New language, new toolchain.                                                    |
| LLM SDK quality       | OpenAI / Anthropic / Gemini all have first-class TS SDKs. Streaming and tool use are mature. | Excellent Python SDKs, often *first*-class for new features.                    |
| ML / data work        | Weaker if we later add embeddings, clustering, evals.                                        | Much stronger ecosystem (numpy, scikit, evals tooling).                         |
| Async perf            | Fastify is fast; Node async is well-understood.                                              | FastAPI on uvicorn is competitive.                                              |
| Hosting               | Fly.io, Railway, Render, Cloudflare Workers (with some restrictions). Easy.                  | Same options. Cold-start on serverless is heavier.                              |
| Hiring                | Larger TS hiring pool in indie/early-stage.                                                  | Equally good if we are ML-leaning.                                              |

**Tiebreaker: language reuse with the MCP server wins.** Shared `zod` schemas for `StyleProfile`, `Sample`, and the rewrite contract avoid an entire class of bugs. If we later need heavier ML work, that work can live as a separate Python service called from the Node API.

## When we do build it: scope

Phase 1 backend (post-MVP, opinionated minimum):

- Authentication: passwordless email magic link, no social.
- `POST /v1/profiles`, store a `StyleProfile`.
- `GET /v1/profiles/me`, fetch it.
- `POST /v1/rewrite`, server-managed LLM rewrite for users who didn't BYO key. Returns same shape as the local engine.
- `POST /v1/samples`, store *redacted* samples only, behind an explicit "sync samples to cloud" opt-in. Default off.
- Stripe webhook for subscription state.
- Optional: a hosted MCP-over-HTTP endpoint for agents that don't spawn local subprocesses. The local stdio MCP remains the canonical surface.

Phase 1 explicitly excludes: teams, admin, sharing, audit logs, SSO, fine-tuning.

## Hosting and infra (when built)

- Single region to start.
- Postgres (Neon or Supabase).
- Stripe.
- Cloudflare in front.
- Logs to a managed provider with PII filtering, and we treat raw samples as PII even after redaction.

## Non-goals (forever, not phased)

- A server-side keylogger or any "we'll watch your inbox for you" feature.
- Selling rewrite analytics to anyone.
