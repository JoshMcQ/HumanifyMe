---
name: build-voice-profile
description: Set up HumanifyMe by teaching it how the user writes. Use when the user says "build my voice profile", "learn how I write", "set up HumanifyMe", or when a humanify attempt failed because no profile exists.
---

# Build the user's voice profile

## Flow

1. **Consent + provider check.** Call `humanify_test_key`. If it errors with
   `MISSING_API_KEY`, ask the user which provider they want (anthropic, openai,
   gemini, or local ollama) and for an API key, then call `humanify_set_provider`.
   If any call errors with `MISSING_CONSENT`, explain in one sentence: samples
   stay on their machine; only redacted text goes to their own provider. Ask them
   to run `humanifyme setup` in a terminal (the CLI records consent).
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
