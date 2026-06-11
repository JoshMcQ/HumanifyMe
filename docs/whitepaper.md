# Voice fingerprints: rewriting AI drafts so they read like one specific person

**Joshua McQueary** · humanifyme.com · June 2026 · draft v0.9

*Disclosure, because it would be strange not to: portions of this paper were drafted with AI assistance and rewritten through HumanifyMe itself, using my own voice profile. The paper is its own demo. Judge it accordingly.*

---

## Abstract

People increasingly delegate first drafts to AI agents, and the output has a recognizable register: polished, balanced, faintly corporate, and the same for everyone. Existing "humanizer" tools fix this by rewriting toward a generic professional standard, which makes the problem worse — the goal was never "more human on average," it was *this particular human*. I describe a different approach: a structured, human-readable **voice fingerprint** extracted once from a user's real writing, stored locally, and enforced at rewrite time through prompting alone. No fine-tuning, no embeddings, no server. The system ships as an MCP server that any compatible agent can call, so the rewrite happens inside the agent workflow, before the user ever sees the draft. I explain the design choices, the privacy architecture they require, where the approach works, where it doesn't, and how we intend to measure it publicly.

## 1. The problem is homogenization, not quality

AI-drafted text is usually fine. That's the issue — it's *uniformly* fine. It hedges symmetrically, deploys the same connective tissue ("Additionally," "It's worth noting"), reaches for the same vocabulary ("delighted," "robust," "streamline"), and balances every paragraph like a debate brief. Readers have learned the pattern. When a colleague who texts in lowercase fragments suddenly sends three balanced paragraphs with an em-dash, the message reads as outsourced, and something small but real is lost: the signal that a person spent attention on you.

The market's answer has been tone sliders and "humanizers." Both share a flaw: they define a *target register* rather than a *target person*. A tone slider can make text warmer, but it makes everyone warmer in the same way. The correct target is idiosyncratic: the colleague who writes "Okay sounds good" as a complete message, drops apostrophes in "Im" but never in "I'll", apologizes in one clause and pivots to the fix, and asks questions shaped like proposals.

## 2. Three ways to model a writer, and why I picked the boring one

There are three plausible architectures for "write like me."

**Fine-tuning** a model per user captures voice well in principle, but it is expensive, slow to update, opaque to the user, and turns the user's writing into training data on someone else's infrastructure — the exact trust posture this product cannot have. It is also overkill: voice, as distinct from knowledge, is a low-dimensional signal.

**Style embeddings** (a learned vector per author, conditioning generation) are cheaper, but the representation is uninspectable. When the system gets your voice wrong — and any system sometimes will — an embedding gives you no handle to correct it. You cannot edit a vector.

**A structured profile** — explicit fields for sentence rhythm, formality, directness, humor type, punctuation habits, capitalization quirks, signature phrases, banned words, and short verbatim exemplars — is the least glamorous option and the right one. It is small enough to fit in a system prompt (under 2,500 tokens serialized). It is legible: the user can read what the system believes about their voice and fix it, and the fix sticks, because the profile is the source of truth rather than a cached inference. And it is portable across model providers, which keeps the user in control of where their text goes.

The fingerprint schema also separates a **base** voice from **context variants** (email vs. text vs. PR description vs. annoyed), because real writers are not one register. Variants are stored as overrides, merged onto the base at rewrite time, so ten contexts don't cost ten profiles.

## 3. The pipeline

Profile construction runs once (and on demand): the user's samples are gathered — pasted directly, imported from a folder of their writing, or bulk-extracted from a ChatGPT/Claude data export, keeping only turns the *user* wrote — then redacted, then sent to an LLM with a deliberately descriptive (never prescriptive) analysis prompt that must return JSON conforming to the fingerprint schema. The output is schema-validated; exemplars must be verbatim post-redaction quotes from the user's samples, and the validator rejects inventions. A failed validation retries once, then fails loudly rather than storing a doubtful profile.

A rewrite is a deterministic pipeline around one model call: length-check, redact, merge the context variant, build a system prompt from the fingerprint plus a closed set of user directives (`shorter`, `warmer`, `more_direct`, …), call the configured provider, validate the output against length bands, restore redacted tokens, diff against the original, cache. Two properties matter more than any individual step. First, the engine never edits "for quality" — constraint 1 in the rewrite prompt is that the fingerprint overrides any generic notion of good writing, including writing lowercase if the user writes lowercase. Second, concrete commitments in the draft (dates, numbers, names, links) must survive verbatim; voice transfer that changes a "yes" to a "no" is worse than useless.

The empirically interesting result from early use: the visible edits are small — a comma where the draft had an em-dash, "whenever you get a chance" for "whenever you have time," a "just letting you know" planted exactly where that user plants it. Voice lives in small, high-frequency choices, which is precisely why low-dimensional structured profiles capture so much of it.

## 4. Privacy as architecture, not policy

A tool that reads your private writing has one chance at trust, so the system makes the strong promises structurally rather than contractually. It runs entirely on the user's machine as a local MCP server; there is no vendor backend to breach. Raw samples are stored in a local SQLite database and leave the device exactly once — redacted, during profile construction, to the provider the user configured with their own key. The redactor masks emails, phone numbers, street addresses, card numbers (Luhn-checked), API keys, and tokens before any network call, and restores them only in the user's local copy. Every outbound request is recorded in a content-free audit log the user can print with one command, and one command deletes everything. Users who want zero egress can point the provider at a local Ollama instance.

This architecture also bounds what I can ever be tempted to do: no telemetry exists, so there is no growth metric whose pursuit degrades the promise.

## 5. What this is not

It is not an AI-detector bypass, and we don't score against detectors — our published evaluation plan explicitly excludes it. Optimizing against classifiers is a treadmill aimed at the wrong audience; the readers who matter are humans who know how you sound. It is not a general writing improver; if your draft is wrong, it will be wrong in your voice. And it does not learn your *knowledge* or opinions — the profile is about how you write, never what you know, which is a different and more dangerous product.

## 6. Limitations, honestly

Profiles built from three samples work better than they should, but they undersample registers: my own three-sample profile had no data for "annoyed" or "linkedin" and said so. Bulk chat-export import largely fixes this, at the cost of importing the user's least-guarded writing — which is why redaction runs before storage, not just before network calls. The redactor is regex-based and best-effort; unusual identifiers can slip through. Stylometric habits below the phrase level (rare-word distributions, syntactic tics) are only partially captured by a structured schema, which is the real ceiling of this approach versus fine-tuning. Latency is provider-bound at four to six seconds per rewrite. And the system inherits every bias of its underlying model: a fingerprint can say "dry humor," but the model decides what dry means.

## 7. Measuring it in public

Internal benchmarks for voice are too easy to fool, including fooling ourselves. The evaluation plan (the HumanifyMe Bench, spec public in the repository) is a consented, compensated, diverse 40-writer corpus; blind human preference tests ("which of these sounds more like this writer?"); fidelity ratings against the writer's held-out samples; meaning-preservation checks; an AI-tell-phrase density score; and stylometric distance as a cheap pre-screen — with a held-out split to catch overfit submissions, and the harness open so competitors can take the top of the leaderboard if they earn it. We will publish results quarterly once the product has enough real users for the numbers to mean something; publishing a benchmark before the product has users reads as posturing, and we'd rather be late than hollow.

A natural extension, further out, is closing the loop the way recent work on self-improving systems suggests: every accepted, edited, or rejected rewrite is a labeled signal about the profile's accuracy, and the profile — because it is explicit and editable — can be updated from that signal without touching model weights. That keeps the user-legibility property while letting the fingerprint sharpen with use. It ships only as opt-in.

## 8. Conclusion

The thesis is narrow and falsifiable: most of what makes text recognizably *yours* is a small set of explicit, learnable, enforceable habits — and a system that treats those habits as first-class, user-owned data can return them to AI-drafted text without taking custody of your writing. The product exists, the code and specs are public, and the bench will tell us publicly whether the thesis holds.

---

*HumanifyMe is open source (MIT). The MCP server, CLI, fingerprint schema, prompts, and the full evaluation spec are at the project repository. Correspondence: support@humanifyme.com.*
