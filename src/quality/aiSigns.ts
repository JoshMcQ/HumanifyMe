export type AiSignCategory =
  | 'formula'
  | 'structure'
  | 'voice'
  | 'word-choice'
  | 'formatting'
  | 'credibility';

export interface AiWritingSign {
  id: number;
  title: string;
  category: AiSignCategory;
  detection: 'automatic' | 'human-review';
}

export interface AiSignFinding {
  id: number;
  title: string;
  category: AiSignCategory;
  occurrences: number;
  evidence: string[];
}

export interface AiWritingAnalysis {
  wordCount: number;
  findings: AiSignFinding[];
  reviewOnlyCount: number;
}

const SIGN_TITLES = [
  'The "X is not just Y, it is Z" ending',
  '"At its core, X is about Y"',
  'Every paragraph ends like a LinkedIn post',
  '"In today\'s fast-paced world"',
  '"Landscape" language',
  'Overused AI vocabulary',
  'Overuse of transition words',
  '"It is important to note"',
  '"Plays a critical role"',
  'Balanced-to-death writing',
  'Generic "pros and cons" structure',
  'Too many bullets',
  'Symmetrical writing',
  'Repeating the same point in different words',
  'Vague examples',
  'No lived experience',
  'No real opinion',
  'No weirdness',
  'Sanitized emotion',
  'Fake empathy',
  '"As an AI language model" energy, even without the phrase',
  'Fake nuance',
  '"Best practices" without tradeoffs',
  '"Actionable insights"',
  'Corporate verb stacking',
  'Fake specificity',
  'Three-part alliteration',
  '"From X to Y" phrasing',
  '"Whether you are X or Y"',
  '"By doing X, you can Y"',
  '"Not only X but also Y"',
  '"The real power/value lies in"',
  '"A testament to"',
  '"Paves the way"',
  '"Game-changer"',
  '"Rich tapestry"',
  'Over-politeness',
  'No contractions',
  'Perfect grammar but unnatural rhythm',
  'Too many abstract nouns',
  'Passive voice everywhere',
  'Avoiding blame or agency',
  'Generic moral conclusions',
  '"Meaningful" overuse',
  '"Human-centered" slapped onto everything',
  '"Ensure that"',
  'The answer sounds like it was written for nobody',
  'Overexplaining obvious context',
  'Refusing to answer directly',
  'Overuse of headers like "Understanding X"',
  'Fake "comprehensive guide" voice',
  '"Deep dive" / "delve into"',
  'Too much hedging',
  'Too much certainty in generic claims',
  'Missing negative space',
  '"Users" instead of real people',
  'No sensory detail',
  'No time, place, or sequence',
  'It sounds like a school essay',
  'It sounds like a corporate memo',
  'Too much "stakeholder" language',
  '"Personalized" without personal details',
  'Generic motivational tone',
  '"Journey" overuse',
  'Apology + validation + answer formula',
  'The "safe answer sandwich"',
  'The five-paragraph answer to a one-sentence question',
  'Overuse of "clear, concise, and"',
  'Repeating the user\'s wording too neatly',
  '"Here is a polished version"',
  'Markdown artifacts left in normal text',
  'Weird em dash addiction',
  'Semicolon-heavy fake sophistication',
  'Colon setup sentences',
  'Too many quote-like sentences',
  'No mistakes where mistakes would be natural',
  'Tries to sound like the "average" person',
  'Uses "we" without a real we',
  'Names categories but not realities',
  '"Scalable" with no scale',
  '"Secure" with no threat model',
  '"User-friendly" with no interaction detail',
  'Too clean for the context',
  'Awkwardly formal synonyms',
  'Lack of contradictions',
  'No actual stakes',
  '"Impact" used as a magic word',
  '"Value" used as a magic word',
  'Placeholder detail',
  'Recycled conclusion phrases',
] as const;

interface PhraseRule {
  signId: number;
  phrases: readonly string[];
  minimum?: number;
}

const PHRASE_RULES: readonly PhraseRule[] = [
  { signId: 1, phrases: ['not just', "isn't just", 'is not merely'] },
  { signId: 2, phrases: ['at its core', 'at the heart of'] },
  { signId: 4, phrases: ["in today's fast-paced", "in today's rapidly evolving"] },
  { signId: 5, phrases: ['landscape', 'navigating the'] },
  {
    signId: 6,
    phrases: [
      'leverage',
      'leveraging',
      'seamless',
      'seamlessly',
      'unlock',
      'supercharge',
      'empower',
      'world-class',
      'cutting-edge',
      'robust',
      'elevate',
      'streamline',
      'underscore',
      'paradigm',
      'holistic',
      'synergy',
      'synergistic',
      'utilize',
      'facilitate',
      'commendable',
      'meticulous',
      'aforementioned',
      'in the world of',
      'a wide range of',
      'embark on',
    ],
  },
  {
    signId: 7,
    phrases: ['furthermore', 'moreover', 'that being said', 'first and foremost', 'needless to say'],
  },
  { signId: 8, phrases: ['it is important to note', "it's important to note", 'it is worth noting', "it's worth noting"] },
  { signId: 9, phrases: ['plays a critical role', 'plays a crucial role', 'plays a vital role'] },
  { signId: 23, phrases: ['best practices'] },
  { signId: 24, phrases: ['actionable insight', 'actionable insights'] },
  { signId: 28, phrases: ['from concept to completion', 'from start to finish', 'from idea to execution'] },
  { signId: 29, phrases: ["whether you're", 'whether you are'] },
  { signId: 30, phrases: ['by doing so, you can', 'by doing this, you can'] },
  { signId: 31, phrases: ['not only', 'but also'] },
  { signId: 32, phrases: ['the real power lies in', 'the real value lies in'] },
  { signId: 33, phrases: ['a testament to'] },
  { signId: 34, phrases: ['paves the way', 'pave the way'] },
  { signId: 35, phrases: ['game-changer', 'game-changing'] },
  { signId: 36, phrases: ['rich tapestry', 'tapestry'] },
  { signId: 37, phrases: ['i hope this message finds you', 'i hope this email finds you', 'rest assured', 'delighted to'] },
  { signId: 44, phrases: ['meaningful'], minimum: 2 },
  { signId: 45, phrases: ['human-centered', 'human-centric'] },
  { signId: 46, phrases: ['ensure that'] },
  { signId: 50, phrases: ['understanding the', 'understanding how', 'understanding why'] },
  { signId: 51, phrases: ['comprehensive guide', 'ultimate guide'] },
  { signId: 52, phrases: ['deep dive', 'dive into', 'delve into'] },
  { signId: 56, phrases: ['users'], minimum: 3 },
  { signId: 61, phrases: ['stakeholder', 'stakeholders'], minimum: 2 },
  { signId: 62, phrases: ['personalized', 'personalised'], minimum: 2 },
  { signId: 64, phrases: ['journey'], minimum: 2 },
  { signId: 68, phrases: ['clear, concise, and', 'clarity, consistency, and'] },
  { signId: 70, phrases: ["here's a polished version", 'here is a polished version'] },
  { signId: 80, phrases: ['scalable', 'scalability'], minimum: 2 },
  { signId: 82, phrases: ['user-friendly', 'user friendly'] },
  { signId: 84, phrases: ['whilst'] },
  { signId: 87, phrases: ['impact', 'impactful'], minimum: 3 },
  { signId: 88, phrases: ['value', 'valuable'], minimum: 3 },
  { signId: 90, phrases: ['in conclusion', 'in summary', 'at the end of the day'] },
];

const AUTOMATIC_SIGN_IDS = new Set<number>([
  ...PHRASE_RULES.map((rule) => rule.signId),
  12,
  38,
  53,
  72,
  73,
  74,
]);

const LINE_BREAK_PATTERN = /\r?\n/;
const BULLET_LINE_PATTERN = /^\s*(?:[-*+] |\d+[.)] )/;
const CONTRACTION_PATTERN = /\b(?:i'm|i've|i'd|i'll|you're|you've|you'd|you'll|we're|we've|we'd|we'll|they're|they've|they'd|they'll|isn't|aren't|wasn't|weren't|don't|doesn't|didn't|can't|couldn't|won't|wouldn't|shouldn't|it's|that's|there's|here's)\b/i;
const HEDGE_PATTERN = /\b(?:may|might|could|perhaps|potentially|generally|typically|arguably|in many cases|it depends)\b/gi;
const EM_DASH_PATTERN = /\u2014/g;
const SEMICOLON_PATTERN = /;/g;
const COLON_PATTERN = /:/g;
const WORD_PATTERN = /\b[\w']+\b/g;
const ASCII_ALPHANUMERIC_PATTERN = /[A-Za-z0-9]/;
const REGEX_SPECIAL_CHARACTER_PATTERN = /[.*+?^${}()|[\]\\]/g;

function categoryFor(id: number): AiSignCategory {
  if (id <= 9 || (id >= 28 && id <= 36) || id === 65 || id === 66 || id === 68 || id === 70 || id === 90) {
    return 'formula';
  }
  if (id === 12 || id === 71 || id === 72 || id === 73) return 'formatting';
  if ((id >= 10 && id <= 14) || id === 48 || id === 49 || id === 50 || id === 51 || id === 55 || id === 67 || id === 74 || id === 75 || id === 79) {
    return 'structure';
  }
  if ((id >= 15 && id <= 22) || id === 37 || id === 38 || id === 39 || id === 42 || id === 43 || id === 47 || id === 53 || id === 54 || (id >= 57 && id <= 60) || id === 63 || id === 69 || id === 76 || id === 77 || id === 78 || id === 83 || id === 85 || id === 86) {
    return 'voice';
  }
  if (id === 23 || id === 26 || id === 62 || (id >= 80 && id <= 82) || id === 89) return 'credibility';
  return 'word-choice';
}

export const AI_WRITING_SIGNS: readonly AiWritingSign[] = SIGN_TITLES.map((title, index) => {
  const id = index + 1;
  return {
    id,
    title,
    category: categoryFor(id),
    detection: AUTOMATIC_SIGN_IDS.has(id) ? 'automatic' : 'human-review',
  };
});

/** Literal phrase bank used by the deterministic eval scorer. */
export const AI_TELL_PHRASES: readonly string[] = [
  '\u2014',
  ...new Set(PHRASE_RULES.flatMap((rule) => rule.phrases)),
];

const LITERAL_PATTERNS = new Map(
  AI_TELL_PHRASES.map((phrase) => [phrase, compileLiteralPattern(phrase)] as const),
);

export function analyzeAiWriting(text: string): AiWritingAnalysis {
  const wordCount = countWords(text);
  const findings = new Map<number, AiSignFinding>();

  for (const rule of PHRASE_RULES) {
    const evidence: string[] = [];
    let occurrences = 0;
    for (const phrase of rule.phrases) {
      const count = countLiteral(text, phrase);
      if (count > 0) {
        occurrences += count;
        evidence.push(phrase);
      }
    }
    if (occurrences >= (rule.minimum ?? 1)) addFinding(findings, rule.signId, occurrences, evidence);
  }

  const lines = text.split(LINE_BREAK_PATTERN);
  const nonBlankLines = lines.filter((line) => line.trim()).length;
  const bulletLines = lines.filter((line) => BULLET_LINE_PATTERN.test(line)).length;
  if (bulletLines >= 5 && bulletLines / Math.max(nonBlankLines, 1) >= 0.4) {
    addFinding(findings, 12, bulletLines, [`${bulletLines} bullet lines`]);
  }

  if (wordCount >= 80 && !CONTRACTION_PATTERN.test(text)) {
    addFinding(findings, 38, 1, ['no contractions in 80+ words']);
  }

  const hedges = countMatches(text, HEDGE_PATTERN);
  if (hedges >= 4 && hedges / Math.max(wordCount, 1) >= 0.025) {
    addFinding(findings, 53, hedges, [`${hedges} hedges`]);
  }

  const emDashes = countMatches(text, EM_DASH_PATTERN);
  if (emDashes > 0) addFinding(findings, 72, emDashes, ['\u2014']);

  const semicolons = countMatches(text, SEMICOLON_PATTERN);
  if (semicolons >= 3 && semicolons / Math.max(wordCount, 1) >= 0.015) {
    addFinding(findings, 73, semicolons, [`${semicolons} semicolons`]);
  }

  const colons = countMatches(text, COLON_PATTERN);
  if (colons >= 3 && colons / Math.max(wordCount, 1) >= 0.015) {
    addFinding(findings, 74, colons, [`${colons} colons`]);
  }

  return {
    wordCount,
    findings: [...findings.values()].sort((a, b) => a.id - b.id),
    reviewOnlyCount: AI_WRITING_SIGNS.length - AUTOMATIC_SIGN_IDS.size,
  };
}

export function formatAiWritingAnalysis(analysis: AiWritingAnalysis): string {
  const lines = [
    `AI-writing review: ${analysis.findings.length} mechanical sign${analysis.findings.length === 1 ? '' : 's'} found in ${analysis.wordCount} words.`,
  ];
  if (analysis.findings.length === 0) lines.push('No deterministic signs matched.');
  for (const finding of analysis.findings) {
    lines.push(`${finding.id}. ${finding.title} (${finding.occurrences} match${finding.occurrences === 1 ? '' : 'es'}: ${finding.evidence.join(', ')})`);
  }
  lines.push(
    '',
    `This is an editing checklist, not an AI detector. ${analysis.reviewOnlyCount} subjective signs require human judgment.`,
  );
  return lines.join('\n');
}

export function countAiTellPhrases(text: string): { count: number; hits: string[] } {
  const hits: string[] = [];
  for (const phrase of AI_TELL_PHRASES) {
    const count = countLiteral(text, phrase);
    for (let i = 0; i < count; i++) hits.push(phrase);
  }
  return { count: hits.length, hits };
}

function addFinding(
  findings: Map<number, AiSignFinding>,
  id: number,
  occurrences: number,
  evidence: string[],
): void {
  const sign = AI_WRITING_SIGNS[id - 1];
  if (!sign) throw new Error(`Unknown AI-writing sign: ${id}`);
  findings.set(id, { id, title: sign.title, category: sign.category, occurrences, evidence });
}

function countWords(text: string): number {
  return (text.match(WORD_PATTERN) ?? []).length;
}

function countLiteral(text: string, phrase: string): number {
  const pattern = LITERAL_PATTERNS.get(phrase);
  if (!pattern) throw new Error(`No compiled pattern for AI-writing phrase: ${phrase}`);
  return countMatches(text, pattern);
}

function countMatches(text: string, regex: RegExp): number {
  return text.match(regex)?.length ?? 0;
}

function escapeRegex(value: string): string {
  return value.replace(REGEX_SPECIAL_CHARACTER_PATTERN, '\\$&');
}

function compileLiteralPattern(phrase: string): RegExp {
  const escaped = escapeRegex(phrase);
  return ASCII_ALPHANUMERIC_PATTERN.test(phrase)
    ? new RegExp(`\\b${escaped}\\b`, 'gi')
    : new RegExp(escaped, 'g');
}
