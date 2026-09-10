import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = readdirSync(new URL('../dist/tests/', import.meta.url))
  .filter((name) => name.endsWith('.test.js'))
  .sort()
  .map((name) => new URL(`../dist/tests/${name}`, import.meta.url).pathname);

if (files.length === 0) {
  console.error('No compiled test files found in dist/tests.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
