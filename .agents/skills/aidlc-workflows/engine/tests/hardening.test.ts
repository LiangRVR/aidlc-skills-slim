import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { AidlcEngine } from '../src/engine.js';
import { EngineError } from '../src/errors.js';
import { acquireWorkflowLock, releaseWorkflowLock } from '../src/lock.js';
import { commitTransaction } from '../src/transaction.js';
import { ENGINE_VERSION } from '../src/types.js';
import type { InitInput, WorkflowFlags } from '../src/types.js';

function root(): string { return mkdtempSync(join(tmpdir(), 'aidlc-hardening-')); }
function flags(overrides: Partial<WorkflowFlags> = {}): WorkflowFlags {
  return { design_required: false, planning_gate_required: false, review_required: false, final_acceptance_required: false, security_required: false, ...overrides };
}
function input(change = '260910-hardening'): InitInput {
  return { active_change: change, risk: 'low', risk_rationale: 'isolated test change', workflow: flags(), request: 'Implement the behavior.' };
}
function changeDir(project: string, change = '260910-hardening'): string {
  const dir = join(project, 'aidlc-docs', 'changes', change); mkdirSync(dir, { recursive: true }); return dir;
}
function requirementsText(): string {
  return '# Requirements\n\n## Intent\nChange behavior.\n\n## Acceptance Criteria\n- R1: works\n\n## Must Preserve\nContracts.\n\n## Constraints\nNone.\n\n## Out of Scope\nOther work.\n';
}
function writeRequirements(project: string): void { writeFileSync(join(changeDir(project), 'requirements.md'), requirementsText(), 'utf8'); }
function expectCode(fn: () => unknown, code: string): void { assert.throws(fn, (error: unknown) => error instanceof EngineError && error.code === code); }

test('revision increments on every accepted mutation', () => {
  const project = root(); const engine = new AidlcEngine(project);
  assert.equal(engine.init(input()).revision, 1);
  writeRequirements(project);
  assert.equal(engine.report('requirements_complete').revision, 2);
  assert.equal(engine.block('waiting').revision, 3);
  assert.equal(engine.unblock(undefined, true).revision, 4);
});

test('cancel creates a terminal state and permits a different future change', () => {
  const project = root(); const engine = new AidlcEngine(project);
  engine.init(input());
  const cancelled = engine.cancel('No longer needed');
  assert.equal(cancelled.stage, 'cancelled'); assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.revision, 2);
  const next = engine.init(input('260910-second'));
  assert.equal(next.active_change, '260910-second'); assert.equal(next.revision, 3);
});

test('a held workflow lock rejects concurrent mutation', () => {
  const project = root(); const engine = new AidlcEngine(project); engine.init(input()); writeRequirements(project);
  const lock = acquireWorkflowLock(project, 'test-holder');
  try { expectCode(() => engine.report('requirements_complete'), 'WORKFLOW_LOCKED'); }
  finally { releaseWorkflowLock(project, lock); }
});

test('doctor --repair removes a provably stale lock', () => {
  const project = root(); mkdirSync(join(project, 'aidlc-docs'), { recursive: true });
  writeFileSync(join(project, 'aidlc-docs', '.aidlc.lock'), JSON.stringify({ lock_version: 1, engine_version: ENGINE_VERSION, pid: 2147483000, hostname: hostname(), started_at: new Date(0).toISOString(), operation: 'dead', nonce: 'dead-lock' }) + '\n');
  const engine = new AidlcEngine(project);
  const before = engine.doctor();
  assert.equal(before.checks.find((c) => c.name === 'lock')?.status, 'warn');
  const after = engine.doctor(true);
  assert.equal(after.checks.find((c) => c.name === 'lock')?.status, 'pass');
  assert.ok(after.repaired.some((x) => x.includes('stale workflow lock')));
});

test('pending transaction blocks normal reads and doctor can roll it forward', () => {
  const project = root(); const engine = new AidlcEngine(project); const state = engine.init(input());
  const statePath = join(project, 'aidlc-docs', 'aidlc-state.json');
  const before = readFileSync(statePath, 'utf8');
  const afterState = { ...state, revision: state.revision + 1, risk_rationale: 'recovered transaction' };
  const after = JSON.stringify(afterState, null, 2) + '\n';
  const tx = { transaction_version: 1, engine_version: ENGINE_VERSION, id: 'crash-test', operation: 'crash-test', started_at: new Date().toISOString(), files: [{ path: 'aidlc-docs/aidlc-state.json', before, after }] };
  writeFileSync(join(project, 'aidlc-docs', '.aidlc-txn.json'), JSON.stringify(tx, null, 2) + '\n');
  expectCode(() => engine.status(), 'RECOVERY_REQUIRED');
  const report = engine.doctor(true);
  assert.ok(report.repaired.some((x) => x.includes('recovered pending crash-test transaction')));
  assert.equal(engine.status().risk_rationale, 'recovered transaction');
  assert.equal(engine.status().revision, 2);
});

test('migrate upgrades schema v1 state to schema v2', () => {
  const project = root(); mkdirSync(join(project, 'aidlc-docs', 'changes', 'legacy'), { recursive: true });
  writeFileSync(join(project, 'aidlc-docs', 'changes', 'legacy', 'request.md'), '# Request\n\nLegacy.\n');
  const legacy = {
    schema_version: 1, active_change: 'legacy', risk: 'low', risk_rationale: 'legacy', workflow: flags(), stage: 'requirements', status: 'active', gate: null,
    artifacts: { request: 'aidlc-docs/changes/legacy/request.md', requirements: 'aidlc-docs/changes/legacy/requirements.md', design: null, plan: 'aidlc-docs/changes/legacy/plan.md', review: null, verification: 'aidlc-docs/changes/legacy/verification.md' },
    progress: { requirements: 'active', design: 'not_applicable', plan: 'pending', implementation: 'pending', review: 'not_applicable', verification: 'pending', final_acceptance: 'not_applicable' }, blockers: []
  };
  writeFileSync(join(project, 'aidlc-docs', 'aidlc-state.json'), JSON.stringify(legacy, null, 2) + '\n');
  const engine = new AidlcEngine(project);
  expectCode(() => engine.status(), 'STATE_MIGRATION_REQUIRED');
  const migrated = engine.migrate();
  assert.equal(migrated.schema_version, 2); assert.equal(migrated.revision, 1); assert.equal(migrated.engine_version, ENGINE_VERSION);
});

test('artifact symlink escaping project root is rejected', () => {
  if (process.platform === 'win32') return;
  const project = root(); const engine = new AidlcEngine(project); engine.init(input());
  const outside = join(root(), 'outside.md'); writeFileSync(outside, requirementsText());
  symlinkSync(outside, join(changeDir(project), 'requirements.md'));
  expectCode(() => engine.report('requirements_complete'), 'PREDICATE_FAILED');
});

test('symlinked aidlc-docs parent cannot redirect control-file writes outside project', () => {
  if (process.platform === 'win32') return;
  const project = root();
  const outside = root();
  symlinkSync(outside, join(project, 'aidlc-docs'), 'dir');
  const engine = new AidlcEngine(project);
  expectCode(() => engine.init(input()), 'INVALID_PATH');
  assert.equal(existsSync(join(outside, '.aidlc.lock')), false);
  assert.equal(existsSync(join(outside, 'aidlc-state.json')), false);
});

test('oversized workflow artifact is rejected before synchronous read', () => {
  const project = root(); const engine = new AidlcEngine(project); engine.init(input());
  writeFileSync(join(changeDir(project), 'requirements.md'), requirementsText() + 'x'.repeat(2 * 1024 * 1024 + 1024));
  expectCode(() => engine.report('requirements_complete'), 'PREDICATE_FAILED');
});

test('oversized transaction journal is rejected before it is written', () => {
  const project = root();
  expectCode(() => commitTransaction(project, 'too-large', [{ path: 'aidlc-docs/large.txt', after: 'x'.repeat(17 * 1024 * 1024) }]), 'TRANSACTION_TOO_LARGE');
  assert.equal(existsSync(join(project, 'aidlc-docs', '.aidlc-txn.json')), false);
});

test('doctor reports healthy initialized workflow', () => {
  const project = root(); const engine = new AidlcEngine(project); engine.init(input());
  const report = engine.doctor();
  assert.equal(report.ok, true);
  assert.equal(report.state?.revision, 1);
});
