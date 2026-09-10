import { existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { EngineError } from './errors.js';
import { assertExistingPathContained } from './storage.js';
import { canonicalDigest, sha256Bytes } from './hashing.js';
import type { SourceManifestEntry, SourceRecord, SourceSnapshot } from './types.js';

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const MAX_GIT_OUTPUT = 16 * 1024 * 1024;
const MAX_SOURCE_FILE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_RECORDS = 20_000;

function isWorkflowPath(path: string): boolean {
  return path === 'aidlc-docs' || path.startsWith('aidlc-docs/');
}

function runGit(root: string, args: string[], allowFailure = false): string {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: MAX_GIT_OUTPUT,
    shell: false,
  });
  if (result.error) {
    if (allowFailure) return '';
    throw new EngineError('SOURCE_SNAPSHOT_UNAVAILABLE', `git ${args.join(' ')} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    if (allowFailure) return '';
    throw new EngineError('SOURCE_SNAPSHOT_UNAVAILABLE', `git ${args.join(' ')} failed: ${(result.stderr ?? '').trim() || `exit ${result.status}`}`);
  }
  return result.stdout ?? '';
}

function isGitRepository(root: string): boolean {
  const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8', shell: false });
  return !result.error && result.status === 0 && (result.stdout ?? '').trim() === 'true';
}

function testOnlyEmptySnapshot(): SourceSnapshot {
  const records: SourceRecord[] = [];
  return {
    snapshot_version: 1,
    mode: 'git',
    captured_at: new Date().toISOString(),
    base_tree: EMPTY_TREE,
    digest: canonicalDigest({ base_tree: EMPTY_TREE, records }),
    records,
  };
}

function ensureGitRepository(root: string): void {
  if (isGitRepository(root)) return;
  if (process.env.AIDLC_TEST_ALLOW_NON_GIT === '1') return;
  throw new EngineError('SOURCE_SNAPSHOT_UNAVAILABLE', 'Source freshness requires a Git working tree');
}

function baseTree(root: string): { tree: string; hasHead: boolean } {
  const result = spawnSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8', shell: false });
  if (!result.error && result.status === 0) return { tree: (result.stdout ?? '').trim(), hasHead: true };
  return { tree: EMPTY_TREE, hasHead: false };
}

function hashSourceFile(root: string, path: string): string | null {
  const lexical = assertExistingPathContained(root, path);
  if (!existsSync(lexical)) return null;
  const stats = statSync(lexical);
  if (!stats.isFile()) throw new EngineError('SOURCE_SNAPSHOT_UNAVAILABLE', `Source path is not a regular file: ${path}`);
  if (stats.size > MAX_SOURCE_FILE_BYTES) throw new EngineError('SOURCE_FILE_TOO_LARGE', `${path} exceeds ${MAX_SOURCE_FILE_BYTES} bytes`);
  return sha256Bytes(readFileSync(lexical));
}

function parseNameStatus(raw: string): Array<{ status: string; path: string; previous_path: string | null }> {
  const tokens = raw.split('\0').filter((token) => token.length > 0);
  const result: Array<{ status: string; path: string; previous_path: string | null }> = [];
  for (let i = 0; i < tokens.length;) {
    let status = tokens[i++];
    let path: string | undefined;
    if (status.includes('\t')) {
      const split = status.split('\t');
      status = split.shift()!;
      path = split.join('\t');
    } else path = tokens[i++];
    if (!path) throw new EngineError('SOURCE_SNAPSHOT_UNAVAILABLE', 'Unable to parse git name-status output');
    if (status.startsWith('R') || status.startsWith('C')) {
      const newPath = tokens[i++];
      if (!newPath) throw new EngineError('SOURCE_SNAPSHOT_UNAVAILABLE', 'Unable to parse git rename/copy output');
      result.push({ status, path: newPath, previous_path: path });
    } else result.push({ status, path, previous_path: null });
  }
  return result;
}

function collectRecords(root: string, hasHead: boolean): SourceRecord[] {
  const records: SourceRecord[] = [];
  if (hasHead) {
    const raw = runGit(root, ['diff', '--name-status', '-z', '-M', 'HEAD', '--']);
    for (const item of parseNameStatus(raw)) {
      if (isWorkflowPath(item.path) && (!item.previous_path || isWorkflowPath(item.previous_path))) continue;
      records.push({ ...item, sha256: hashSourceFile(root, item.path) });
    }
  } else {
    const raw = runGit(root, ['ls-files', '-z', '--cached']);
    for (const path of raw.split('\0').filter(Boolean)) {
      if (isWorkflowPath(path)) continue;
      records.push({ status: 'A', path, previous_path: null, sha256: hashSourceFile(root, path) });
    }
  }

  const untrackedRaw = runGit(root, ['ls-files', '--others', '--exclude-standard', '-z']);
  const known = new Set(records.map((record) => record.path));
  for (const path of untrackedRaw.split('\0').filter(Boolean)) {
    if (isWorkflowPath(path) || known.has(path)) continue;
    records.push({ status: '??', path, previous_path: null, sha256: hashSourceFile(root, path) });
  }

  if (records.length > MAX_SOURCE_RECORDS) throw new EngineError('SOURCE_MANIFEST_TOO_LARGE', `Source snapshot has more than ${MAX_SOURCE_RECORDS} changed/untracked records`);
  return records.sort((a, b) => `${a.path}\0${a.previous_path ?? ''}\0${a.status}`.localeCompare(`${b.path}\0${b.previous_path ?? ''}\0${b.status}`));
}

export function captureSourceSnapshot(root: string): SourceSnapshot {
  ensureGitRepository(root);
  if (!isGitRepository(root)) return testOnlyEmptySnapshot();
  const base = baseTree(root);
  const records = collectRecords(root, base.hasHead);
  const digest = canonicalDigest({ base_tree: base.tree, records: records.map(({ status, path, previous_path, sha256 }) => ({ status, path, previous_path, sha256 })) });
  return { snapshot_version: 1, mode: 'git', captured_at: new Date().toISOString(), base_tree: base.tree, digest, records };
}

export function tryCaptureSourceSnapshot(root: string): { snapshot: SourceSnapshot | null; reason: string | null } {
  try { return { snapshot: captureSourceSnapshot(root), reason: null }; }
  catch (error) { return { snapshot: null, reason: error instanceof Error ? error.message : String(error) }; }
}

function statusName(status: string): SourceManifestEntry['status'] {
  const code = status[0];
  if (status === '??' || code === 'A') return 'added';
  if (code === 'D') return 'deleted';
  if (code === 'R') return 'renamed';
  if (code === 'M') return 'modified';
  return 'changed';
}

export function buildSourceManifest(root: string, baseline: SourceSnapshot | null, current: SourceSnapshot): { manifest: SourceManifestEntry[]; digest: string } {
  if (!baseline) {
    const manifest = current.records.map((record) => ({ status: statusName(record.status), path: record.path, previous_path: record.previous_path, sha256: record.sha256 }));
    return { manifest, digest: canonicalDigest(manifest) };
  }

  const baselineRecords = new Map(baseline.records.map((record) => [record.path, record]));
  const currentRecords = new Map(current.records.map((record) => [record.path, record]));
  const candidates = new Map<string, { status: string; path: string; previous_path: string | null }>();

  for (const [path, record] of currentRecords) {
    const old = baselineRecords.get(path);
    if (!old || old.status !== record.status || old.previous_path !== record.previous_path || old.sha256 !== record.sha256) candidates.set(path, record);
  }
  for (const [path, old] of baselineRecords) {
    if (!currentRecords.has(path)) candidates.set(path, { status: 'X', path, previous_path: old.previous_path });
  }

  if (baseline.base_tree !== current.base_tree) {
    const raw = runGit(root, ['diff', '--name-status', '-z', '-M', baseline.base_tree, current.base_tree, '--']);
    for (const item of parseNameStatus(raw)) {
      if (isWorkflowPath(item.path) && (!item.previous_path || isWorkflowPath(item.previous_path))) continue;
      candidates.set(item.path, item);
    }
  }

  const manifest: SourceManifestEntry[] = [];
  for (const item of [...candidates.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    const currentHash = hashSourceFile(root, item.path);
    const baselineDirty = baselineRecords.get(item.path);
    if (baselineDirty && baselineDirty.sha256 === currentHash && baselineDirty.previous_path === item.previous_path) continue;
    manifest.push({ status: statusName(item.status), path: item.path, previous_path: item.previous_path, sha256: currentHash });
  }

  if (manifest.length > MAX_SOURCE_RECORDS) throw new EngineError('SOURCE_MANIFEST_TOO_LARGE', `Source manifest has more than ${MAX_SOURCE_RECORDS} entries`);
  return { manifest, digest: canonicalDigest({ baseline_digest: baseline.digest, current_digest: current.digest, manifest }) };
}
