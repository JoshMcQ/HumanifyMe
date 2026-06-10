import { getDb } from '../db.js';
import { CACHE_CAP, CACHE_TTL_MS, RewriteResponse } from '../../types.js';

export const cache = {
  get(key: string): RewriteResponse | null {
    const row = getDb()
      .prepare('SELECT response, last_used FROM rewrite_cache WHERE key = ?')
      .get(key) as unknown as { response: string; last_used: string } | undefined;
    if (!row) return null;
    if (Date.now() - new Date(row.last_used).getTime() > CACHE_TTL_MS) {
      getDb().prepare('DELETE FROM rewrite_cache WHERE key = ?').run(key);
      return null;
    }
    getDb()
      .prepare('UPDATE rewrite_cache SET last_used = ? WHERE key = ?')
      .run(new Date().toISOString(), key);
    return JSON.parse(row.response) as RewriteResponse;
  },

  put(key: string, response: RewriteResponse): void {
    const db = getDb();
    db.prepare(
      'INSERT INTO rewrite_cache (key, response, last_used) VALUES (?, ?, ?) ' +
        'ON CONFLICT(key) DO UPDATE SET response = excluded.response, last_used = excluded.last_used',
    ).run(key, JSON.stringify(response), new Date().toISOString());
    // LRU eviction past cap.
    db.prepare(
      `DELETE FROM rewrite_cache WHERE key IN (
         SELECT key FROM rewrite_cache ORDER BY last_used DESC LIMIT -1 OFFSET ?
       )`,
    ).run(CACHE_CAP);
  },

  clear(): void {
    getDb().prepare('DELETE FROM rewrite_cache').run();
  },

  count(): number {
    const row = getDb().prepare('SELECT COUNT(*) AS n FROM rewrite_cache').get() as unknown as {
      n: number;
    };
    return row.n;
  },
};
