import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AidlcEngine } from '../src/engine.js';
import { EngineError } from '../src/errors.js';
import type { InitInput, WorkflowFlags } from '../src/types.js';

function root(): string {
  return mkdtempSync(join(tmpdir(), 'aidlc-engine-'));
}

function flags(overrides: Partial<WorkflowFlags> = {}): WorkflowFlags {
  return {
    design_required: false,
    planning_gate_required: false,
    review_required: false,
    final_acceptance_required: false,
    security_required: false,
    ...overrides,
  };
}

function initInput(risk: InitInput['risk'] = 'low', workflow = flags(), change = '260910-demo'): InitInput {
  return {
    active_change: change,
    risk,
    risk_rationale: `${risk} risk test`,
    workflow,
    request: 'Implement the requested behavior.',
  };
}

function changeDir(project: string, change = '260910-demo'): string {
  const dir = join(project, 'aidlc-docs', 'changes', change);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeRequirements(project: string, change = '260910-demo'): void {
  writeFileSync(join(changeDir(project, change), 'requirements.md'), `# Requirements\n\n## Intent\nChange behavior.\n\n## Acceptance Criteria\n- R1: behavior works\n- R2: previous behavior remains safe\n\n## Must Preserve\nExisting contracts.\n\n## Constraints\nNone beyond current project constraints.\n\n## Out of Scope\nUnrelated refactors.\n`, 'utf8');
}

function writeDesign(project: string, change = '260910-demo'): void {
  writeFileSync(join(changeDir(project, change), 'design.md'), `# Design\n\n## Context\nStructural change.\n\n## Proposed Design\nUse the existing architecture with a new boundary.\n\n## Components / Boundaries\nAffected service only.\n\n## Project Baseline Impact\nArchitecture documentation must be reviewed.\n`, 'utf8');
}

function writePlan(project: string, checked = false, change = '260910-demo'): void {
  const mark = checked ? 'x' : ' ';
  writeFileSync(join(changeDir(project, change), 'plan.md'), `# Implementation Plan\n\n## Scope\nImplement R1 and R2.\n\n## Work\n1. [${mark}] Update implementation.\n2. [${mark}] Add tests.\n\n## Dependencies\nSequential.\n\n## Verification Strategy\n- R1: focused test\n- R2: regression test\n\n## Migration / Rollback\nRevert the change.\n`, 'utf8');
}

function writeReview(project: string, verdict: 'PASS' | 'FAIL' | 'CHANGES_REQUIRED', change = '260910-demo'): void {
  writeFileSync(join(changeDir(project, change), 'review.md'), `# Independent Review\n\nVerdict: ${verdict}\n\n## Scope Reviewed\nImplementation, requirements, design, and plan.\n\n## Findings\n${verdict === 'PASS' ? 'No blocking findings.' : 'Blocking issue remains.'}\n`, 'utf8');
}

function writeVerification(project: string, r1 = 'PASS', r2 = 'PASS', limitations = 'None.', change = '260910-demo'): void {
  writeFileSync(join(changeDir(project, change), 'verification.md'), `# Verification\n\n## Requirement Coverage\n| Requirement | Evidence | Result |\n|---|---|---|\n| R1 | focused test | ${r1} |\n| R2 | regression test | ${r2} |\n\n## Automated Checks\n- tests -> PASS\n\n## Runtime / User-Surface Checks\n- not applicable\n\n## Baseline Consistency\nConfirmed unchanged.\n\n## Limitations / Residual Risk\n${limitations}\n`, 'utf8');
}

function expectEngineError(fn: () => unknown, code: string): void {
  assert.throws(fn, (error: unknown) => error instanceof EngineError && error.code === code);
}

test('initializes low risk with explicit valid flags', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  const state = engine.init(initInput());
  assert.equal(state.stage, 'requirements');
  assert.equal(state.progress.design, 'not_applicable');
  assert.equal(state.progress.review, 'not_applicable');
});

test('rejects high risk without mandatory workflow flags', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  expectEngineError(() => engine.init(initInput('high', flags())), 'INVALID_WORKFLOW');
});

test('rejects a second active change', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  expectEngineError(() => engine.init(initInput('low', flags(), '260910-second')), 'ACTIVE_CHANGE_EXISTS');
});

test('requirements route directly to plan when design is not required', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  writeRequirements(project);
  const state = engine.report('requirements_complete');
  assert.equal(state.stage, 'plan');
  assert.equal(state.progress.requirements, 'complete');
});

test('requirements route to design when required', () => {
  const project = root();
  const workflow = flags({ design_required: true });
  const engine = new AidlcEngine(project);
  engine.init(initInput('low', workflow));
  writeRequirements(project);
  const state = engine.report('requirements_complete');
  assert.equal(state.stage, 'design');
  writeDesign(project);
  assert.equal(engine.report('design_complete').stage, 'plan');
});

test('design completion is illegal when design is not required', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  expectEngineError(() => engine.report('design_complete'), 'ILLEGAL_TRANSITION');
});

test('missing requirements artifact rejects without state mutation', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  const before = readFileSync(join(project, 'aidlc-docs', 'aidlc-state.json'), 'utf8');
  expectEngineError(() => engine.report('requirements_complete'), 'PREDICATE_FAILED');
  const after = readFileSync(join(project, 'aidlc-docs', 'aidlc-state.json'), 'utf8');
  assert.equal(after, before);
});

test('standard workflow opens planning gate; approve holds; continue advances', () => {
  const project = root();
  const workflow = flags({ planning_gate_required: true, final_acceptance_required: true });
  const engine = new AidlcEngine(project);
  engine.init(initInput('standard', workflow));
  writeRequirements(project);
  engine.report('requirements_complete');
  writePlan(project);
  let state = engine.report('plan_complete');
  assert.equal(state.status, 'awaiting_approval');
  state = engine.approve();
  assert.equal(state.stage, 'plan');
  assert.equal(state.status, 'approved_hold');
  state = engine.continue();
  assert.equal(state.stage, 'implementation');
  assert.equal(state.status, 'active');
});

test('continue from open planning gate approves and advances', () => {
  const project = root();
  const workflow = flags({ planning_gate_required: true, final_acceptance_required: true });
  const engine = new AidlcEngine(project);
  engine.init(initInput('standard', workflow));
  writeRequirements(project); engine.report('requirements_complete');
  writePlan(project); engine.report('plan_complete');
  assert.equal(engine.continue().stage, 'implementation');
});

test('request changes at planning gate reopens plan', () => {
  const project = root();
  const workflow = flags({ planning_gate_required: true, final_acceptance_required: true });
  const engine = new AidlcEngine(project);
  engine.init(initInput('standard', workflow));
  writeRequirements(project); engine.report('requirements_complete');
  writePlan(project); engine.report('plan_complete');
  const state = engine.requestChanges();
  assert.equal(state.stage, 'plan');
  assert.equal(state.status, 'active');
  assert.equal(state.progress.plan, 'active');
});

test('approve is rejected outside planning gate', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  expectEngineError(() => engine.approve(), 'ILLEGAL_TRANSITION');
});

test('low risk no-gate flow reaches verification', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  writeRequirements(project); engine.report('requirements_complete');
  writePlan(project); engine.report('plan_complete');
  writePlan(project, true);
  const state = engine.report('implementation_complete');
  assert.equal(state.stage, 'verification');
});

test('implementation completion rejects unchecked plan work', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  writeRequirements(project); engine.report('requirements_complete');
  writePlan(project); engine.report('plan_complete');
  expectEngineError(() => engine.report('implementation_complete'), 'PREDICATE_FAILED');
});

test('high risk routes through design, gate, review, verification, acceptance', () => {
  const project = root();
  const workflow = flags({ design_required: true, planning_gate_required: true, review_required: true, final_acceptance_required: true, security_required: true });
  const engine = new AidlcEngine(project);
  engine.init(initInput('high', workflow));
  writeRequirements(project); engine.report('requirements_complete');
  writeDesign(project); engine.report('design_complete');
  writePlan(project); engine.report('plan_complete');
  engine.continue();
  writePlan(project, true);
  assert.equal(engine.report('implementation_complete').stage, 'review');
  writeReview(project, 'PASS');
  assert.equal(engine.report('review_pass').stage, 'verification');
  writeVerification(project);
  assert.equal(engine.report('verification_complete').stage, 'final_acceptance');
  assert.equal(engine.report('accept').stage, 'complete');
});

test('review failure returns to implementation and invalidates downstream progress', () => {
  const project = root();
  const workflow = flags({ design_required: true, planning_gate_required: true, review_required: true, final_acceptance_required: true });
  const engine = new AidlcEngine(project);
  engine.init(initInput('high', workflow));
  writeRequirements(project); engine.report('requirements_complete');
  writeDesign(project); engine.report('design_complete');
  writePlan(project); engine.report('plan_complete'); engine.continue();
  writePlan(project, true); engine.report('implementation_complete');
  writeReview(project, 'CHANGES_REQUIRED');
  const state = engine.report('review_fail');
  assert.equal(state.stage, 'implementation');
  assert.equal(state.progress.review, 'pending');
  assert.equal(state.progress.verification, 'pending');
});

test('review event is illegal when review is not required', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  expectEngineError(() => engine.report('review_pass'), 'ILLEGAL_TRANSITION');
});

test('verification with FAIL blocks completion without mutation', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  writeRequirements(project); engine.report('requirements_complete');
  writePlan(project); engine.report('plan_complete'); writePlan(project, true); engine.report('implementation_complete');
  writeVerification(project, 'FAIL', 'PASS');
  const before = readFileSync(join(project, 'aidlc-docs', 'aidlc-state.json'), 'utf8');
  expectEngineError(() => engine.report('verification_complete'), 'PREDICATE_FAILED');
  assert.equal(readFileSync(join(project, 'aidlc-docs', 'aidlc-state.json'), 'utf8'), before);
});

test('verification may surface NOT VERIFIED when residual risk is explicit', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  writeRequirements(project); engine.report('requirements_complete');
  writePlan(project); engine.report('plan_complete'); writePlan(project, true); engine.report('implementation_complete');
  writeVerification(project, 'PASS', 'NOT VERIFIED', 'R2 could not be exercised because the external service was unavailable.');
  assert.equal(engine.report('verification_complete').stage, 'complete');
});

test('NOT VERIFIED without residual risk is rejected', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  writeRequirements(project); engine.report('requirements_complete');
  writePlan(project); engine.report('plan_complete'); writePlan(project, true); engine.report('implementation_complete');
  writeVerification(project, 'PASS', 'NOT VERIFIED', 'None.');
  expectEngineError(() => engine.report('verification_complete'), 'PREDICATE_FAILED');
});

test('final acceptance request changes returns to implementation', () => {
  const project = root();
  const workflow = flags({ planning_gate_required: true, final_acceptance_required: true });
  const engine = new AidlcEngine(project);
  engine.init(initInput('standard', workflow));
  writeRequirements(project); engine.report('requirements_complete');
  writePlan(project); engine.report('plan_complete'); engine.continue();
  writePlan(project, true); engine.report('implementation_complete');
  writeVerification(project); engine.report('verification_complete');
  const state = engine.requestChanges();
  assert.equal(state.stage, 'implementation');
  assert.equal(state.progress.implementation, 'active');
  assert.equal(state.progress.verification, 'pending');
  assert.equal(state.progress.final_acceptance, 'pending');
});

test('accept is illegal before final acceptance', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  expectEngineError(() => engine.report('accept'), 'ILLEGAL_TRANSITION');
});

test('block requires active stage and unblock restores same stage', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  let state = engine.block('Need repository access');
  assert.equal(state.stage, 'requirements');
  assert.equal(state.status, 'blocked');
  assert.equal(engine.next().action, 'resolve_blockers');
  state = engine.unblock(undefined, true);
  assert.equal(state.stage, 'requirements');
  assert.equal(state.status, 'active');
});

test('blocked stage rejects normal lifecycle completion', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  writeRequirements(project);
  engine.block('Waiting');
  expectEngineError(() => engine.report('requirements_complete'), 'ILLEGAL_TRANSITION');
});

test('unblock with unmatched reason leaves state byte-for-byte unchanged', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  engine.block('A');
  const file = join(project, 'aidlc-docs', 'aidlc-state.json');
  const before = readFileSync(file, 'utf8');
  expectEngineError(() => engine.unblock('B'), 'BLOCKERS_REMAIN');
  assert.equal(readFileSync(file, 'utf8'), before);
});

test('next and status are read-only', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  const file = join(project, 'aidlc-docs', 'aidlc-state.json');
  const before = readFileSync(file, 'utf8');
  engine.next(); engine.status(); engine.next();
  assert.equal(readFileSync(file, 'utf8'), before);
});

test('rejected transition does not append a success audit event', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  const audit = join(project, 'aidlc-docs', 'changes', '260910-demo', 'audit.md');
  const before = readFileSync(audit, 'utf8');
  expectEngineError(() => engine.approve(), 'ILLEGAL_TRANSITION');
  assert.equal(readFileSync(audit, 'utf8'), before);
});
