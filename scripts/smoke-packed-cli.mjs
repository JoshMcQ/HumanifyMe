import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is unavailable; run this check through npm run');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanifyme-package-'));
let tarball;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    input: options.input,
    env: options.env ?? process.env,
  });
  if (result.status !== options.expectedStatus) {
    throw new Error(
      `${command} ${args.join(' ')} exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return result;
}

try {
  const packed = run(process.execPath, [npmCli, 'pack', '--json', '--ignore-scripts'], {
    expectedStatus: 0,
  });
  const packResult = JSON.parse(packed.stdout);
  tarball = path.join(root, packResult[0].filename);

  run(
    process.execPath,
    [npmCli, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', temp, tarball],
    { expectedStatus: 0 },
  );

  const installedRoot = path.join(temp, 'node_modules', 'humanifyme');
  const installedPackage = JSON.parse(fs.readFileSync(path.join(installedRoot, 'package.json'), 'utf8'));
  const cli = path.join(installedRoot, installedPackage.bin.humanifyme);
  const isolatedHome = path.join(temp, 'home');
  const env = { ...process.env, HUMANIFYME_HOME: isolatedHome };

  const version = run(process.execPath, [cli, '--version'], { expectedStatus: 0, env });
  if (version.stdout.trim() !== installedPackage.version) {
    throw new Error(`packed CLI reported ${version.stdout.trim()}; expected ${installedPackage.version}`);
  }

  const analysis = run(process.execPath, [cli, 'analyze'], {
    expectedStatus: 0,
    input: 'This approach is effective — not because it is complex, but because it is simple.',
    env,
  });
  if (!analysis.stdout.includes('72. Weird em dash addiction')) {
    throw new Error(`packed analyzer did not report the em-dash sign:\n${analysis.stdout}`);
  }

  const setup = run(process.execPath, [cli, 'setup'], { expectedStatus: 1, env });
  if (!setup.stderr.includes('setup needs an interactive terminal')) {
    throw new Error(`packed setup did not fail clearly outside a terminal:\n${setup.stderr}`);
  }

  console.log(`packed CLI smoke test passed for humanifyme@${installedPackage.version}`);
} finally {
  if (tarball && fs.existsSync(tarball)) fs.rmSync(tarball, { force: true });
  fs.rmSync(temp, { recursive: true, force: true });
}
