import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const source = new URL('../dist/src/', import.meta.url);
const target = new URL('../runtime/', import.meta.url);
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const name of readdirSync(source)) {
  if (name.endsWith('.js')) copyFileSync(new URL(name, source), new URL(name, target));
}
