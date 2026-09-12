import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export const MAX_BOOTSTRAP_INPUT_BYTES = 2 * 1024 * 1024;

function escapes(root, candidate) {
  const rel = relative(root, candidate);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

async function assertTreeContained(projectRoot, candidate) {
  if (!existsSync(candidate)) return;
  const info = await lstat(candidate);
  const resolved = await realpath(candidate);
  if (escapes(projectRoot, resolved)) {
    throw new Error(`Refusing to bootstrap through a path that resolves outside the project: ${relative(projectRoot, candidate) || '.'}`);
  }
  if (!info.isDirectory() || info.isSymbolicLink()) return;
  for (const entry of await readdir(candidate)) {
    await assertTreeContained(projectRoot, join(candidate, entry));
  }
}

export async function assertBootstrapPathsContained(root) {
  const projectRoot = await realpath(resolve(root));
  for (const relativePath of ['.agents', 'aidlc-docs', 'AGENTS.md']) {
    await assertTreeContained(projectRoot, join(projectRoot, relativePath));
  }
}

export async function readContainedProjectText(root, relativePath, maxBytes = MAX_BOOTSTRAP_INPUT_BYTES) {
  const projectRoot = await realpath(resolve(root));
  const candidate = join(projectRoot, relativePath);
  if (!existsSync(candidate)) return null;
  const resolved = await realpath(candidate);
  if (escapes(projectRoot, resolved)) {
    throw new Error(`Refusing to inspect a path that resolves outside the project: ${relativePath}`);
  }
  const info = await stat(resolved);
  if (!info.isFile()) throw new Error(`Project inspection path is not a regular file: ${relativePath}`);
  if (info.size > maxBytes) throw new Error(`Project inspection file is too large: ${relativePath} exceeds ${maxBytes} bytes`);
  return readFile(resolved, 'utf8');
}
