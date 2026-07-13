---
name: build-voice-profile
description: Set up HumanifyMe by teaching it how the user writes. Use when the user says "build my voice profile", "learn how I write", "set up HumanifyMe", or when a humanify attempt failed because no profile exists.
---

# Build the user's voice profile

## Flow

1. **Consent + provider check.** Call `humanify_test_key`. If it errors with
   `MISSING_API_KEY` or any later call returns `MISSING_CONSENT`, ask the user to
   run `npx -y humanifyme@0.2.0 setup` in a terminal, then return here. That
   wizard records consent, accepts the API key without echo, validates it, and
   can build the initial profile. **Never ask the user to paste an API key into
   chat and never put a cloud key in an MCP tool argument.** The host model can
   see chat and tool arguments. `humanify_set_provider` is only for local Ollama,
   which has no API key.
2. **Collect samples.** The profile needs at least 3 samples of at least 100
   characters; 5 to 10 is better. Two paths, can be combined:
   - **Bulk (best results):** if the user has a ChatGPT or Claude data export,
     call `humanify_import_chat_export` with `commit: false`, show the preview,
     then re-call with `commit: true` once they approve. For a folder of their
     own writing (.txt/.md/.docx), use `humanify_import_text_files` with a label.
   - **Manual:** ask the user to paste 3+ things they actually wrote (emails,
     Slack messages, posts). For each, call `humanify_add_sample` with the most
     fitting `labels` from: casual, professional, annoyed, polite, direct,
     sales, email, text, linkedin.
3. **Build.** Call `humanify_build_profile` (use `force: true` if rebuilding).
4. **Show the result.** Read the `humanify://profile.md` resource (or summarize
   the returned profile) in plain English. Invite the user to correct anything;
   apply corrections with `humanify_update_profile`.
5. **Prove it.** Offer to humanify a sample draft right away so the user sees
   the payoff. After showing the rewrite, ask once: **"did this sound like you?
   (yes / kinda / no)"** and call `humanify_record_feedback` with the
   `feedbackToken` from the `humanify_text` response (yes → `accept`,
   kinda → `edit`, no → `reject`). This first signal seeds the quality metrics.
