# Onboarding Spec

## Why onboarding matters more than the feature work

The two biggest MVP failure modes (BYO key friction and "doesn't sound like me" on first rewrite) are onboarding problems, not engine problems. For an MCP distributed via plugin marketplaces, onboarding *is* the install flow, the first slash command, and the first agent interaction. There is no separate "options page."

## Target

- Plugin install to first humanified rewrite: < 3 minutes.
- "Sounds like me" on first rewrite: ≥ 70%.
- Drop-off across the funnel: documented per step, target < 25% per step.

## Three onboarding surfaces

1. **Marketplace install page.** Cowork / Claude Code plugin listings. The pre-install copy and screenshots are the first impression.
2. **Post-install slash command.** Most users will see this. `/humanify-setup` (Claude Code) or "Configure" button (Cowork) walks them through the rest.
3. **CLI** (`humanifyme setup`). Power-user / non-plugin install path (Cursor, Continue, etc.).

All three converge on the same four steps below.

## The four-step flow

### Step 1 — Consent (10 seconds)

- One sentence: "HumanifyMe rewrites AI drafts so they sound like you, not like AI. Everything stays on your machine."
- Two confirmations:
  - "I understand drafts and a small style profile are sent to the LLM provider I configure."
  - "I understand my writing samples stay on my device unless I explicitly enable a future sync feature."
- Can't continue until both confirmed. (In the agent slash-command UI: two tool calls with `confirm: true`. In the CLI: two `[y/N]` prompts.)

### Step 2 — Provider + API key (60 seconds)

- "We don't manage AI for you in MVP. You bring your own key — it's cheaper and your data goes to the provider of your choice."
- Provider picker: Anthropic, OpenAI, Gemini, Ollama (local).
- Key input.
- "Test" call via `humanify_test_key`. Result rendered inline.
- Help link to `humanifyme.com/get-key/<provider>`.

For Ollama: no API key needed; just confirm `http://localhost:11434` is reachable and a model is pulled.

### Step 3 — First samples (90 seconds)

- "Paste 3 things you've written recently. An email you sent, a Slack message, a tweet, a LinkedIn post, anything."
- Three samples requested in sequence via `humanify_add_sample`.
- Suggested labels rotate to diversify: `email + professional`, `text + casual`, `linkedin`.
- Validators: each sample ≥ 100 characters.

Inside a Claude Code or Cowork chat, the `build-voice-profile` skill drives this conversationally: the agent asks for sample 1, calls `humanify_add_sample`, asks for sample 2, etc.

### Step 4 — Build profile + first rewrite (30 seconds + LLM latency)

- "Building your voice profile…" (`humanify_build_profile`).
- Render a 3-bullet plain-English summary from `humanify://profile.md`.
- Demo rewrite: a deliberately AI-flavored paragraph relevant to the user's chosen labels. One `humanify_text` call. Show before/after.
- Survey: "Does this sound like you?" Y/Kinda/N stored locally (opt-in to share aggregate).

## After onboarding

- Tooltip / agent message: "You can now ask any AI agent with HumanifyMe installed to 'humanify this.' Try it on a PR description or a Slack message."
- A `humanify_get_profile` call surfaces the profile to the user as a confirmation that everything stuck.
- The first time the user pastes a draft into the agent, the bundled `humanify` skill nudges the agent to suggest a rewrite.

## Returning users

- On plugin update with a material privacy change, show the change once.
- On plugin update with no material privacy change, no interruption.

## Failure paths

- API key invalid → inline, retry in place, do not bump back to step 1.
- Profile build fails → show error, give the user the option to retry or continue with a default base profile and add samples later.
- First rewrite latency > 12s → show a "this is taking a while" state and keep going.
- Provider unreachable → suggest switching to another provider mid-flow.

## Copy guidelines

- Second person. "You bring your own key."
- No exclamation points in the body. One in the success state is fine.
- Banned words in onboarding copy: "seamless," "powerful," "supercharge," "unlock," "leverage," "delight," "smart," "AI-powered" (we are obviously AI-powered).
- The product copy itself gets a self-rewrite pass during launch QA: run our own copy through `humanify_text` with the brand profile and see if it survives.

## Out of scope for MVP onboarding

- Importing samples from third-party services.
- In-agent tutorial videos.
- A guided tour of every supported agent.
- A/B testing framework.
- A web onboarding flow at humanifyme.com (the landing page is the marketing surface, not onboarding).
