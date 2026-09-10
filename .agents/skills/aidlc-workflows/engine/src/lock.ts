import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EngineError } from './errors.js';
import { assertExistingPathContained, assertWritablePathContained, LOCK_RELATIVE_PATH, repositoryPath } from './storage.js';
import { ENGINE_VERSION } from './types.js';

export interface WorkflowLock {
  lock_version: 1;
  engine_version: string;
  pid: number;
  hostname: string;
  started_at: string;
  operation: string;
  nonce: string;
}

function parseLock(raw: string): WorkflowLock | null {
  try {
    const value = JSON.parse(raw) as Partial<WorkflowLock>;
    if (
      value.lock_version !== 1 ||
      typeof value.engine_version !== 'string' ||
      typeof value.pid !== 'number' || !Number.isInteger(value.pid) || value.pid <= 0 ||
      typeof value.hostname !== 'string' || !value.hostname ||
      typeof value.started_at !== 'string' || !value.started_at ||
      typeof value.operation !== 'string' || !value.operation ||
      typeof value.nonce !== 'string' || !value.nonce
    ) return null;
    return value as WorkflowLock;
  } catch {
    return null;
  }
}

export function readWorkflowLock(root: string): { raw: string; lock: WorkflowLock | null } | null {
  const lexical = repositoryPath(root, LOCK_RELATIVE_PATH);
  if (!existsSync(lexical)) return null;
  const path = assertExistingPathContained(root, LOCK_RELATIVE_PATH);
  const raw = readFileSync(path, 'utf8');
  return { raw, lock: parseLock(raw) };
}

export function processAppearsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: any) {
    if (error?.code === 'EPERM') return true;
    return false;
  }
}

export function lockIsProvablyStale(lock: WorkflowLock): boolean {
  return lock.hostname === hostname() && !processAppearsAlive(lock.pid);
}

export function acquireWorkflowLock(root: string, operation: string): WorkflowLock {
  const file = assertWritablePathContained(root, LOCK_RELATIVE_PATH);
  mkdirSync(dirname(file), { recursive: true });
  const lock: WorkflowLock = {
    lock_version: 1,
    engine_version: ENGINE_VERSION,
    pid: process.pid,
    hostname: hostname(),
    started_at: new Date().toISOString(),
    operation,
    nonce: randomUUID(),
  };
  try {
    writeFileSync(file, `${JSON.stringify(lock, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    return lock;
  } catch (error: any) {
    if (error?.code !== 'EEXIST') throw new EngineError('LOCK_FAILED', `Unable to acquire workflow lock: ${error?.message ?? String(error)}`);
    const existing = readWorkflowLock(root);
    if (existing?.lock) throw new EngineError('WORKFLOW_LOCKED', `Workflow is locked by pid ${existing.lock.pid} on ${existing.lock.hostname} for ${existing.lock.operation}`);
    throw new EngineError('WORKFLOW_LOCKED', 'Workflow lock exists but is malformed; run doctor --repair');
  }
}

export function releaseWorkflowLock(root: string, owned: WorkflowLock): void {
  const lexical = repositoryPath(root, LOCK_RELATIVE_PATH);
  if (!existsSync(lexical)) return;
  const existing = readWorkflowLock(root);
  if (!existing?.lock || existing.lock.nonce !== owned.nonce) throw new EngineError('LOCK_OWNERSHIP_LOST', 'Refusing to remove a workflow lock not owned by this process');
  const file = assertWritablePathContained(root, LOCK_RELATIVE_PATH);
  rmSync(file, { force: true });
}

export function removeStaleOrMalformedLock(root: string): 'none' | 'stale' | 'malformed' {
  const existing = readWorkflowLock(root);
  if (!existing) return 'none';
  if (existing.lock) {
    if (!lockIsProvablyStale(existing.lock)) throw new EngineError('WORKFLOW_LOCKED', `Active workflow lock held by pid ${existing.lock.pid} on ${existing.lock.hostname}`);
    rmSync(assertWritablePathContained(root, LOCK_RELATIVE_PATH), { force: true });
    return 'stale';
  }
  rmSync(assertWritablePathContained(root, LOCK_RELATIVE_PATH), { force: true });
  return 'malformed';
}

export function withWorkflowLock<T>(root: string, operation: string, fn: () => T): T {
  const lock = acquireWorkflowLock(root, operation);
  try {
    const result = fn();
    releaseWorkflowLock(root, lock);
    return result;
  } catch (error) {
    try { releaseWorkflowLock(root, lock); } catch {}
    throw error;
  }
}
