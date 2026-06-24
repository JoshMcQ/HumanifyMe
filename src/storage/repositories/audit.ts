import { z } from 'zod';
import { getDb } from '../db.js';
import { AUDIT_CAP, AuditEntry } from '../../types.js';

const AppendSchema = z.object({
  provider: z.string().min(1),
  route: z.string().min(1),
  payloadBytes: z.number().int().nonnegative(),
  draftLength: z.number().int().nonnegative(),
  profileIncluded: z.boolean(),
  success: z.boolean(),
  errorCode: z.string().nullable().default(null),
}).strict();

export type AuditAppendInput = z.input<typeof AppendSchema>;

export const audit = {
  /** Appends an audit row and returns its id (for joining feedback to the call). */
  append(input: AuditAppendInput): number {
    const valid = AppendSchema.parse(input);
    const db = getDb();
    const info = db.prepare(
      `INSERT INTO audit_log (timestamp, provider, route, payload_bytes, draft_length, profile_included, success, error_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      new Date().toISOString(),
      valid.provider,
      valid.route,
      valid.payloadBytes,
      valid.draftLength,
      valid.profileIncluded ? 1 : 0,
      valid.success ? 1 : 0,
      valid.errorCode,
    );
    // Ring buffer: evict oldest past cap.
    db.prepare(
      `DELETE FROM audit_log WHERE id IN (
         SELECT id FROM audit_log ORDER BY id DESC LIMIT -1 OFFSET ?
       )`,
    ).run(AUDIT_CAP);
    return Number(info.lastInsertRowid);
  },

  list(limit = AUDIT_CAP): AuditEntry[] {
    const capped = Math.min(Math.max(1, limit), 100);
    const rows = getDb()
      .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?')
      .all(capped) as unknown as Array<{
      id: number;
      timestamp: string;
      provider: string;
      route: string;
      payload_bytes: number;
      draft_length: number;
      profile_included: number;
      success: number;
      error_code: string | null;
    }>;
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      provider: r.provider,
      route: r.route,
      payloadBytes: r.payload_bytes,
      draftLength: r.draft_length,
      profileIncluded: r.profile_included === 1,
      success: r.success === 1,
      errorCode: r.error_code,
    }));
  },

  clear(): void {
    getDb().prepare('DELETE FROM audit_log').run();
  },
};
