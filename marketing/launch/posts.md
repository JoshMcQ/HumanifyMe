# Launch posts — drafted in Joshua's voice

Drafts only. Joshua should read each one out loud and adjust anything that doesn't
sound like him — then optionally run them through the engine itself
(`rewrite --context professional`) and use whichever version is better.
Post from his own accounts. Don't schedule everything the same day; HN first,
then PH 1–2 weeks later with the HN feedback folded in.

---

## Show HN

**Title:** Show HN: HumanifyMe – an MCP server that rewrites AI drafts in your own voice

**First comment:**

Hey HN, I built this because everything my coding agent writes for me — PR
descriptions, emails, Slack updates — sounds like AI. Not bad, just obviously
not me. I say "okay sounds good", I drop apostrophes when I text, and I have
never once been "delighted" about a deliverable.

HumanifyMe is a local MCP server. You give it 3-10 samples of your real writing
(or point it at your ChatGPT/Claude export and it pulls hundreds), and it builds
a structured "voice fingerprint" — sentence rhythm, formality, your actual
phrases, words you never use, how you apologize. It's readable JSON, not an
embedding, so when it gets your voice wrong you just edit the field. Then any
MCP agent (Claude Code, Cursor, Cowork, Zed, etc.) gets a humanify_text tool
and rewrites drafts against your fingerprint before you ever see them.

Privacy was the whole design constraint: no backend, no account, no telemetry.
Samples stay in ~/.humanifyme on your machine, traffic goes only to the LLM
provider you configure with your own key (or local Ollama for zero egress),
PII gets redacted before anything leaves, and there's a content-free audit log
so you can verify all of that yourself.

What it's not: an AI-detector bypass. I'm not interested in that game and the
eval spec explicitly excludes it. The bet is narrower — most of what makes text
sound like you is a small set of habits, and they're learnable and enforceable.

It's free, BYO key, MIT licensed. Would love to hear where the voice profile
gets your writing wrong — that failure mode is the most useful feedback I can get.

---

## Product Hunt

**Tagline:** Your AI agent writes it. HumanifyMe makes it sound like you.

**Description:**

AI drafts all read the same — balanced, polished, "delighted to share." HumanifyMe
learns your actual voice from your real writing and gives every MCP agent a tool
that rewrites drafts as you: your phrases, your punctuation, your way of pushing
back. Local-first (no backend, no account), PII redacted before anything leaves
your machine, bring your own key. Free during beta.

**First comment (maker):**

Hey everyone! I made this after noticing every message my agent drafted for me
had the same tells — the em-dashes, the "Additionally," the corporate warmth.
The fix isn't "more human" writing, it's *your* writing. So HumanifyMe builds a
voice fingerprint from your real messages (it can bulk-import your ChatGPT or
Claude export, which is where it gets scary good) and holds every rewrite to it.

The part I'm proudest of: the profile is plain JSON you can read and edit, and
nothing ever touches a server I own. Ask me anything, and tell me where it gets
your voice wrong!

---

## X / Twitter thread

1/ Everything your AI agent writes sounds like AI. Fine for code comments.
Bad for the email your client reads, the PR your team reviews, the message
your boss skims.

2/ I built HumanifyMe to fix the actual problem. Not "make it more human" —
make it *me*. It learns a voice fingerprint from your real writing: your
phrases, your punctuation habits, the words you'd never use.

3/ The fingerprint is readable JSON, not a vector. Here's what it learned
about me from 3 samples: [screenshot of profile show]
It caught that I write "Im" without the apostrophe and say "okay sounds good"
as a full sentence. It even flagged what it couldn't know yet.

4/ Then any MCP agent — Claude Code, Cursor, Cowork, Zed — gets a
humanify_text tool. Agent drafts, HumanifyMe rewrites in your voice before
you even see it. Here's a real before/after: [screenshot of demo card]

5/ Privacy is structural, not a promise: no backend, no account, no telemetry.
Samples stay on your machine. Your key, your provider — or local Ollama and
nothing leaves at all. PII is redacted before any network call. There's an
audit log to prove it.

6/ Free, BYO key, open source. npx -y humanifyme setup
humanifyme.com

---

## Reddit (r/ClaudeAI, r/LocalLLaMA — adapt per sub)

**Title:** I built an MCP server that learns your writing voice and rewrites your agent's drafts as you (local-first, BYO key, free)

Body: condense the Show HN comment; for r/LocalLLaMA lead with the Ollama
zero-egress angle.
