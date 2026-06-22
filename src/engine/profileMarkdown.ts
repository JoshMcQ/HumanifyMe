// Plain-English profile summary for the humanify://profile.md resource and
// the CLI `profile show` command.

import { StyleProfile } from './styleProfile.js';

export function renderProfileMarkdown(profile: StyleProfile | null): string {
  if (!profile) {
    return '# No voice profile yet\n\nAdd at least 3 writing samples and run `humanify_build_profile` (or `humanifyme profile rebuild`).';
  }
  const b = profile.base;
  const lines: string[] = [];
  lines.push('# Your voice profile');
  lines.push('');
  lines.push(`Built ${profile.generatedAt} from ${profile.metadata.sampleCount} samples (labels: ${profile.metadata.labelCoverage.join(', ') || 'none'}).`);
  lines.push('');
  lines.push(`You write ${b.sentenceLength.average} sentences with ${b.sentenceLength.variance} variance. Formality ${b.formality}/5, directness ${b.directness}/5. Humor: ${b.humor}. Profanity: ${b.profanity}. Contractions: ${b.contractions}. Oxford comma: ${b.oxfordComma ? 'yes' : 'no'}.`);
  lines.push('');
  lines.push(`Punctuation: em-dash ${b.punctuationHabits.emDash}, semicolons ${b.punctuationHabits.semicolon}, ellipses ${b.punctuationHabits.ellipsis}, exclamation points ${b.punctuationHabits.exclamation}, parentheses ${b.punctuationHabits.parentheses}.`);
  const cap = b.capitalization;
  if (cap.allLowercase) {
    lines.push('\nYou write in all lowercase.');
  } else if (cap.sentenceCase) {
    const titleNote =
      cap.titleCase === 'always'
        ? ' (and Title Case where it fits, like headings)'
        : cap.titleCase === 'sometimes'
          ? ' (with the occasional Title Case)'
          : '';
    lines.push(`\nYou use normal sentence capitalization${titleNote}.`);
  }
  if (b.commonPhrases.length) lines.push(`\nPhrases you actually use: ${b.commonPhrases.map((p) => `"${p}"`).join(', ')}.`);
  if (b.wordsToAvoid.length) lines.push(`\nWords you never use: ${b.wordsToAvoid.join(', ')}.`);
  if (b.greetings.length) lines.push(`\nGreetings: ${b.greetings.join(' / ')}. Signoffs: ${b.signoffs.join(' / ')}.`);
  lines.push('');
  lines.push(`**How you ask questions:** ${b.howTheyAskQuestions}`);
  lines.push(`**How you disagree:** ${b.howTheyDisagree}`);
  lines.push(`**How you apologize:** ${b.howTheyApologize}`);
  lines.push(`**How you give instructions:** ${b.howTheyGiveInstructions}`);
  const contexts = Object.entries(profile.contexts).filter(([, v]) => v);
  if (contexts.length) {
    lines.push('');
    lines.push('## Context variations');
    for (const [label, variant] of contexts) {
      lines.push(`- **${label}**: ${variant!.notes}`);
    }
  }
  if (profile.metadata.notes) {
    lines.push('');
    lines.push(`_Notes: ${profile.metadata.notes}_`);
  }
  return lines.join('\n');
}
