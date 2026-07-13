import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  AI_TELL_PHRASES,
  AI_WRITING_SIGNS,
  analyzeAiWriting,
  countAiTellPhrases,
  formatAiWritingAnalysis,
} from './aiSigns.js';

describe('AI writing sign catalog', () => {
  it('contains every item from the source checklist exactly once', () => {
    expect(AI_WRITING_SIGNS).toHaveLength(90);
    expect(new Set(AI_WRITING_SIGNS.map((sign) => sign.id)).size).toBe(90);
    expect(new Set(AI_WRITING_SIGNS.map((sign) => sign.title)).size).toBe(90);
    expect(AI_WRITING_SIGNS[71]).toMatchObject({
      id: 72,
      title: 'Weird em dash addiction',
      detection: 'automatic',
    });
  });

  it('keeps the public checklist synchronized with the canonical catalog', () => {
    const documentation = fs.readFileSync('docs/ai-writing-signs.md', 'utf8');
    for (const sign of AI_WRITING_SIGNS) {
      expect(documentation).toContain(`${sign.id}. ${sign.title}`);
    }
  });

  it('keeps em dash in the deterministic phrase bank', () => {
    expect(AI_TELL_PHRASES).toContain('\u2014');
    expect(countAiTellPhrases('This is polished \u2014 perhaps too polished.')).toEqual({
      count: 1,
      hits: ['\u2014'],
    });
  });
});

describe('analyzeAiWriting', () => {
  it('reports formulaic language with evidence and stable sign ids', () => {
    const result = analyzeAiWriting(
      "At its core, this robust platform plays a crucial role. Here's a polished version \u2014 in conclusion, it unlocks value.",
    );

    expect(result.findings.map((finding) => finding.id)).toEqual([2, 6, 9, 70, 72, 90]);
    expect(result.findings.find((finding) => finding.id === 72)?.evidence).toEqual(['\u2014']);
  });

  it('flags list-heavy output but not an ordinary short list', () => {
    const crowded = analyzeAiWriting('- one\n- two\n- three\n- four\n- five\nClosing thought.');
    const ordinary = analyzeAiWriting('Things I need:\n- milk\n- coffee\nThen I am done.');

    expect(crowded.findings.map((finding) => finding.id)).toContain(12);
    expect(ordinary.findings.map((finding) => finding.id)).not.toContain(12);
  });

  it('does not turn the checklist into an AI probability claim', () => {
    const output = formatAiWritingAnalysis(analyzeAiWriting('hey, did you get the file? no rush.'));

    expect(output).toContain('No deterministic signs matched.');
    expect(output).toContain('not an AI detector');
    expect(output).not.toMatch(/\b(?:probability|percent|likely AI)\b/i);
  });

  it('handles empty text without division errors', () => {
    expect(analyzeAiWriting('')).toMatchObject({ wordCount: 0, findings: [] });
  });
});
