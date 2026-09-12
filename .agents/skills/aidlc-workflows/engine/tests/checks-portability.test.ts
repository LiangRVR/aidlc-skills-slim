import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { executeCheck } from '../src/checks.js';
import type { ChecksConfig } from '../src/types.js';

function git(cwd: string, ...args: string[]): void {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
}

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'aidlc-check-portable-'));
  git(root, 'init');
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    name: 'aidlc-portability-fixture',
    private: true,
    scripts: { test: 'node -e "process.exit(0)"' },
  }, null, 2) + '\n');
  return root;
}

test('generated npm run verification check executes cross-platform and preserves receipt command', () => {
  const root = project();
  const config: ChecksConfig = {
    schema_version: 1,
    checks: {
      test: {
        command: ['npm', 'run', 'test'],
        required: true,
        timeout_ms: 30_000,
      },
    },
  };

  const receipt = executeCheck(root, 'test', config);
  assert.equal(receipt.result, 'PASS');
  assert.equal(receipt.exit_code, 0);
  assert.deepEqual(receipt.command, ['npm', 'run', 'test']);
  assert.equal(receipt.source_digest_before, receipt.source_digest_after);
});

test('Windows package-manager adapter rejects command-shell metacharacters', { skip: process.platform !== 'win32' }, () => {
  const root = project();
  const config: ChecksConfig = {
    schema_version: 1,
    checks: {
      unsafe: {
        command: ['npm', 'run', 'test', '&', 'whoami'],
        required: true,
        timeout_ms: 30_000,
      },
    },
  };

  assert.throws(() => executeCheck(root, 'unsafe', config), /shell metacharacters/);
});
