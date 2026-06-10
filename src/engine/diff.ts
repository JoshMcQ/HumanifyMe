import { diffWords } from 'diff';
import { DiffSegment } from '../types.js';

export function computeDiff(original: string, rewrite: string): DiffSegment[] {
  return diffWords(original, rewrite).map((part) => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
    text: part.value,
  }));
}
