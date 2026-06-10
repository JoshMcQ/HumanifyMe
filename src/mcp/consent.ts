import { readConfig, updateConfig } from '../config/index.js';
import { HumanifyError } from './errors.js';

/** LLM-calling paths must check consent first. See docs/api-contract.md MISSING_CONSENT. */
export function requireConsent(): void {
  const config = readConfig();
  if (!config.consentAcceptedAt) {
    throw new HumanifyError(
      'MISSING_CONSENT',
      'HumanifyMe needs one-time consent before sending anything to an LLM provider. Run "humanifyme setup" or ask the agent to confirm: redacted samples/drafts go only to your configured provider, nothing else leaves this machine.',
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
