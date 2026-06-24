---
name: humanify
description: Rewrite a draft so it sounds like the user, not like AI. Use whenever the user says "humanify", "rewrite this in my voice", "make this sound like me", "this sounds like AI", "less AI", "too formal/robotic", or right after you (the agent) drafted an email, message, post, or doc the user will send as their own.
---

# Humanify a draft

The HumanifyMe MCP rewrites text in the user's actual voice using their locally
stored style profile.

## When to trigger

- The user asks for any text to sound like them or less like AI.
- You just drafted something the user will send under their own name (email,
  Slack message, LinkedIn post, reply). Offer to humanify it, or do so when asked.

## How

1. Call `humanify_text` with:
   - `draft`: the full text to rewrite (1 to 8000 chars).
   - `contextLabel`: pick the closest of `casual | professional | annoyed | polite | direct | sales | email | text | linkedin`. Default to `email` if unsure.
   - `directives`: default `["more_like_me"]`. Add `"shorter"`, `"warmer"`, `"more_direct"`, `"more_professional"`, or `"less_aggressive"` only if the user asked for that quality.
2. Show the user the `rewrite` field. If `notes` is present, mention it in one short sentence.
3. Do not edit the rewrite afterward, the tool's output IS the user's voice. Re-call the tool with different directives instead.
4. **Close the loop.** After the user has seen the rewrite, ask once, briefly:
   **"did this sound like you? (yes / kinda / no)"**, then call
   `humanify_record_feedback` with the `feedbackToken` from the `humanify_text`
   response, mapping the answer to `signal`: yes → `accept`, kinda → `edit`,
   no → `reject`. Pass their words as `reason` if they gave any. This is how the
   voice gets better and how the user can see HumanifyMe actually works. Ask only
   once; never nag. If they ignore it, drop it.

## Failure handling

- `MISSING_CONSENT` or `BAD_INPUT: no style profile`: tell the user setup is needed and offer to run the **build-voice-profile** flow.
- `MISSING_API_KEY`: offer to call `humanify_set_provider` with a key the user supplies.
