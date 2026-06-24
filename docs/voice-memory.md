# Voice memory

Voice memory is the part of HumanifyMe that remembers how you actually write. It is a retrieval index over your own past writing. When you rewrite a draft, the engine pulls the handful of your real past messages that are closest to that draft and hands them to the model as the voice to match. The static style profile still sets the structural rules. Your retrieved messages are the live signal.

Think of it as a small personal brain that sits next to you across every tool you use. It is not a model and it does not reason. It stores, and it retrieves.

## Where it lives

Voice memory lives in one SQLite file: `~/.humanifyme/data.db`, in the `sample_embeddings` table.

The path is resolved by `humanifymeHome()` in `src/paths.ts`. By default that is `.humanifyme` under your OS home directory (`os.homedir()`), so `~/.humanifyme/data.db`. You can point it elsewhere with the `HUMANIFYME_HOME` environment variable. `dbPath()` just joins that home with `data.db`.

Two consequences follow from this, and they matter:

1. **It is not in your project.** The store is keyed to your home directory, not the working directory of whatever repo or agent you happen to be in. Nothing about voice memory is written into a project tree, and nothing about it is checked into git.
2. **There is one store per user, shared by everything.** Claude Code, Cursor, Cowork, and any other MCP client all read and write the same `~/.humanifyme/data.db`. Teach it your voice in one agent and every other agent on that machine sees the same memory. There is no per-project copy to keep in sync.

## What it stores

It stores on-device embeddings of your own past writing. Each row in `sample_embeddings` (see `src/storage/repositories/embeddings.ts`) holds:

- the id of the writing sample it belongs to,
- the embedder model id that produced the vector,
- the dimension,
- the vector itself, stored as raw `Float32Array` bytes in a BLOB,
- a created-at timestamp.

The vector is computed from the raw sample text, locally, on your machine. The embedder is chosen by config (`config.rag.embedder`, see `src/providers/index.ts`):

- **Default: a dependency-free lexical embedder.** No model download, no network, nothing to install. This is the path you get out of the box.
- **Optional, local, opt-in: MiniLM** (`all-MiniLM-L6-v2`, 384-dim) run offline through transformers.js/ONNX, with weights cached under `~/.humanifyme/models/`.
- **Optional, local, opt-in: Ollama**, pointed at a local Ollama server.

All three run on your device. None of them send your writing anywhere to produce a vector.

The embeddings themselves are never transmitted. They are a derived index, used only to decide which of your past messages are most relevant to the current draft. When a retrieved message is actually used in a rewrite, its text is run through the redactor again at send time, right before the prompt is assembled, so emails, phone numbers, and other masked content never reach the LLM provider even though the stored sample was raw. Store-time redaction is never trusted on its own.

## How it behaves like a brain

A brain is useful because it persists, it grows, and it recalls the right thing at the right moment. Voice memory does all three.

**It persists.** The store is a file on disk. Close the agent, reboot the machine, switch projects, come back a month later: the memory is still there. Nothing is session-scoped.

**It grows.** Every writing sample you add gets embedded and stored (`embedSample` in `src/engine/voiceMemory.ts`). A self-healing backfill (`backfillEmbeddings`) embeds anything that is missing a vector for the active model, so coverage holds even if an ingest path skipped the inline step or you switched embedders. The more of your real messages you import, the sharper the match.

**It recalls per draft.** On each rewrite the engine embeds the draft and runs a similarity search over your stored vectors (`retrieveExemplars` in `src/engine/retrieve.ts`). The selection is not just nearest-neighbor:

- semantic cosine similarity against every stored sample,
- recency as the tiebreaker when two samples score the same,
- Maximal Marginal Relevance (default `mmrLambda` 0.7) so near-duplicates do not crowd out variety,
- a hard dedup gate dropping anything above `dedupCosine` (default 0.97),
- then the top `topK` (default 5).

Those few messages become the primary voice signal in the prompt, under a section that tells the model these are examples of how this person actually writes. The structured fingerprint stays in place as the structural spec. The static profile exemplars drop to a cold-start fallback.

**Cold start falls back to the profile.** Below `minSamples` (default 5) embedded samples, retrieval returns nothing and the engine rewrites from the profile alone. When you have some samples but fewer than the threshold, the rewrite comes back with a note suggesting you import more of your messages.

The retrieval corpus also feeds the rewrite cache key, so adding or removing samples invalidates stale cached rewrites without rerunning a search on the cache-hit path.

## Honest limits

- **It is a retrieval memory, not a reasoning agent.** It finds your most similar past writing and hands it over. It does not plan, summarize, or think about your voice. The thinking is the model's job; the remembering is voice memory's job.
- **Below `minSamples` it stays profile-only.** With too little of your writing on file, there is not enough to retrieve from, so it does not try.
- **It is best-effort.** Retrieval must never block or fail a rewrite. A model load failure, an embedding error, a search error: any of these degrades to profile-only and the rewrite proceeds. You get a result, just one leaning on the profile instead of your live messages.
- **Match quality tracks the default embedder.** The lexical embedder is fast and has no dependencies, but it keys on lexical overlap. MiniLM or Ollama will usually give closer semantic matches. That is a tradeoff you opt into, not a default.

## Is this a privacy risk?

Short answer: the embeddings are personal data and they stay on your machine.

Treat the vectors as PII-equivalent. They are derived from your own writing and they are local-only: stored in `~/.humanifyme/data.db`, computed by a local embedder, and never sent over the network. When a retrieved message is used in a rewrite, its text is redacted again at send time before it reaches the LLM provider. The raw embeddings are never sent at all.

To erase everything, run `humanify_wipe_all`. It deletes and reinitializes the database, which drops `sample_embeddings` along with every other table. After a wipe, the voice memory is gone and the next rewrite cold-starts from the profile.
