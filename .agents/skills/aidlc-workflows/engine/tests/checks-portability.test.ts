import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { executeCheck } from '../src/checks.js';
import type { ChecksConfig } from '../src/types.js';

function git(cwd: string, ...args: string[]): void {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
}

test('npm verification check executes cross-platform and preserves receipt command', () => {
  const root = mkdtempSync(join(tmpdir(), 'aidlc-check-portable-'));
  git(root, 'init');
  const config: ChecksConfig = {
    schema_version: 1,
    checks: {
      'npm-version': {
        command: ['npm', '--version'],
        required: true,
        timeout_ms: 30_000,
      },
    },
  };

  const receipt = executeCheck(root, 'npm-version', config);
  assert.equal(receipt.result, 'PASS');
  assert.equal(receipt.exit_code, 0);
  assert.deepEqual(receipt.command, ['npm', '--version']);
  assert.equal(receipt.source_digest_before, receipt.source_digest_after);
});
