import { RedactionMap } from './redact.js';

/**
 * Reverses redaction. Also tolerates the LLM dropping the numeric suffix
 * (e.g. echoing "[EMAIL]" instead of "[EMAIL_1]") by substituting the first
 * mapped value of that type.
 */
export function restore(text: string, map: RedactionMap): string {
  let out = text;
  for (const [placeholder, original] of Object.entries(map)) {
    out = out.split(placeholder).join(original);
  }
  // Fallback: bare placeholders without suffix.
  out = out.replace(/\[([A-Z_]+)\]/g, (match, label: string) => {
    const first = Object.entries(map).find(([k]) => k.startsWith(`[${label}_`));
    return first ? first[1] : match;
  });
  return out;
}
