import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AidlcEngine } from '../src/engine.js';
import { EngineError } from '../src/errors.js';
import type { InitInput, WorkflowFlags } from '../src/types.js';

function root(): string {
  return mkdtempSync(join(tmpdir(), 'aidlc-reclassify-'));
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

function initInput(risk: InitInput['risk'] = 'low', workflow = flags()): InitInput {
  return {
    active_change: '260910-reclassify',
    risk,
    risk_rationale: `${risk} risk test`,
    workflow,
    request: 'Implement the requested behavior.',
  };
}

function changeDir(project: string): string {
  const dir = join(project, 'aidlc-docs', 'changes', '260910-reclassify');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeRequirements(project: string): void {
  writeFileSync(join(changeDir(project), 'requirements.md'), `# Requirements\n\n## Intent\nChange behavior.\n\n## Acceptance Criteria\n- R1: behavior works\n\n## Must Preserve\nExisting contracts.\n\n## Constraints\nCurrent project constraints.\n\n## Out of Scope\nUnrelated work.\n`, 'utf8');
}

function writePlan(project: string): void {
  writeFileSync(join(changeDir(project), 'plan.md'), `# Implementation Plan\n\n## Scope\nImplement R1.\n\n## Work\n1. [ ] Implement change.\n\n## Verification Strategy\n- R1: focused test\n`, 'utf8');
}

function expectEngineError(fn: () => unknown, code: string): void {
  assert.throws(fn, (error: unknown) => error instanceof EngineError && error.code === code);
}

test('reclassify can promote low risk to high before implementation and route to Design', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  writeRequirements(project);
  engine.report('requirements_complete');

  const state = engine.reclassify({
    risk: 'high',
    risk_rationale: 'Authentication scope was discovered during requirements analysis.',
    workflow: flags({
      design_required: true,
      planning_gate_required: true,
      review_required: true,
      final_acceptance_required: true,
      security_required: true,
    }),
  });

  assert.equal(state.stage, 'design');
  assert.equal(state.status, 'active');
  assert.equal(state.progress.design, 'active');
  assert.equal(state.progress.plan, 'pending');
  assert.equal(state.risk, 'high');
});

test('reclassify at planning gate clears approval and forces a fresh Plan', () => {
  const project = root();
  const workflow = flags({ planning_gate_required: true, final_acceptance_required: true });
  const engine = new AidlcEngine(project);
  engine.init(initInput('standard', workflow));
  writeRequirements(project);
  engine.report('requirements_complete');
  writePlan(project);
  engine.report('plan_complete');
  engine.approve();

  const state = engine.reclassify({
    risk: 'standard',
    risk_rationale: 'Independent review is now required.',
    workflow: flags({ planning_gate_required: true, review_required: true, final_acceptance_required: true }),
  });

  assert.equal(state.stage, 'plan');
  assert.equal(state.status, 'active');
  assert.equal(state.gate, null);
  assert.equal(state.progress.plan, 'active');
  assert.equal(state.progress.review, 'pending');
});

test('reclassify is illegal after Implementation begins', () => {
  const project = root();
  const engine = new AidlcEngine(project);
  engine.init(initInput());
  writeRequirements(project);
  engine.report('requirements_complete');
  writePlan(project);
  engine.report('plan_complete');

  expectEngineError(() => engine.reclassify({
    risk: 'low',
    risk_rationale: 'Too late.',
    workflow: flags(),
  }), 'ILLEGAL_TRANSITION');
});
