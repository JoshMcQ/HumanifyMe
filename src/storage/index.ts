// The storage boundary. No other module touches SQLite directly.

import { deleteAndReinitDb } from './db.js';
import { resetConfig } from '../config/index.js';
import { deleteAllProviderApiKeys } from '../config/secrets.js';
import { audit } from './repositories/audit.js';

export { samples } from './repositories/samples.js';
export { profiles } from './repositories/profiles.js';
export { cache } from './repositories/cache.js';
export { audit } from './repositories/audit.js';
export { embeddings } from './repositories/embeddings.js';
export type { EmbeddingRecord } from './repositories/embeddings.js';
export { feedback, SIGNAL_TO_SOUNDS_LIKE_ME } from './repositories/feedback.js';
export type { FeedbackSignal, SoundsLikeMe, FeedbackMetrics, SignalCounts } from './repositories/feedback.js';
export { getDb, closeDb } from './db.js';

/**
 * Wipe semantics per docs/data-model.md:
 * delete DB, reset config (preserving consent unless full=true),
 * re-init schema, append a single WIPE_ALL audit entry.
 */
export function wipeAll(opts: { full?: boolean } = {}): void {
  deleteAllProviderApiKeys();
  deleteAndReinitDb();
  resetConfig({ preserveConsent: !opts.full });
  audit.append({
    provider: 'self',
    route: 'WIPE_ALL',
    payloadBytes: 0,
    draftLength: 0,
    profileIncluded: false,
    success: true,
    errorCode: null,
  });
}
