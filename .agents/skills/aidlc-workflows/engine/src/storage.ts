import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EngineError } from './errors.js';
import { assertValidState } from './validation.js';
import type { AidlcState } from './types.js';

export const STATE_RELATIVE_PATH = 'aidlc-docs/aidlc-state.json';
export const LOCK_RELATIVE_PATH = 'aidlc-docs/.aidlc.lock';
export const TXN_RELATIVE_PATH = 'aidlc-docs/.aidlc-txn.json';
export const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;
export const MAX_CONTROL_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TRANSACTION_BYTES = 16 * 1024 * 1024;

function escaped(rootAbs: string, candidate: string): boolean {
  const rel = relative(rootAbs, candidate);
  return rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel);
}

export function projectRoot(root: string): string {
  const abs = resolve(root);
  if (!existsSync(abs)) throw new EngineError('INVALID_ROOT', `Project root does not exist: ${abs}`);
  const resolved = realpathSync(abs);
  if (!statSync(resolved).isDirectory()) throw new EngineError('INVALID_ROOT', `Project root is not a directory: ${abs}`);
  return resolved;
}

export function repositoryPath(root: string, relativePath: string): string {
  if (!relativePath.trim()) throw new EngineError('INVALID_PATH', 'Repository-relative path must not be empty');
  if (isAbsolute(relativePath)) throw new EngineError('INVALID_PATH', `Path must be repository-relative: ${relativePath}`);
  const rootAbs = projectRoot(root);
  const fileAbs = resolve(rootAbs, relativePath);
  if (escaped(rootAbs, fileAbs)) throw new EngineError('INVALID_PATH', `Path escapes repository root: ${relativePath}`);
  return fileAbs;
}

export function assertExistingPathContained(root: string, relativePath: string): string {
  const rootAbs = projectRoot(root);
  const lexical = repositoryPath(rootAbs, relativePath);
  if (!existsSync(lexical)) return lexical;
  const resolved = realpathSync(lexical);
  if (escaped(rootAbs, resolved)) throw new EngineError('INVALID_PATH', `Resolved path escapes repository root: ${relativePath}`);
  return resolved;
}

export function assertWritablePathContained(root: string, relativePath: string): string {
  const rootAbs = projectRoot(root);
  const target = repositoryPath(rootAbs, relativePath);

  if (existsSync(target)) {
    const targetInfo = lstatSync(target);
    if (targetInfo.isSymbolicLink()) throw new EngineError('INVALID_PATH', `Refusing to write through symbolic link: ${relativePath}`);
    const resolvedTarget = realpathSync(target);
    if (escaped(rootAbs, resolvedTarget)) throw new EngineError('INVALID_PATH', `Resolved write target escapes repository root: ${relativePath}`);
  }

  let ancestor = dirname(target);
  while (!existsSync(ancestor) && ancestor !== rootAbs) {
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  if (!existsSync(ancestor)) throw new EngineError('INVALID_PATH', `No existing parent for write target: ${relativePath}`);
  const resolvedAncestor = realpathSync(ancestor);
  if (escaped(rootAbs, resolvedAncestor)) throw new EngineError('INVALID_PATH', `Write parent resolves outside repository root: ${relativePath}`);

  return target;
}

export function readTextIfExists(root: string, relativePath: string, maxBytes = MAX_CONTROL_FILE_BYTES): string | null {
  const file = assertExistingPathContained(root, relativePath);
  if (!existsSync(file)) return null;
  const stats = statSync(file);
  if (!stats.isFile()) throw new EngineError('INVALID_PATH', `Expected regular file: ${relativePath}`);
  if (stats.size > maxBytes) throw new EngineError('FILE_TOO_LARGE', `${relativePath} exceeds ${maxBytes} bytes`);
  return readFileSync(file, 'utf8');
}

export function writeTextAtomic(root: string, relativePath: string, content: string): void {
  const file = assertWritablePathContained(root, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${randomUUID()}`;
  try {
    writeFileSync(tmp, content, { encoding: 'utf8', flag: 'wx' });
    renameSync(tmp, file);
  } catch (error) {
    try { rmSync(tmp, { force: true }); } catch {}
    throw new EngineError('FILE_WRITE_FAILED', `Failed to atomically write ${relativePath}: ${(error as Error).message}`);
  }
}

export function deleteRepositoryFile(root: string, relativePath: string): void {
  const file = assertWritablePathContained(root, relativePath);
  rmSync(file, { force: true });
}

export function changeDirectoryPath(root: string, change: string): string {
  return repositoryPath(root, `aidlc-docs/changes/${change}`);
}

export function changeDirectoryExists(root: string, change: string): boolean {
  return existsSync(changeDirectoryPath(root, change));
}

export function removeChangeDirectory(root: string, change: string): void {
  const path = changeDirectoryPath(root, change);
  const rootAbs = projectRoot(root);
  if (existsSync(path) && escaped(rootAbs, realpathSync(path))) throw new EngineError('INVALID_PATH', `Change directory resolves outside repository root: ${change}`);
  rmSync(path, { recursive: true, force: true });
}

export function statePath(root: string): string {
  return repositoryPath(root, STATE_RELATIVE_PATH);
}

export function readStateBytes(root: string): string | null {
  return readTextIfExists(root, STATE_RELATIVE_PATH, MAX_CONTROL_FILE_BYTES);
}

export function parseJson(raw: string, label: string): unknown {
  try { return JSON.parse(raw); }
  catch (error) { throw new EngineError('INVALID_JSON', `${label} is not valid JSON: ${(error as Error).message}`); }
}

export function readState(root: string): AidlcState | null {
  const raw = readStateBytes(root);
  if (raw === null) return null;
  const parsed = parseJson(raw, STATE_RELATIVE_PATH);
  assertValidState(parsed);
  return parsed;
}

export function serializeState(state: AidlcState): string {
  assertValidState(state);
  return `${JSON.stringify(state, null, 2)}\n`;
}

export function writeStateAtomic(root: string, state: AidlcState): void {
  writeTextAtomic(root, STATE_RELATIVE_PATH, serializeState(state));
}

export function requestContent(request: string): string {
  return `# Request\n\n${request.trim()}\n`;
}

export function auditRelativePath(state: { active_change: string | null }): string {
  if (!state.active_change) throw new EngineError('INVALID_STATE', 'Cannot resolve audit path without active_change');
  return `aidlc-docs/changes/${state.active_change}/audit.md`;
}

export function auditEntry(event: string, detail: string, at = new Date().toISOString()): string {
  return `## ${at} — ${event}\n\n${detail.trim()}\n\n`;
}

export function nextAuditContent(root: string, state: { active_change: string | null }, event: string, detail: string, at?: string): { path: string; content: string } {
  const path = auditRelativePath(state);
  const before = readTextIfExists(root, path, MAX_CONTROL_FILE_BYTES);
  const prefix = before === null ? '# Audit\n\n' : before;
  return { path, content: prefix + auditEntry(event, detail, at) };
}

export function checkExistingArtifactPath(root: string, relativePath: string): void {
  const lexical = repositoryPath(root, relativePath);
  if (!existsSync(lexical)) return;
  const lst = lstatSync(lexical);
  if (lst.isSymbolicLink()) {
    const resolved = assertExistingPathContained(root, relativePath);
    if (!statSync(resolved).isFile()) throw new EngineError('INVALID_PATH', `Artifact symlink does not resolve to a regular file: ${relativePath}`);
  } else if (!lst.isFile()) {
    throw new EngineError('INVALID_PATH', `Artifact path is not a regular file: ${relativePath}`);
  }
  const stats = statSync(assertExistingPathContained(root, relativePath));
  if (stats.size > MAX_ARTIFACT_BYTES) throw new EngineError('FILE_TOO_LARGE', `${relativePath} exceeds ${MAX_ARTIFACT_BYTES} bytes`);
}
