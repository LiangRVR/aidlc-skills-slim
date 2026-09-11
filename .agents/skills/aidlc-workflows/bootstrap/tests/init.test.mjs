import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { initProject } from '../init.mjs';

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
}

async function repo() {
  const root = await mkdtemp(join(tmpdir(), 'aidlc-bootstrap-'));
  git(root, ['init']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'AI-DLC Test']);
  return root;
}

test('greenfield bootstrap creates baseline without inventing a stack', async () => {
  const root = await repo();
  const result = await initProject({ root, yes: true });
  assert.equal(result.project.kind, 'greenfield');
  assert.ok(existsSync(join(root, 'AGENTS.md')));
  assert.ok(existsSync(join(root, 'aidlc-docs', 'project', 'brief.md')));
  assert.ok(existsSync(join(root, 'aidlc-docs', 'project', 'checks.json')));
  const stack = await readFile(join(root, 'aidlc-docs', 'project', 'tech-stack.md'), 'utf8');
  assert.match(stack, /Undecided/);
  assert.equal(result.doctor.ok, true);
});

test('README-only repository is still treated as greenfield', async () => {
  const root = await repo();
  await writeFile(join(root, 'README.md'), '# New Product\n\nA product that still needs its implementation stack.\n');
  const result = await initProject({ root, yes: true });
  assert.equal(result.project.kind, 'greenfield');
  assert.equal(result.project.name, 'New Product');
  assert.match(await readFile(join(root, 'aidlc-docs', 'project', 'brief.md'), 'utf8'), /A product that still needs its implementation stack/);
});

test('brownfield bootstrap detects Node TypeScript and safe package scripts', async () => {
  const root = await repo();
  await writeFile(join(root, 'package.json'), JSON.stringify({
    name: 'sample-app',
    scripts: { test: 'vitest run', typecheck: 'tsc --noEmit', build: 'vite build', lint: 'eslint .' },
    dependencies: { react: '^19.0.0', vite: '^7.0.0' },
    devDependencies: { typescript: '^5.0.0' },
  }, null, 2));
  await writeFile(join(root, 'tsconfig.json'), '{}');
  const result = await initProject({ root, yes: true });
  assert.equal(result.project.kind, 'brownfield');
  assert.ok(result.project.stacks.includes('Node.js'));
  assert.ok(result.project.stacks.includes('TypeScript'));
  assert.ok(result.project.stacks.includes('React'));
  const checks = JSON.parse(await readFile(join(root, 'aidlc-docs', 'project', 'checks.json'), 'utf8'));
  assert.deepEqual(Object.keys(checks.checks).sort(), ['build', 'test', 'typecheck']);
  assert.deepEqual(checks.checks.test.command, ['npm', 'run', 'test']);
});

test('placeholder npm test script is not proposed as verification', async () => {
  const root = await repo();
  await writeFile(join(root, 'package.json'), JSON.stringify({
    name: 'placeholder-test',
    scripts: { test: 'echo "Error: no test specified" && exit 1', lint: 'eslint .' },
  }, null, 2));
  const result = await initProject({ root, yes: true });
  assert.equal(result.project.checkCandidates.some((item) => item.name === 'test'), false);
  const checks = JSON.parse(await readFile(join(root, 'aidlc-docs', 'project', 'checks.json'), 'utf8'));
  assert.deepEqual(checks.checks, {});
});

test('bootstrap is idempotent and preserves existing project context', async () => {
  const root = await repo();
  await mkdir(join(root, 'aidlc-docs', 'project'), { recursive: true });
  const brief = '# Existing Brief\n\nDo not replace me.\n';
  const agents = '# Existing AGENTS\n\nKeep project-specific rules.\n';
  await writeFile(join(root, 'aidlc-docs', 'project', 'brief.md'), brief);
  await writeFile(join(root, 'AGENTS.md'), agents);
  await writeFile(join(root, 'README.md'), '# Existing Project\n');

  await initProject({ root, yes: true });
  await initProject({ root, yes: true });

  assert.equal(await readFile(join(root, 'aidlc-docs', 'project', 'brief.md'), 'utf8'), brief);
  assert.equal(await readFile(join(root, 'AGENTS.md'), 'utf8'), agents);
});

test('partial Skill installation is repaired without overwriting existing files', async () => {
  const root = await repo();
  const skill = join(root, '.agents', 'skills', 'aidlc-workflows');
  await mkdir(skill, { recursive: true });
  const sentinel = '# Custom local SKILL marker\n';
  await writeFile(join(skill, 'SKILL.md'), sentinel);
  await initProject({ root, yes: true });
  assert.equal(await readFile(join(skill, 'SKILL.md'), 'utf8'), sentinel);
  assert.ok(existsSync(join(skill, 'engine', 'bin', 'aidlc-engine.mjs')));
  assert.ok(existsSync(join(skill, 'bin', 'aidlc.mjs')));
});

test('bootstrap resolves a nested working directory to the Git project root', async () => {
  const root = await repo();
  const nested = join(root, 'src', 'feature');
  await mkdir(nested, { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'nested-app' }));
  const result = await initProject({ root: nested, yes: true });
  assert.equal(await realpath(result.root), await realpath(root));
  assert.ok(existsSync(join(root, 'aidlc-docs', 'project', 'brief.md')));
  assert.equal(existsSync(join(nested, 'aidlc-docs')), false);
});

test('non-interactive bootstrap initializes Git when the target directory is not a repository', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aidlc-no-git-'));
  const result = await initProject({ root, yes: true });
  assert.equal(await realpath(result.root), await realpath(root));
  assert.ok(existsSync(join(root, '.git')));
  assert.equal(result.doctor.ok, true);
});

test('invalid existing checks.json is preserved and reported instead of overwritten', async () => {
  const root = await repo();
  await mkdir(join(root, 'aidlc-docs', 'project'), { recursive: true });
  const invalid = '{"schema_version":1,"checks":{"bad":{"command":[],"required":true}}}\n';
  await writeFile(join(root, 'aidlc-docs', 'project', 'checks.json'), invalid);
  await assert.rejects(() => initProject({ root, yes: true }), /non-empty command/);
  assert.equal(await readFile(join(root, 'aidlc-docs', 'project', 'checks.json'), 'utf8'), invalid);
});
