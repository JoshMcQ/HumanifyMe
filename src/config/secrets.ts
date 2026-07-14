import { createHash } from 'node:crypto';
import { Entry } from '@napi-rs/keyring';
import { humanifymeHome } from '../paths.js';

export type CloudProviderName = 'anthropic' | 'openai' | 'gemini';

export interface SecretStore {
  get(service: string, account: string): string | null;
  set(service: string, account: string, secret: string): void;
  delete(service: string, account: string): void;
}

const keyringStore: SecretStore = {
  get: (service, account) => new Entry(service, account).getPassword(),
  set: (service, account, secret) => new Entry(service, account).setPassword(secret),
  delete: (service, account) => {
    new Entry(service, account).deleteCredential();
  },
};

let storeOverride: SecretStore | null = null;

function store(): SecretStore {
  return storeOverride ?? keyringStore;
}

function account(provider: CloudProviderName): string {
  const homeId = createHash('sha256').update(humanifymeHome()).digest('hex').slice(0, 16);
  return `${provider}:${homeId}`;
}

function keyringError(action: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(
    `Could not ${action} the provider credential in the OS keychain: ${detail}. ` +
      'HumanifyMe does not fall back to plaintext storage.',
  );
}

export function getProviderApiKey(provider: CloudProviderName): string | null {
  try {
    return store().get('HumanifyMe', account(provider));
  } catch (error) {
    throw keyringError('read', error);
  }
}

export function setProviderApiKey(provider: CloudProviderName, apiKey: string): void {
  if (!apiKey.trim()) throw new Error('Provider API key cannot be empty.');
  try {
    store().set('HumanifyMe', account(provider), apiKey);
  } catch (error) {
    throw keyringError('store', error);
  }
}

export function deleteProviderApiKey(provider: CloudProviderName): void {
  try {
    store().delete('HumanifyMe', account(provider));
  } catch (error) {
    if (/no entry|not found|does not exist/i.test(error instanceof Error ? error.message : String(error))) return;
    throw keyringError('delete', error);
  }
}

export function deleteAllProviderApiKeys(): void {
  for (const provider of ['anthropic', 'openai', 'gemini'] as const) deleteProviderApiKey(provider);
}

/** Test seam. Production code always uses the native OS credential store. */
export function setSecretStoreOverride(value: SecretStore | null): void {
  storeOverride = value;
}
