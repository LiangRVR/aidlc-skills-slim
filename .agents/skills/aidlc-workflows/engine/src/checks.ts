import { existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { EngineError } from './errors.js';
import { hashArtifact, sha256Text } from './hashing.js';
import { captureSourceSnapshot } from './source.js';
import { assertExistingPathContained, parseJson, readTextIfExists } from './storage.js';
import type { CheckDefinition, CheckReceipt, ChecksConfig, EvidenceDocument } from './types.js';

export const CHECKS_CONFIG_PATH = 'aidlc-docs/project/checks.json';
const MAX_CHECK_CONFIG_BYTES = 512 * 1024;
const MAX_CHECK_OUTPUT = 8 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 30 * 60 * 1000;
const WINDOWS_PACKAGE_SHIMS = new Set(['npm', 'npm.cmd', 'npx', 'npx.cmd', 'pnpm', 'pnpm.cmd', 'pnpx', 'pnpx.cmd', 'yarn', 'yarn.cmd', 'yarnpkg', 'yarnpkg.cmd']);
const WINDOWS_CMD_UNSAFE = /[\r\n"&|<>^%!]/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDefinition(name: string, value: unknown): CheckDefinition {
  if (!isObject(value) || !Array.isArray(value.command) || value.command.length === 0 || value.command.some((part) => typeof part !== 'string' || !part.length) || typeof value.required !== 'boolean') {
    throw new EngineError('INVALID_CHECK_CONFIG', `Check ${name} must define non-empty command[] and required boolean`);
  }
  const timeout = value.timeout_ms === undefined ? undefined : Number(value.timeout_ms);
  if (timeout !== undefined && (!Number.isInteger(timeout) || timeout < 1_000 || timeout > MAX_TIMEOUT_MS)) throw new EngineError('INVALID_CHECK_CONFIG', `Check ${name} timeout_ms must be between 1000 and ${MAX_TIMEOUT_MS}`);
  if (value.cwd !== undefined && (typeof value.cwd !== 'string' || !value.cwd.trim())) throw new EngineError('INVALID_CHECK_CONFIG', `Check ${name} cwd must be a non-empty repository-relative path`);
  const allowed = new Set(['command', 'required', 'timeout_ms', 'cwd']);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new EngineError('INVALID_CHECK_CONFIG', `Check ${name} contains unknown properties`, unknown);
  return { command: [...value.command] as string[], required: value.required, ...(timeout !== undefined ? { timeout_ms: timeout } : {}), ...(value.cwd !== undefined ? { cwd: value.cwd.trim() } : {}) };
}

export function readChecksConfig(root: string): ChecksConfig {
  const raw = readTextIfExists(root, CHECKS_CONFIG_PATH, MAX_CHECK_CONFIG_BYTES);
  if (raw === null) return { schema_version: 1, checks: {} };
  const parsed = parseJson(raw, CHECKS_CONFIG_PATH);
  if (!isObject(parsed) || parsed.schema_version !== 1 || !isObject(parsed.checks)) throw new EngineError('INVALID_CHECK_CONFIG', `${CHECKS_CONFIG_PATH} must contain schema_version=1 and checks object`);
  const allowed = new Set(['schema_version', 'checks']);
  const unknown = Object.keys(parsed).filter((key) => !allowed.has(key));
  if (unknown.length) throw new EngineError('INVALID_CHECK_CONFIG', `${CHECKS_CONFIG_PATH} contains unknown properties`, unknown);
  const checks: Record<string, CheckDefinition> = {};
  for (const [name, definition] of Object.entries(parsed.checks)) {
    if (!/^[A-Za-z0-9_.-]+$/.test(name)) throw new EngineError('INVALID_CHECK_CONFIG', `Invalid check name: ${name}`);
    checks[name] = normalizeDefinition(name, definition);
  }
  return { schema_version: 1, checks };
}

export function checksConfigDigest(root: string): string | null {
  if (!existsSync(assertExistingPathContained(root, CHECKS_CONFIG_PATH))) return null;
  return hashArtifact(root, CHECKS_CONFIG_PATH, 'checks config');
}

function checkCwd(root: string, definition: CheckDefinition): { absolute: string; relative: string } {
  const relative = definition.cwd ?? '.';
  const absolute = assertExistingPathContained(root, relative);
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) throw new EngineError('INVALID_CHECK_CONFIG', `Check cwd is not a directory: ${relative}`);
  return { absolute, relative };
}

function commonSpawnOptions(cwd: string, definition: CheckDefinition) {
  return {
    cwd,
    encoding: 'utf8' as const,
    shell: false as const,
    timeout: definition.timeout_ms ?? DEFAULT_TIMEOUT_MS,
    maxBuffer: MAX_CHECK_OUTPUT,
    env: process.env,
  };
}

function quoteWindowsPackageArg(value: string): string {
  if (WINDOWS_CMD_UNSAFE.test(value)) {
    throw new EngineError('INVALID_CHECK_CONFIG', 'Windows package-manager check arguments may not contain shell metacharacters');
  }
  return `"${value}"`;
}

function spawnCheck(definition: CheckDefinition, cwd: string) {
  const [program, ...args] = definition.command;
  if (process.platform === 'win32' && WINDOWS_PACKAGE_SHIMS.has(program.toLowerCase())) {
    const shim = program.toLowerCase().endsWith('.cmd') ? program : `${program}.cmd`;
    const commandLine = [shim, ...args.map(quoteWindowsPackageArg)].join(' ');
    const cmdPayload = `"${commandLine}"`;
    return spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', cmdPayload], commonSpawnOptions(cwd, definition));
  }
  return spawnSync(program, args, commonSpawnOptions(cwd, definition));
}

export function executeCheck(root: string, name: string, config: ChecksConfig): CheckReceipt {
  const definition = config.checks[name];
  if (!definition) throw new EngineError('UNKNOWN_CHECK', `Unknown verification check: ${name}`);
  const cwd = checkCwd(root, definition);
  const before = captureSourceSnapshot(root);
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const result = spawnCheck(definition, cwd.absolute);
  const duration = Date.now() - started;
  const after = captureSourceSnapshot(root);
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const timedOut = Boolean(result.error && (result.error as any).code === 'ETIMEDOUT');
  const sourceChanged = before.digest !== after.digest;
  const checkResult: CheckReceipt['result'] = sourceChanged ? 'STALE' : (!result.error && result.status === 0 ? 'PASS' : 'FAIL');
  return {
    receipt_id: randomUUID(),
    name,
    command: [...definition.command],
    cwd: cwd.relative,
    started_at: startedAt,
    duration_ms: duration,
    exit_code: typeof result.status === 'number' ? result.status : null,
    timed_out: timedOut,
    result: checkResult,
    source_digest_before: before.digest,
    source_digest_after: after.digest,
    stdout_sha256: sha256Text(stdout),
    stderr_sha256: sha256Text(stderr),
    stdout_bytes: Buffer.byteLength(stdout, 'utf8'),
    stderr_bytes: Buffer.byteLength(stderr, 'utf8'),
  };
}

function sameDefinition(receipt: CheckReceipt, definition: CheckDefinition): boolean {
  const cwd = definition.cwd ?? '.';
  return receipt.cwd === cwd && JSON.stringify(receipt.command) === JSON.stringify(definition.command);
}

export function selectVerificationReceipts(evidence: EvidenceDocument, config: ChecksConfig, sourceDigest: string): { ids: string[]; missingRequired: string[] } {
  const ids: string[] = [];
  const missingRequired: string[] = [];
  for (const [name, definition] of Object.entries(config.checks).sort(([a], [b]) => a.localeCompare(b))) {
    const matching = [...evidence.checks].reverse().find((receipt) => receipt.name === name && receipt.result === 'PASS' && receipt.source_digest_before === sourceDigest && receipt.source_digest_after === sourceDigest && sameDefinition(receipt, definition));
    if (matching) ids.push(matching.receipt_id);
    else if (definition.required) missingRequired.push(name);
  }
  return { ids, missingRequired };
}
