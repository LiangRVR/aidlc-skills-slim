import { cpSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const runtimeDir = fileURLToPath(new URL('../runtime/', import.meta.url));
const distSrc = fileURLToPath(new URL('../dist/src/', import.meta.url));
const testLauncher = fileURLToPath(new URL('./run-tests.mjs', import.meta.url));

rmSync(distSrc, { recursive: true, force: true });
cpSync(runtimeDir, distSrc, { recursive: true });

const result = spawnSync(process.execPath, [testLauncher], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
