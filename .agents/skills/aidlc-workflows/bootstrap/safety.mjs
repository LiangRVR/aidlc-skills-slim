import { lstat, readdir, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

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
