// Pure-function redactor. Runs before any text leaves the device.
// See specs/privacy-security-spec.md "Redaction rules".

import { DEFAULT_PATTERNS, RedactionPattern } from './patterns.js';

export type RedactionMap = Record<string, string>; // "[EMAIL_1]" -> original

export interface RedactResult {
  redactedText: string;
  map: RedactionMap;
  applied: boolean;
}

export function redact(text: string, patterns: RedactionPattern[] = DEFAULT_PATTERNS): RedactResult {
  let out = text;
  const map: RedactionMap = {};
  const counters: Record<string, number> = {};

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    out = out.replace(pattern.regex, (match) => {
      if (pattern.validate && !pattern.validate(match)) return match;
      // Reuse the same placeholder for an identical original value.
      const existing = Object.entries(map).find(([, v]) => v === match);
      if (existing) return existing[0];
      counters[pattern.placeholder] = (counters[pattern.placeholder] ?? 0) + 1;
      const placeholder = `[${pattern.placeholder}_${counters[pattern.placeholder]}]`;
      map[placeholder] = match;
      return placeholder;
    });
  }

  return { redactedText: out, map, applied: Object.keys(map).length > 0 };
}
