---
name: humanify-pr
description: Make PR descriptions, commit messages, and release notes read like the user wrote them. Use whenever you draft a pull request description, commit message, changelog entry, or release note that will be published under the user's name.
---

# Humanify a PR description / commit message

Developer text written by agents has a recognizable AI register. This skill
runs it through the user's voice before it ships.

## How

1. Draft the PR description / commit message / release note as you normally would (correct, complete, links and issue refs intact).
2. Call `humanify_text` with:
   - `draft`: your drafted text.
   - `contextLabel`: `"professional"`.
   - `directives`: `["more_like_me", "shorter"]`.
3. Use the `rewrite` as the final text. Keep code blocks, issue numbers, and links exactly as the tool returned them — it preserves concrete commitments.
4. If the tool fails because no profile exists, fall back to your draft and tell the user that HumanifyMe setup (build-voice-profile) would make this automatic.

## Don't

- Don't humanify code, config, or anything machine-parsed (YAML frontmatter, JSON).
- Don't run it twice; one pass is the voice.
