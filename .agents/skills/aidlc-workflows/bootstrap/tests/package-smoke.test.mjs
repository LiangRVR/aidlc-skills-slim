import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../../..');

function run(cmd, args, cwd, { shell = false } = {}) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8', shell });
}

function npm(args, cwd) {
  // Windows exposes npm through a .cmd shim, which requires shell dispatch.
  // This is test-harness-only; production AI-DLC verification commands still use shell:false.
  return run('npm', args, cwd, { shell: process.platform === 'win32' });
}

test('packed npm artifact exposes aidlc and installs the complete Skill', async () => {
  const packed = npm(['pack', '--json'], REPO_ROOT);
  assert.equal(packed.status, 0, packed.error?.message ?? packed.stderr);
  const metadata = JSON.parse(packed.stdout);
  assert.ok(Array.isArray(metadata) && metadata[0]?.filename, packed.stdout);

  const packedFiles = new Set((metadata[0].files ?? []).map((item) => item.path));
  assert.ok(packedFiles.has('bin/aidlc.mjs'), 'package is missing the npm aidlc launcher');
  assert.ok(packedFiles.has('.agents/skills/aidlc-workflows/SKILL.md'), 'package is missing SKILL.md');
  assert.ok(packedFiles.has('.agents/skills/aidlc-workflows/engine/bin/aidlc-engine.mjs'), 'package is missing the engine runtime entrypoint');

  const tarball = join(REPO_ROOT, metadata[0].filename);
  const root = await mkdtemp(join(tmpdir(), 'aidlc-packed-'));

  try {
    const initGit = run('git', ['init'], root);
    assert.equal(initGit.status, 0, initGit.stderr);

    const execution = npm(['exec', '--yes', '--package', tarball, '--', 'aidlc', 'init', '--root', root, '--yes'], REPO_ROOT);
    assert.equal(execution.status, 0, `${execution.error?.message ?? ''}\n${execution.stdout}\n${execution.stderr}`);
    assert.match(execution.stdout, /AI-DLC Slim setup/);
    assert.ok(existsSync(join(root, '.agents', 'skills', 'aidlc-workflows', 'SKILL.md')));
    assert.ok(existsSync(join(root, '.agents', 'skills', 'aidlc-workflows', 'engine', 'bin', 'aidlc-engine.mjs')));
    assert.ok(existsSync(join(root, 'aidlc-docs', 'project', 'brief.md')));
  } finally {
    await rm(tarball, { force: true });
  }
});
