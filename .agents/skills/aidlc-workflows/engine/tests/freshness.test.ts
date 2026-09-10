import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { AidlcEngine } from '../src/engine.js';
import { EngineError } from '../src/errors.js';
import type { InitInput, WorkflowFlags } from '../src/types.js';

function git(project: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd: project, encoding: 'utf8', shell: false });
  if (result.error || result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.error?.message ?? result.stderr}`);
  return (result.stdout ?? '').trim();
}

function root(preexistingDirty = false): string {
  const project = mkdtempSync(join(tmpdir(), 'aidlc-freshness-'));
  git(project, 'init');
  git(project, 'config', 'user.email', 'tests@example.invalid');
  git(project, 'config', 'user.name', 'AI-DLC Tests');
  writeFileSync(join(project, 'app.txt'), 'baseline\n');
  writeFileSync(join(project, 'untouched.txt'), 'clean\n');
  git(project, 'add', '.');
  git(project, 'commit', '-m', 'baseline');
  if (preexistingDirty) writeFileSync(join(project, 'untouched.txt'), 'pre-existing dirty\n');
  return project;
}

function flags(overrides: Partial<WorkflowFlags> = {}): WorkflowFlags {
  return { design_required: false, planning_gate_required: false, review_required: false, final_acceptance_required: false, security_required: false, ...overrides };
}

function input(workflow = flags(), risk: InitInput['risk'] = 'low', change = '260910-freshness'): InitInput {
  return { active_change: change, risk, risk_rationale: `${risk} risk freshness test`, workflow, request: 'Change the application behavior.' };
}

function dir(project: string, change = '260910-freshness'): string {
  const value = join(project, 'aidlc-docs', 'changes', change); mkdirSync(value, { recursive: true }); return value;
}

function writeRequirements(project: string): void {
  writeFileSync(join(dir(project), 'requirements.md'), '# Requirements\n\n## Intent\nChange behavior.\n\n## Acceptance Criteria\n- R1: behavior works\n\n## Must Preserve\nExisting contracts.\n\n## Constraints\nNone.\n\n## Out of Scope\nOther work.\n');
}

function writeDesign(project: string): void {
  writeFileSync(join(dir(project), 'design.md'), '# Design\n\n## Context\nHigh-risk change.\n\n## Proposed Design\nKeep the existing boundary.\n\n## Components / Boundaries\nApplication only.\n\n## Project Baseline Impact\nNo durable architecture change.\n');
}

function writePlan(project: string, checked = false, text = 'Update implementation'): void {
  const mark = checked ? 'x' : ' ';
  writeFileSync(join(dir(project), 'plan.md'), `# Implementation Plan\n\n## Scope\nImplement R1.\n\n## Work\n1. [${mark}] ${text}.\n2. [${mark}] Add tests.\n\n## Dependencies\nSequential.\n\n## Verification Strategy\n- R1: focused check\n\n## Migration / Rollback\nRevert the change.\n`);
}

function writeReview(project: string, verdict: 'PASS' | 'CHANGES_REQUIRED' = 'PASS'): void {
  writeFileSync(join(dir(project), 'review.md'), `# Independent Review\n\nVerdict: ${verdict}\n\n## Scope Reviewed\nCurrent implementation and lifecycle artifacts.\n\n## Findings\n${verdict === 'PASS' ? 'No blocking findings.' : 'Rework required.'}\n`);
}

function writeVerification(project: string): void {
  writeFileSync(join(dir(project), 'verification.md'), '# Verification\n\n## Requirement Coverage\n| Requirement | Evidence | Result |\n|---|---|---|\n| R1 | executable/project check | PASS |\n\n## Automated Checks\n- configured checks as applicable\n\n## Runtime / User-Surface Checks\n- not applicable\n\n## Baseline Consistency\nConfirmed.\n\n## Limitations / Residual Risk\nNone.\n');
}

function writeChecks(project: string, checks: Record<string, unknown>): void {
  const projectDocs = join(project, 'aidlc-docs', 'project'); mkdirSync(projectDocs, { recursive: true });
  writeFileSync(join(projectDocs, 'checks.json'), JSON.stringify({ schema_version: 1, checks }, null, 2) + '\n');
}

function lowToImplementation(project: string, engine: AidlcEngine): void {
  engine.init(input());
  writeRequirements(project); engine.report('requirements_complete');
  writePlan(project); engine.report('plan_complete');
}

function completeImplementation(project: string, engine: AidlcEngine, sourceText = 'implemented\n'): void {
  writeFileSync(join(project, 'app.txt'), sourceText);
  writePlan(project, true);
  engine.report('implementation_complete');
}

function standardToImplementation(project: string, engine: AidlcEngine): void {
  const workflow = flags({ planning_gate_required: true, final_acceptance_required: true });
  engine.init(input(workflow, 'standard'));
  writeRequirements(project); engine.report('requirements_complete');
  writePlan(project); engine.report('plan_complete');
  engine.continue();
}

function highToReview(project: string, engine: AidlcEngine): void {
  const workflow = flags({ design_required: true, planning_gate_required: true, review_required: true, final_acceptance_required: true, security_required: true });
  engine.init(input(workflow, 'high'));
  writeRequirements(project); engine.report('requirements_complete');
  writeDesign(project); engine.report('design_complete');
  writePlan(project); engine.report('plan_complete'); engine.continue();
  completeImplementation(project, engine);
}

function expectCode(fn: () => unknown, code: string): void {
  assert.throws(fn, (error: unknown) => error instanceof EngineError && error.code === code);
}

test('checking Plan boxes does not stale the approved semantic Plan', () => {
  const project = root(); const engine = new AidlcEngine(project);
  standardToImplementation(project, engine);
  writePlan(project, true);
  assert.equal(engine.freshness().length, 0);
  writeFileSync(join(project, 'app.txt'), 'implemented\n');
  assert.equal(engine.report('implementation_complete').stage, 'verification');
});

test('editing Plan task text after approval stales approval and refresh reopens Plan', () => {
  const project = root(); const engine = new AidlcEngine(project);
  standardToImplementation(project, engine);
  writePlan(project, false, 'Change implementation scope');
  const issues = engine.freshness();
  assert.equal(issues[0]?.dependency, 'plan');
  assert.equal(engine.next().action, 'reconcile_freshness');
  const refreshed = engine.refresh();
  assert.equal(refreshed.stage, 'plan');
  assert.equal(refreshed.progress.plan, 'active');
  assert.equal(refreshed.freshness.plan, null);
  assert.equal(refreshed.freshness.planning_approval, null);
});

test('source change after Implementation makes receipt stale and refresh reopens Implementation', () => {
  const project = root(); const engine = new AidlcEngine(project);
  lowToImplementation(project, engine); completeImplementation(project, engine);
  writeFileSync(join(project, 'app.txt'), 'changed-after-implementation\n');
  const issues = engine.freshness();
  assert.equal(issues[0]?.dependency, 'implementation');
  const refreshed = engine.refresh();
  assert.equal(refreshed.stage, 'implementation');
  assert.equal(refreshed.freshness.implementation, null);
  assert.equal(refreshed.freshness.verification, null);
});

test('source change after Review PASS invalidates review through Implementation freshness', () => {
  const project = root(); const engine = new AidlcEngine(project);
  highToReview(project, engine);
  writeReview(project); assert.equal(engine.report('review_pass').stage, 'verification');
  writeFileSync(join(project, 'app.txt'), 'changed-after-review\n');
  const deps = engine.freshness().map((issue) => issue.dependency);
  assert.ok(deps.includes('implementation'));
  assert.ok(deps.includes('review'));
  const refreshed = engine.refresh();
  assert.equal(refreshed.stage, 'implementation');
  assert.equal(refreshed.freshness.review, null);
});

test('required executable check must have a current PASS receipt', () => {
  const project = root(); const engine = new AidlcEngine(project);
  lowToImplementation(project, engine); completeImplementation(project, engine);
  writeChecks(project, { unit: { command: [process.execPath, '-e', 'process.exit(0)'], required: true, timeout_ms: 10000 } });
  writeVerification(project);
  expectCode(() => engine.report('verification_complete'), 'VERIFICATION_EVIDENCE_MISSING');
  const receipt = engine.check('unit');
  assert.equal(receipt.result, 'PASS');
  assert.equal(engine.report('verification_complete').stage, 'complete');
});

test('a verification check that changes source is STALE and cannot satisfy required evidence', () => {
  const project = root(); const engine = new AidlcEngine(project);
  lowToImplementation(project, engine); completeImplementation(project, engine);
  const script = "require('fs').appendFileSync('app.txt','mutated\\n')";
  writeChecks(project, { mutation: { command: [process.execPath, '-e', script], required: true, timeout_ms: 10000 } });
  const receipt = engine.check('mutation');
  assert.equal(receipt.result, 'STALE');
  assert.equal(engine.next().action, 'reconcile_freshness');
  writeVerification(project);
  expectCode(() => engine.report('verification_complete'), 'FRESHNESS_STALE');
});

test('changing checks configuration after Verification makes Verification stale', () => {
  const project = root(); const engine = new AidlcEngine(project);
  standardToImplementation(project, engine); completeImplementation(project, engine);
  writeChecks(project, { unit: { command: [process.execPath, '-e', 'process.exit(0)'], required: true } });
  engine.check('unit'); writeVerification(project); engine.report('verification_complete');
  writeChecks(project, { unit: { command: [process.execPath, '-e', 'process.exit(0)'], required: true, timeout_ms: 15000 } });
  assert.ok(engine.freshness().some((issue) => issue.dependency === 'verification'));
  assert.equal(engine.refresh().stage, 'verification');
});

test('changing verification.md after completion makes Verification stale', () => {
  const project = root(); const engine = new AidlcEngine(project);
  standardToImplementation(project, engine); completeImplementation(project, engine);
  writeVerification(project); engine.report('verification_complete');
  writeFileSync(join(dir(project), 'verification.md'), readFileSync(join(dir(project), 'verification.md'), 'utf8') + '\nChanged after verification.\n');
  assert.ok(engine.freshness().some((issue) => issue.dependency === 'verification'));
  assert.equal(engine.next().action, 'reconcile_freshness');
});

test('final acceptance is source-bound and becomes stale after accepted source changes', () => {
  const project = root(); const engine = new AidlcEngine(project);
  standardToImplementation(project, engine); completeImplementation(project, engine);
  writeVerification(project); engine.report('verification_complete'); engine.report('accept');
  assert.equal(engine.status().stage, 'complete');
  writeFileSync(join(project, 'app.txt'), 'changed-after-acceptance\n');
  const deps = engine.freshness().map((issue) => issue.dependency);
  assert.ok(deps.includes('implementation'));
  assert.ok(deps.includes('verification'));
  assert.ok(deps.includes('final_acceptance'));
  assert.equal(engine.next().action, 'reconcile_freshness');
});

test('committed implementation changes remain represented in the source manifest', () => {
  const project = root(); const engine = new AidlcEngine(project);
  lowToImplementation(project, engine);
  writeFileSync(join(project, 'app.txt'), 'committed-implementation\n'); writePlan(project, true);
  git(project, 'add', 'app.txt'); git(project, 'commit', '-m', 'implementation');
  engine.report('implementation_complete');
  const evidence = JSON.parse(readFileSync(join(dir(project), 'evidence.json'), 'utf8'));
  assert.ok(evidence.source.manifest.some((entry: { path: string }) => entry.path === 'app.txt'));
});

test('unchanged pre-existing dirty files are excluded from the change source manifest', () => {
  const project = root(true); const engine = new AidlcEngine(project);
  lowToImplementation(project, engine);
  writeFileSync(join(project, 'app.txt'), 'implementation-only\n'); writePlan(project, true);
  engine.report('implementation_complete');
  const evidence = JSON.parse(readFileSync(join(dir(project), 'evidence.json'), 'utf8'));
  const paths = evidence.source.manifest.map((entry: { path: string }) => entry.path);
  assert.ok(paths.includes('app.txt'));
  assert.ok(!paths.includes('untouched.txt'));
});

test('tampering with selected structured check evidence makes Verification stale', () => {
  const project = root(); const engine = new AidlcEngine(project);
  standardToImplementation(project, engine); completeImplementation(project, engine);
  writeChecks(project, { unit: { command: [process.execPath, '-e', 'process.exit(0)'], required: true } });
  engine.check('unit'); writeVerification(project); engine.report('verification_complete');
  const evidencePath = join(dir(project), 'evidence.json');
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  evidence.checks[0].stdout_bytes += 1;
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  assert.ok(engine.freshness().some((issue) => issue.dependency === 'verification'));
});
