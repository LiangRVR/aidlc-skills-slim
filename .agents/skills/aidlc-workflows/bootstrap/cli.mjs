import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { initProject } from './init.mjs';
import { assertBootstrapPathsContained } from './safety.mjs';

function help() {
  return `AI-DLC Slim CLI\n\nUsage:\n  aidlc init [--root <dir>] [--yes]\n  aidlc help\n`;
}

function effectiveProjectRoot(requestedRoot) {
  const candidate = resolve(requestedRoot ?? process.cwd());
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: candidate, encoding: 'utf8', shell: false });
  return result.status === 0 ? result.stdout.trim() : candidate;
}

export async function runCli(argv) {
  const [command = 'help', ...rest] = argv;
  if (command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write(help());
    return;
  }
  if (command !== 'init') throw new Error(`Unknown command: ${command}`);

  let root;
  let yes = false;
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--yes' || token === '-y') { yes = true; continue; }
    if (token === '--root') {
      root = rest[i + 1];
      if (!root) throw new Error('Missing value for --root');
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${token}`);
  }

  await assertBootstrapPathsContained(effectiveProjectRoot(root));
  await initProject({ root, yes });
}
