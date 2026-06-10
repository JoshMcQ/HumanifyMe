// StyleProfile schema per specs/style-profile-spec.md. zod is the source of truth.

import { z } from 'zod';
import { CONTEXT_LABELS } from '../types.js';

const Frequency = z.enum(['rare', 'sometimes', 'frequent']);
const OneToFive = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
]);

export const VoiceFingerprintSchema = z.object({
  sentenceLength: z.object({
    average: z.enum(['short', 'medium', 'long']),
    variance: z.enum(['low', 'medium', 'high']),
  }).strict(),
  formality: OneToFive,
  directness: OneToFive,
  humor: z.enum(['none', 'dry', 'warm', 'sarcastic', 'absurd']),
  profanity: z.enum(['none', 'mild', 'moderate', 'frequent']),
  contractions: z.enum(['rare', 'sometimes', 'always']),
  oxfordComma: z.boolean(),
  punctuationHabits: z.object({
    emDash: Frequency,
    semicolon: Frequency,
    ellipsis: Frequency,
    exclamation: Frequency,
    parentheses: Frequency,
  }).strict(),
  capitalization: z.object({
    sentenceCase: z.boolean(),
    titleCase: z.enum(['always', 'sometimes', 'never']),
    allLowercase: z.boolean(),
  }).strict(),
  commonPhrases: z.array(z.string()),
  wordsToAvoid: z.array(z.string()),
  greetings: z.array(z.string()),
  signoffs: z.array(z.string()),
  howTheyAskQuestions: z.string(),
  howTheyDisagree: z.string(),
  howTheyApologize: z.string(),
  howTheyGiveInstructions: z.string(),
  exemplars: z.array(z.string()),
}).strict();

export type VoiceFingerprint = z.infer<typeof VoiceFingerprintSchema>;

export const ContextVariantSchema = z.object({
  overrides: VoiceFingerprintSchema.partial(),
  notes: z.string(),
  exemplars: z.array(z.string()),
}).strict();

export type ContextVariant = z.infer<typeof ContextVariantSchema>;

const contextsShape = Object.fromEntries(
  CONTEXT_LABELS.map((label) => [label, ContextVariantSchema.optional()]),
) as Record<(typeof CONTEXT_LABELS)[number], z.ZodOptional<typeof ContextVariantSchema>>;

export const StyleProfileSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  base: VoiceFingerprintSchema,
  contexts: z.object(contextsShape).strict(),
  metadata: z.object({
    sampleCount: z.number().int().nonnegative(),
    labelCoverage: z.array(z.string()),
    notes: z.string().optional(),
  }).strict(),
}).strict();

export type StyleProfile = z.infer<typeof StyleProfileSchema>;

/** Merge a context variant's overrides onto the base fingerprint (shallow per field, deep for nested objects). */
export function mergeFingerprint(
  base: VoiceFingerprint,
  overrides?: Partial<VoiceFingerprint>,
): VoiceFingerprint {
  if (!overrides) return base;
  const merged: VoiceFingerprint = { ...base, ...overrides } as VoiceFingerprint;
  if (overrides.sentenceLength) {
    merged.sentenceLength = { ...base.sentenceLength, ...overrides.sentenceLength };
  }
  if (overrides.punctuationHabits) {
    merged.punctuationHabits = { ...base.punctuationHabits, ...overrides.punctuationHabits };
  }
  if (overrides.capitalization) {
    merged.capitalization = { ...base.capitalization, ...overrides.capitalization };
  }
  return merged;
}
