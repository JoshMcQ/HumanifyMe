import { getDb } from '../db.js';
import { StyleProfile, StyleProfileSchema } from '../../engine/styleProfile.js';

export const profiles = {
  get(): StyleProfile | null {
    const row = getDb().prepare("SELECT profile FROM profiles WHERE id = 'current'").get() as unknown as
      | { profile: string }
      | undefined;
    if (!row) return null;
    return StyleProfileSchema.parse(JSON.parse(row.profile));
  },

  set(profile: StyleProfile): StyleProfile {
    const valid = StyleProfileSchema.parse(profile);
    getDb()
      .prepare(
        "INSERT INTO profiles (id, profile, updated_at) VALUES ('current', ?, ?) " +
          'ON CONFLICT(id) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at',
      )
      .run(JSON.stringify(valid), new Date().toISOString());
    return valid;
  },

  clear(): boolean {
    const result = getDb().prepare("DELETE FROM profiles WHERE id = 'current'").run();
    return result.changes > 0;
  },
};
