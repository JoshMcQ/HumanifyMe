import { describe, it, expect } from 'vitest';
import { isoWeek, computeStats } from '../src/aggregate.js';
import type { EventRow } from '../src/types.js';

describe('isoWeek', () => {
  it('buckets dates into ISO week keys', () => {
    expect(isoWeek('2026-06-24T12:00:00.000Z')).toBe('2026-W26');
    expect(isoWeek('2026-01-01T00:00:00.000Z')).toBe('2026-W01');
    expect(isoWeek('not-a-date')).toBe('unknown');
  });
});

describe('computeStats by_week', () => {
  it('groups rewrites by ISO week across sources', () => {
    const events: EventRow[] = [
      {
        id: 1,
        source: 'mcp',
        anon: 'a',
        ts: '2026-06-24T00:00:00.000Z',
        payload: { totals: { rewrites: 4 }, sounds_like_me: { y: 4, kinda: 0, n: 0 } },
      },
      { id: 2, source: 'try-it', anon: null, ts: '2026-07-01T00:00:00.000Z', payload: { signal: 'accept' } },
    ];
    const stats = computeStats(events, '2026-07-02T00:00:00.000Z');
    expect(stats.by_week['2026-W26']).toBe(4);
    expect(stats.by_week['2026-W27']).toBe(1);
    expect(stats.total_rewrites).toBe(5);
  });
});
