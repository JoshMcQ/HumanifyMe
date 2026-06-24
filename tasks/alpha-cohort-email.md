# Alpha cohort outreach — email template

**Status:** DRAFT. Do not send without Joshua's explicit go (HARD GUARDRAIL: no
outreach without approval). Personalize the bracketed bits before sending.

---

**Subject:** you're in the HumanifyMe alpha — 2 min to set up, then I have one ask

Hey [name],

Thanks for trying HumanifyMe. The whole idea: your agent drafts the email/PR/Slack
message, and HumanifyMe rewrites it in *your* voice — learned from your own writing,
stored only on your machine. No backend, your own API key.

Getting started (about 2 minutes):

1. Install the plugin in [Claude Code / Cursor / Cowork].
2. Run `humanifyme setup` and follow the steps (consent → API key → import a few of
   your real messages → build your profile).
3. Have your agent draft something, then ask it to "humanify" it. When it shows you
   the rewrite, it'll ask "did this sound like you?" — answer honestly. That one
   answer is what makes the next rewrite better.

Want to see whether it's working for you? Run `humanifyme metrics` anytime, or check
the live numbers across all opted-in users: https://humanifyme.com/proof.html

**My one ask:** once you've used it a few times, fill out the 5-question survey —
it's the single most useful thing you can do for the project:

👉 https://humanifyme.com/alpha-survey.html

If anything didn't sound like you, that's exactly what I want to hear. Reply to this
email directly too — I read every one.

— Joshua

---

*Privacy note to include if asked:* your writing samples never leave your machine.
Only redacted, rewritten-input text goes to the LLM provider you configured, and
(only if you opt in) anonymous aggregate counts — never any text — go to the
HumanifyMe stats page.
