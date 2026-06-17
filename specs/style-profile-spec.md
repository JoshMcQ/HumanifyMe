# Style Profile Spec

The style profile is the structured representation of how a user writes. It is generated from the user's labeled samples by the style-analysis prompt and stored locally. It is the only artifact (besides the current draft) sent to the LLM during a rewrite.

## Goals

- Captures enough about voice that a rewrite reads as the user's, not a generic register.
- Small enough to fit comfortably in a system prompt with room for the draft (target: < 2,500 tokens serialized).
- Inspectable and editable by the user in plain English.
- Schema-validated so the rewrite engine can trust it.

## Top-level schema

```ts
interface StyleProfile {
  version: 1;
  generatedAt: string;        // ISO timestamp
  base: VoiceFingerprint;     // applies in all contexts
  contexts: {
    casual?: ContextVariant;
    professional?: ContextVariant;
    annoyed?: ContextVariant;
    polite?: ContextVariant;
    direct?: ContextVariant;
    sales?: ContextVariant;
    email?: ContextVariant;
    text?: ContextVariant;
    linkedin?: ContextVariant;
  };
  metadata: {
    sampleCount: number;
    labelCoverage: string[];  // labels with at least 1 sample
    notes?: string;           // freeform user notes
  };
}
```

## VoiceFingerprint

The base fingerprint is the always-on personality. Context variants override or extend it.

```ts
interface VoiceFingerprint {
  sentenceLength: {
    average: 'short' | 'medium' | 'long';     // <8, 8–18, >18 words
    variance: 'low' | 'medium' | 'high';      // do they mix short/long?
  };
  formality: 1 | 2 | 3 | 4 | 5;               // 1 = very casual, 5 = very formal
  directness: 1 | 2 | 3 | 4 | 5;              // 1 = hedged, 5 = blunt
  humor: 'none' | 'dry' | 'warm' | 'sarcastic' | 'absurd';
  profanity: 'none' | 'mild' | 'moderate' | 'frequent';
  contractions: 'rare' | 'sometimes' | 'always';
  oxfordComma: boolean;
  punctuationHabits: {
    emDash: 'rare' | 'sometimes' | 'frequent';
    semicolon: 'rare' | 'sometimes' | 'frequent';
    ellipsis: 'rare' | 'sometimes' | 'frequent';
    exclamation: 'rare' | 'sometimes' | 'frequent';
    parentheses: 'rare' | 'sometimes' | 'frequent';
  };
  capitalization: {
    sentenceCase: boolean;       // do they capitalize sentence starts?
    titleCase: 'always' | 'sometimes' | 'never';
    allLowercase: boolean;       // some users write entirely lowercase
  };
  commonPhrases: string[];       // signature phrases the user actually uses
  wordsToAvoid: string[];        // words the user does not use ("delighted", "leverage", "tapestry")
  greetings: string[];           // "hey", "hi team", "morning,"
  signoffs: string[];            // "thanks", "—J", "best", "later"
  howTheyAskQuestions: string;   // 1–3 sentence description
  howTheyDisagree: string;       // 1–3 sentence description
  howTheyApologize: string;      // 1–3 sentence description
  howTheyGiveInstructions: string; // 1–3 sentence description
  exemplars: string[];           // 3–10 short snippets showing the voice
}
```

## ContextVariant

```ts
interface ContextVariant {
  overrides: Partial<VoiceFingerprint>;  // only the fields that differ from base
  notes: string;                          // freeform LLM-generated description
  exemplars: string[];                    // snippets specific to this context
}
```

## Generation rules (what the style-analysis prompt must produce)

- Every field of `VoiceFingerprint` must be filled. No nulls. If unknown, the prompt must take a best guess from available samples and lower confidence is logged in `metadata.notes`.
- `exemplars` must be drawn from the user's actual samples, redacted but otherwise verbatim. The LLM may not invent exemplars.
- `commonPhrases` and `wordsToAvoid` must each have at least 3 entries when the user provided ≥ 5 samples. Otherwise the field is empty and the prompt notes "insufficient samples."
- The LLM must not output any field not in the schema. Extra fields cause schema validation to fail and trigger a retry.

## How variants override

When rewriting in context `email`, the effective fingerprint is `mergeDeep(base, contexts.email.overrides)`. The rewrite prompt receives the merged fingerprint plus the context's `notes` and `exemplars`.

If the user has no samples for a requested context, fall back to `base` and warn in the UI: "Profile has no `linkedin` samples yet — using your base voice."

## Storage

- SQLite table `profiles`, keyed by `'current'` (MVP supports exactly one profile per user). See `docs/data-model.md`.
- The MCP server holds the parsed profile in process memory after first read; it is invalidated whenever the profile is updated or rebuilt.

## Editability

The options page renders each field with an editor:

- Enums → dropdown.
- Numbers (1–5) → slider.
- String arrays → tag input with add/remove.
- Long-form strings (`howTheyAskQuestions` etc.) → textarea.
- `exemplars` → readonly list with delete, since LLM-generated exemplars come from user samples.

Editing the profile **must not** require re-running the style-analysis prompt. The profile is the canonical source of truth once generated.

## Re-generation

User can click "Rebuild profile from samples" which re-runs the style-analysis prompt over all current samples. This destroys their manual edits. The UI must confirm.

## What is intentionally not in the profile

- Topic or subject-matter preferences. The profile is about *how* they write, not *what* they write about. Topic memory belongs to a future "personal AI memory" product.
- Reading-level scoring. We don't compute Flesch-Kincaid. The fingerprint encodes the same information more usefully.
- A neural embedding **as an editable profile field**. Embeddings are opaque to the user and cannot be edited, so they never appear in the editable profile. The structured JSON fingerprint remains the canonical, user-facing source of truth for *how* a person writes.

> **Change note (2026-06-16):** An earlier version of this section stated "no neural embedding ... Structured JSON is the right tradeoff for MVP," excluding embeddings entirely. That stance is **reversed for retrieval only**: as of Milestone M8, embeddings are computed locally and stored solely as a **retrieval key** for the rewrite engine (see `specs/rewrite-engine-spec.md` → Retrieval, and `docs/open-questions.md` Q-18–Q-22). They are never surfaced as an editable profile field and do not change the fingerprint contract above. The exclusion now means "no embeddings *in the editable profile*," not "no embeddings *anywhere*."
