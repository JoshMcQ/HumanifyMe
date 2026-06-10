import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb } from '../db.js';
import {
  ContextLabelSchema,
  MIN_SAMPLE_CHARS,
  SampleRecord,
  SampleSourceSchema,
} from '../../types.js';

const AddSampleSchema = z.object({
  text: z.string().min(MIN_SAMPLE_CHARS, `text must be at least ${MIN_SAMPLE_CHARS} characters`),
  labels: z.array(ContextLabelSchema).min(1, 'at least one label is required'),
  source: SampleSourceSchema.default('paste'),
}).strict();

export type AddSampleInput = z.input<typeof AddSampleSchema>;

interface Row {
  id: string;
  text: string;
  labels: string;
  source: string;
  created_at: string;
  char_count: number;
}

function rowToRecord(row: Row): SampleRecord {
  return {
    id: row.id,
    text: row.text,
    labels: JSON.parse(row.labels),
    source: row.source as SampleRecord['source'],
    createdAt: row.created_at,
    charCount: row.char_count,
  };
}

export const samples = {
  add(input: AddSampleInput): SampleRecord {
    const valid = AddSampleSchema.parse(input);
    const record: SampleRecord = {
      id: randomUUID(),
      text: valid.text,
      labels: valid.labels,
      source: valid.source,
      createdAt: new Date().toISOString(),
      charCount: valid.text.length,
    };
    getDb()
      .prepare(
        'INSERT INTO samples (id, text, labels, source, created_at, char_count) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        record.id,
        record.text,
        JSON.stringify(record.labels),
        record.source,
        record.createdAt,
        record.charCount,
      );
    return record;
  },

  list(filter?: { label?: string }): SampleRecord[] {
    const db = getDb();
    const rows = (
      db.prepare('SELECT * FROM samples ORDER BY created_at DESC').all() as unknown as Row[]
    ).map(rowToRecord);
    if (filter?.label) {
      const label = ContextLabelSchema.parse(filter.label);
      return rows.filter((r) => r.labels.includes(label));
    }
    return rows;
  },

  get(id: string): SampleRecord | null {
    const row = getDb().prepare('SELECT * FROM samples WHERE id = ?').get(id) as unknown as
      | Row
      | undefined;
    return row ? rowToRecord(row) : null;
  },

  remove(id: string): boolean {
    const result = getDb().prepare('DELETE FROM samples WHERE id = ?').run(id);
    return result.changes > 0;
  },

  clear(): void {
    getDb().prepare('DELETE FROM samples').run();
  },

  count(): number {
    const row = getDb().prepare('SELECT COUNT(*) AS n FROM samples').get() as unknown as { n: number };
    return row.n;
  },
};
