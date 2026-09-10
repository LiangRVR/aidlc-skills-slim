import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EngineError } from './errors.js';
import { assertValidState } from './validation.js';
import type { AidlcState } from './types.js';

export const STATE_RELATIVE_PATH = 'aidlc-docs/aidlc-state.json';

export function changeDirectoryPath(root: string, change: string): string {
  return join(resolve(root), 'aidlc-docs', 'changes', change);
}

export function changeDirectoryExists(root: string, change: string): boolean {
  return existsSync(changeDirectoryPath(root, change));
}

export function removeChangeDirectory(root: string, change: string): void {
  rmSync(changeDirectoryPath(root, change), { recursive: true, force: true });
}

export function statePath(root: string): string {
  return join(resolve(root), STATE_RELATIVE_PATH);
}

export function readStateBytes(root: string): string | null {
  const file = statePath(root);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

export function readState(root: string): AidlcState | null {
  const raw = readStateBytes(root);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new EngineError('INVALID_STATE', `State file is not valid JSON: ${(error as Error).message}`);
  }
  assertValidState(parsed);
  return parsed;
}

export function writeStateAtomic(root: string, state: AidlcState): void {
  assertValidState(state);
  const file = statePath(root);
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${randomUUID()}`;
  const body = `${JSON.stringify(state, null, 2)}\n`;
  try {
    writeFileSync(tmp, body, { encoding: 'utf8', flag: 'wx' });
    renameSync(tmp, file);
  } catch (error) {
    try { rmSync(tmp, { force: true }); } catch {}
    throw new EngineError('STATE_WRITE_FAILED', `Failed to atomically write state: ${(error as Error).message}`);
  }
}

export function writeRequestFile(root: string, state: AidlcState, request: string): void {
  const relativePath = state.artifacts.request;
  if (!relativePath) throw new EngineError('INVALID_STATE', 'Request artifact path is missing');
  const file = join(resolve(root), relativePath);
  if (existsSync(file)) throw new EngineError('CHANGE_EXISTS', `Request file already exists for change ${state.active_change}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `# Request\n\n${request.trim()}\n`, { encoding: 'utf8', flag: 'wx' });
}

function auditPath(root: string, state: AidlcState): string {
  if (!state.active_change) throw new EngineError('INVALID_STATE', 'Cannot resolve audit path without active_change');
  return join(resolve(root), 'aidlc-docs', 'changes', state.active_change, 'audit.md');
}

export function appendAudit(root: string, state: AidlcState, event: string, detail: string): void {
  const file = auditPath(root, state);
  mkdirSync(dirname(file), { recursive: true });
  const prefix = existsSync(file) ? '' : '# Audit\n\n';
  const entry = `## ${new Date().toISOString()} — ${event}\n\n${detail.trim()}\n\n`;
  appendFileSync(file, prefix + entry, 'utf8');
}

export function restoreStateBytes(root: string, previous: string | null): void {
  const file = statePath(root);
  if (previous === null) {
    rmSync(file, { force: true });
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, previous, 'utf8');
}
