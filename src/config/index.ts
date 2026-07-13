import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { configPath, ensureHome } from '../paths.js';
import { Config, ConfigSchema, DEFAULT_CONFIG } from './schema.js';
import {
  deleteProviderApiKey,
  getProviderApiKey,
  setProviderApiKey,
  type CloudProviderName,
} from './secrets.js';

function setOwnerOnlyPerms(file: string): void {
  // 0600 on POSIX. On Windows chmod is a no-op for the group/other bits;
  // ACL tightening is best-effort and documented in specs/privacy-security-spec.md.
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // best-effort
  }
}

export function readConfig(): Config {
  ensureHome();
  const file = configPath();
  if (!fs.existsSync(file)) {
    writeConfig(DEFAULT_CONFIG);
    return structuredClone(DEFAULT_CONFIG);
  }
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new Error(`Could not read config at ${file}: ${(err as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Config at ${file} is not valid JSON. Fix it by hand or run "humanifyme wipe --confirm --full" to reset.`,
    );
  }
  const migration = migrateConfig(parsed);
  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    const validationError = new Error(`Config at ${file} failed validation: ${issues}`);
    throw withRollbackContext(validationError, rollbackLegacyProviderKeys(migration.migratedProviders));
  }
  if (migration.shouldRewrite) {
    try {
      writeConfig(result.data);
    } catch (error) {
      throw withRollbackContext(error, rollbackLegacyProviderKeys(migration.migratedProviders));
    }
  }
  return result.data;
}

export function writeConfig(config: Config): void {
  ensureHome();
  const validated = ConfigSchema.parse(config);
  const file = configPath();
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(validated, null, 2) + '\n', {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    setOwnerOnlyPerms(temp);
    fs.renameSync(temp, file);
    setOwnerOnlyPerms(file);
  } catch (error) {
    throw new Error(`Could not write config at ${file}: ${(error as Error).message}`, { cause: error });
  } finally {
    if (fs.existsSync(temp)) fs.rmSync(temp, { force: true });
  }
}

export function updateConfig(mutate: (config: Config) => void): Config {
  const config = readConfig();
  mutate(config);
  writeConfig(config);
  return config;
}

export function resetConfig(opts: { preserveConsent: boolean }): Config {
  const prev = fs.existsSync(configPath()) ? safeReadForReset() : undefined;
  const next = structuredClone(DEFAULT_CONFIG);
  if (opts.preserveConsent && prev?.consentAcceptedAt) {
    next.consentAcceptedAt = prev.consentAcceptedAt;
  }
  writeConfig(next);
  return next;
}

function safeReadForReset(): Config | undefined {
  try {
    return readConfig();
  } catch {
    return undefined;
  }
}

interface MigratedProviderKey {
  provider: CloudProviderName;
  previousApiKey: string | null;
}

interface ConfigMigration {
  migratedProviders: MigratedProviderKey[];
  shouldRewrite: boolean;
}

function migrateConfig(raw: unknown): ConfigMigration {
  const migration: ConfigMigration = { migratedProviders: [], shouldRewrite: false };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return migration;

  const legacyConfig = raw as Record<string, unknown>;
  if (legacyConfig.version !== 1) return migration;

  migration.shouldRewrite = true;
  const providers = legacyConfig.providers;
  if (providers && typeof providers === 'object' && !Array.isArray(providers)) {
    migrateLegacyProviderKeys(providers as Record<string, unknown>, migration.migratedProviders);
  }
  legacyConfig.version = 2;
  return migration;
}

function migrateLegacyProviderKeys(
  providers: Record<string, unknown>,
  migrated: MigratedProviderKey[],
): void {
  try {
    for (const provider of ['anthropic', 'openai', 'gemini'] as const) {
      const entry = providers[provider];
      if (!entry || typeof entry !== 'object') continue;
      const legacy = entry as Record<string, unknown>;
      if (typeof legacy.apiKey !== 'string') continue;
      const previousApiKey = getProviderApiKey(provider);
      migrated.push({ provider, previousApiKey });
      setProviderApiKey(provider, legacy.apiKey);
      delete legacy.apiKey;
      legacy.credentialStored = true;
    }
  } catch (error) {
    throw withRollbackContext(error, rollbackLegacyProviderKeys(migrated));
  }
}

function rollbackLegacyProviderKeys(migrated: MigratedProviderKey[]): Error[] {
  const errors: Error[] = [];
  for (const { provider, previousApiKey } of [...migrated].reverse()) {
    try {
      if (previousApiKey !== null) setProviderApiKey(provider, previousApiKey);
      else deleteProviderApiKey(provider);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  return errors;
}

function withRollbackContext(error: unknown, rollbackErrors: Error[]): Error {
  const primary = error instanceof Error ? error : new Error(String(error));
  if (rollbackErrors.length === 0) return primary;
  return new Error(
    `${primary.message} Credential rollback also failed: ${rollbackErrors.map((item) => item.message).join('; ')}`,
    { cause: primary },
  );
}
