import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const CLI = fileURLToPath(new URL('../../bin/aidlc.mjs', import.meta.url));

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
}

test('aidlc help prints user-facing commands', () => {
  const result = spawnSync(process.execPath, [CLI, 'help'], { encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /aidlc init/);
});

test('aidlc init --yes bootstraps an existing repository non-interactively', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aidlc-cli-'));
  git(root, ['init']);
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'cli-app', scripts: { test: 'node --test' } }, null, 2));
  const result = spawnSync(process.execPath, [CLI, 'init', '--root', root, '--yes'], { encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /AI-DLC Slim setup/);
  assert.match(result.stdout, /Next step/);
  const checks = JSON.parse(await readFile(join(root, 'aidlc-docs', 'project', 'checks.json'), 'utf8'));
  assert.ok(checks.checks.test);
});

test('aidlc init refuses a managed path symlink that escapes the project', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'aidlc-cli-safe-'));
  const outside = await mkdtemp(join(tmpdir(), 'aidlc-cli-outside-'));
  git(root, ['init']);
  try {
    await symlink(outside, join(root, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (error?.code === 'EPERM' || error?.code === 'EACCES') {
      t.skip('symlink creation is not permitted on this runner');
      return;
    }
    throw error;
  }

  const result = spawnSync(process.execPath, [CLI, 'init', '--root', root, '--yes'], { encoding: 'utf8', shell: false });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /resolves outside the project/);
});

test('aidlc init refuses a project inspection symlink that escapes the project', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'aidlc-cli-inspect-safe-'));
  const outside = await mkdtemp(join(tmpdir(), 'aidlc-cli-inspect-outside-'));
  git(root, ['init']);
  const externalPackage = join(outside, 'package.json');
  await writeFile(externalPackage, JSON.stringify({ name: 'outside-project' }));
  try {
    await symlink(externalPackage, join(root, 'package.json'), 'file');
  } catch (error) {
    if (error?.code === 'EPERM' || error?.code === 'EACCES') {
      t.skip('file symlink creation is not permitted on this runner');
      return;
    }
    throw error;
  }

  const result = spawnSync(process.execPath, [CLI, 'init', '--root', root, '--yes'], { encoding: 'utf8', shell: false });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /inspect a path that resolves outside the project/);
});
