import fs from 'node:fs';
import { configPath, ensureHome } from '../paths.js';
import { Config, ConfigSchema, DEFAULT_CONFIG } from './schema.js';

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
  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Config at ${file} failed validation: ${issues}`);
  }
  return result.data;
}

export function writeConfig(config: Config): void {
  ensureHome();
  const validated = ConfigSchema.parse(config);
  const file = configPath();
  fs.writeFileSync(file, JSON.stringify(validated, null, 2) + '\n', 'utf8');
  setOwnerOnlyPerms(file);
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
