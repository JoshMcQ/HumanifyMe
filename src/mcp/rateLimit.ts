// Local daily rate limit (config.rateLimitPerDay, default 200). In-process
// counter keyed by UTC date; resets on restart, which is acceptable for a
// guardrail whose purpose is protecting the user's own LLM bill.

import { readConfig } from '../config/index.js';
import { HumanifyError } from './errors.js';

let day = '';
let count = 0;

export const rateLimit = {
  consume(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      count = 0;
    }
    const cap = readConfig().rateLimitPerDay;
    if (count >= cap) {
      throw new HumanifyError(
        'RATE_LIMITED_LOCAL',
        `local daily limit of ${cap} rewrites reached; raise rateLimitPerDay in config.json if intentional`,
      );
    }
    count++;
  },
  reset(): void {
    day = '';
    count = 0;
  },
};
