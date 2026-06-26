// Redaction patterns per specs/privacy-security-spec.md.
// Order matters: more specific secret patterns run before generic ones,
// and card numbers run before phone numbers to avoid partial matches.

export interface RedactionPattern {
  name: string;
  placeholder: string; // base label, e.g. EMAIL -> [EMAIL_1]
  regex: RegExp;
  /** Optional post-match validation (e.g. Luhn for cards). */
  validate?: (match: string) => boolean;
}

function luhnValid(raw: string): boolean {
  const digits = raw.replace(/[\s-]/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export const DEFAULT_PATTERNS: RedactionPattern[] = [
  {
    name: 'jwt',
    placeholder: 'TOKEN',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g,
  },
  {
    name: 'aws_key',
    placeholder: 'AWS_KEY',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    name: 'api_key',
    placeholder: 'API_KEY',
    regex: /\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|AIza[A-Za-z0-9_-]{30,})\b|Bearer\s+[A-Za-z0-9._-]{20,}/g,
  },
  {
    name: 'email',
    placeholder: 'EMAIL',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    name: 'card',
    placeholder: 'CARD',
    regex: /\b(?:\d[ -]?){13,19}\b/g,
    validate: luhnValid,
  },
  {
    name: 'phone',
    placeholder: 'PHONE',
    // E.164 and common US formats. Requires separators or +country to avoid
    // swallowing arbitrary long numbers in prose.
    regex: /(?:\+\d{1,3}[ .-]?)?(?:\(\d{3}\)[ .-]?|\d{3}[ .-])\d{3}[ .-]\d{4}\b|\+\d{7,14}\b/g,
  },
  {
    name: 'address',
    placeholder: 'ADDRESS',
    // Best-effort US street address: number + street name + suffix.
    regex: /\b\d{1,6}\s+(?:[A-Z][A-Za-z'-]*\s){1,4}(?:Street|St\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Road|Rd\.?|Court|Ct\.?|Place|Pl\.?|Way|Terrace|Ter\.?|Circle|Cir\.?)\b(?:,?\s+(?:Apt|Suite|Ste|Unit|#)\.?\s*[\w-]+)?/g,
  },
];
