import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const readText = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => {
  throw new Error(message);
};

const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const plugin = readJson('humanifyme.plugin/.claude-plugin/plugin.json');
const marketplace = readJson('.claude-plugin/marketplace.json');
const mcp = readJson('humanifyme.plugin/.mcp.json');
const version = packageJson.version;
const expectedPackage = `${packageJson.name}@${version}`;
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const equal = (label, actual, expected) => {
  if (actual !== expected) fail(`${label} is ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}`);
};

equal('package-lock version', packageLock.version, version);
equal('package-lock root version', packageLock.packages?.['']?.version, version);
equal('plugin manifest version', plugin.version, version);
equal(
  'marketplace plugin version',
  marketplace.plugins?.find((entry) => entry.name === packageJson.name)?.version,
  version,
);

const mcpArgs = mcp.mcpServers?.humanifyme?.args;
if (!Array.isArray(mcpArgs) || !mcpArgs.includes(expectedPackage)) {
  fail(`plugin MCP command must pin ${expectedPackage}`);
}

for (const file of [
  'README.md',
  'humanifyme.plugin/README.md',
  'humanifyme.plugin/skills/build-voice-profile/SKILL.md',
  'docs/install/README.md',
  'docs/releasing.md',
  'specs/plugin-spec.md',
]) {
  const pins = [...readText(file).matchAll(/humanifyme@(\d+\.\d+\.\d+)/g)].map((match) => match[1]);
  if (pins.length === 0) fail(`${file} must contain an explicit npm package pin`);
  for (const pin of pins) equal(`${file} package pin`, pin, version);
}

if (!new RegExp(`^## ${escapedVersion}(?:\\s|$)`, 'm').test(readText('CHANGELOG.md'))) {
  fail(`CHANGELOG.md must contain a release heading for ${version}`);
}

const args = process.argv.slice(2);
const tagIndex = args.indexOf('--tag');
if (tagIndex >= 0) {
  const tag = args[tagIndex + 1];
  if (!tag) fail('--tag requires a value');
  equal('release tag', tag, `v${version}`);
}

if (args.includes('--ensure-unpublished')) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) fail('npm_execpath is unavailable; run this check through npm run');
  const result = spawnSync(process.execPath, [npmCli, 'view', expectedPackage, 'version', '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  if (result.error) fail(`could not run npm view: ${result.error.message}`);
  if (result.status === 0 && stdout.trim()) {
    fail(`${expectedPackage} already exists on npm; bump the version before tagging`);
  }
  if (result.status !== 0 && !/E404|404 Not Found/i.test(`${stdout}\n${stderr}`)) {
    fail(`could not verify npm version availability: ${stderr.trim() || stdout.trim()}`);
  }
}

console.log(`release metadata is consistent at ${expectedPackage}`);
