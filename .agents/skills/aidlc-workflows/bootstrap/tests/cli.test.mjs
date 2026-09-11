import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const CLI = new URL('../../bin/aidlc.mjs', import.meta.url);

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
}

test('aidlc help prints user-facing commands', () => {
  const result = spawnSync(process.execPath, [CLI.pathname, 'help'], { encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /aidlc init/);
});

test('aidlc init --yes bootstraps an existing repository non-interactively', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aidlc-cli-'));
  git(root, ['init']);
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'cli-app', scripts: { test: 'node --test' } }, null, 2));
  const result = spawnSync(process.execPath, [CLI.pathname, 'init', '--root', root, '--yes'], { encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /AI-DLC Slim setup/);
  assert.match(result.stdout, /Next step/);
  const checks = JSON.parse(await readFile(join(root, 'aidlc-docs', 'project', 'checks.json'), 'utf8'));
  assert.ok(checks.checks.test);
});
