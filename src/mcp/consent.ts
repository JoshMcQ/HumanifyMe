import { readConfig, updateConfig } from '../config/index.js';
import { HumanifyError } from './errors.js';

/** LLM-calling paths must check consent first. See docs/api-contract.md MISSING_CONSENT. */
export function requireConsent(): void {
  const config = readConfig();
  if (!config.consentAcceptedAt) {
    throw new HumanifyError(
      'MISSING_CONSENT',
      'HumanifyMe needs one-time consent before sending anything to an LLM provider. Ask the user to run "npx -y humanifyme setup" once in a terminal: it records consent, stores the provider key securely, and collects writing samples. Redacted samples/drafts go only to the configured provider.',
    );
  }
}

export function acceptConsent(): string {
  const ts = new Date().toISOString();
  updateConfig((c) => {
    c.consentAcceptedAt = ts;
  });
  return ts;
}

export function consentStatus(): string | undefined {
  return readConfig().consentAcceptedAt;
}
