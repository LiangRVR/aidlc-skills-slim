import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { AidlcEngine } from '../engine/runtime/engine.js';
import { readChecksConfig } from '../engine/runtime/checks.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(HERE, '..');
const TEMPLATE_ROOT = join(SKILL_ROOT, 'templates');
const DOC_ONLY_NAMES = new Set(['README.md', 'Readme.md', 'readme.md', 'LICENSE', 'LICENSE.md', '.gitignore', '.gitattributes']);
const IGNORED_NAMES = new Set(['.git', '.agents', 'aidlc-docs', 'node_modules', '.venv', 'venv', 'dist', 'build']);

function run(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: false });
}

function gitRoot(cwd) {
  const result = run('git', ['rev-parse', '--show-toplevel'], cwd);
  return result.status === 0 ? result.stdout.trim() : null;
}

function hasGit() {
  return run('git', ['--version'], process.cwd()).status === 0;
}

async function assertDirectory(path) {
  let info;
  try { info = await stat(path); } catch { throw new Error(`Project root does not exist: ${path}`); }
  if (!info.isDirectory()) throw new Error(`Project root is not a directory: ${path}`);
}

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}

async function readText(path) {
  try { return await readFile(path, 'utf8'); } catch { return null; }
}

async function projectEntries(root) {
  try {
    return (await readdir(root, { withFileTypes: true })).filter((entry) => !IGNORED_NAMES.has(entry.name) && entry.name !== '.DS_Store');
  } catch { return []; }
}

async function hasApplicationSignals(root) {
  const entries = await projectEntries(root);
  return entries.some((entry) => !DOC_ONLY_NAMES.has(entry.name));
}

function depsOf(pkg) {
  return { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
}

function addCheck(list, check) {
  if (!list.some((item) => item.name === check.name)) list.push(check);
}

function validPackageScript(name, value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const normalized = value.trim().toLowerCase();
  if (name === 'test' && (normalized === 'test' || normalized.includes('no test specified'))) return false;
  return true;
}

async function detectProject(root) {
  const pkg = await readJson(join(root, 'package.json'));
  const deps = depsOf(pkg);
  const exists = (name) => existsSync(join(root, name));
  const stacks = [];
  if (pkg) stacks.push('Node.js');
  if (exists('tsconfig.json') || deps.typescript) stacks.push('TypeScript');
  if (deps.react) stacks.push('React');
  if (deps.next) stacks.push('Next.js');
  if (deps.vite) stacks.push('Vite');
  if (deps.express) stacks.push('Express');
  if (deps['@supabase/supabase-js']) stacks.push('Supabase');
  if (deps.prisma || exists('prisma')) stacks.push('Prisma');
  const python = exists('pyproject.toml') || exists('requirements.txt') || exists('setup.py');
  if (python) stacks.push('Python');
  if (exists('Cargo.toml')) stacks.push('Rust');
  if (exists('go.mod')) stacks.push('Go');
  if (exists('Dockerfile') || exists('docker-compose.yml') || exists('docker-compose.yaml')) stacks.push('Docker');
  if (exists('.github/workflows')) stacks.push('GitHub Actions');

  const scripts = pkg?.scripts ?? {};
  const packageRunner = exists('pnpm-lock.yaml') ? 'pnpm' : exists('yarn.lock') ? 'yarn' : 'npm';
  const checkCandidates = [];
  for (const [name, required] of [['test', true], ['typecheck', true], ['build', true], ['lint', false]]) {
    if (validPackageScript(name, scripts[name])) {
      addCheck(checkCandidates, { name, command: [packageRunner, 'run', name], required, timeout_ms: 120000 });
    }
  }

  if (python) {
    const pythonConfig = `${await readText(join(root, 'pyproject.toml')) ?? ''}\n${await readText(join(root, 'requirements.txt')) ?? ''}`;
    if (/\bpytest\b/i.test(pythonConfig)) addCheck(checkCandidates, { name: 'pytest', command: ['python', '-m', 'pytest'], required: true, timeout_ms: 120000 });
  }
  if (exists('Cargo.toml')) {
    addCheck(checkCandidates, { name: 'cargo-test', command: ['cargo', 'test'], required: true, timeout_ms: 120000 });
    addCheck(checkCandidates, { name: 'cargo-check', command: ['cargo', 'check'], required: false, timeout_ms: 120000 });
  }
  if (exists('go.mod')) addCheck(checkCandidates, { name: 'go-test', command: ['go', 'test', './...'], required: true, timeout_ms: 120000 });

  let readmeTitle = null;
  let readmeSummary = null;
  for (const candidate of ['README.md', 'Readme.md', 'readme.md']) {
    const text = await readText(join(root, candidate));
    if (!text) continue;
    const heading = text.match(/^#\s+(.+)$/m);
    if (heading) readmeTitle = heading[1].trim();
    const paragraph = text.split(/\n\s*\n/).map((part) => part.trim()).find((part) => part && !part.startsWith('#') && !part.startsWith('```') && !part.startsWith('!['));
    if (paragraph) readmeSummary = paragraph.replace(/\s+/g, ' ').slice(0, 500);
    break;
  }

  return {
    kind: (await hasApplicationSignals(root)) ? 'brownfield' : 'greenfield',
    name: pkg?.name || readmeTitle || basename(root),
    description: pkg?.description || readmeSummary || '',
    stacks: [...new Set(stacks)],
    scripts,
    checkCandidates,
    packageRunner,
  };
}

async function promptFactory(yes) {
  if (yes) return {
    text: async (_q, fallback = '') => fallback,
    yesNo: async (_q, fallback = true) => fallback,
    close: () => {},
  };
  const rl = createInterface({ input, output });
  return {
    text: async (q, fallback = '') => {
      const suffix = fallback ? ` [${fallback}]` : '';
      const answer = (await rl.question(`${q}${suffix}: `)).trim();
      return answer || fallback;
    },
    yesNo: async (q, fallback = true) => {
      const hint = fallback ? 'Y/n' : 'y/N';
      while (true) {
        const answer = (await rl.question(`${q} (${hint}): `)).trim().toLowerCase();
        if (!answer) return fallback;
        if (['y', 'yes'].includes(answer)) return true;
        if (['n', 'no'].includes(answer)) return false;
        output.write('Please answer yes or no.\n');
      }
    },
    close: () => rl.close(),
  };
}

async function copyFileIfMissing(source, target) {
  if (existsSync(target)) return false;
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { force: false, errorOnExist: false });
  return true;
}

async function copyMissingTree(source, target) {
  let copied = 0;
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const src = join(source, entry.name);
    const dst = join(target, entry.name);
    if (entry.isDirectory()) copied += await copyMissingTree(src, dst);
    else if (entry.isFile() && !existsSync(dst)) {
      await cp(src, dst, { force: false, errorOnExist: false });
      copied += 1;
    }
  }
  return copied;
}

async function writeIfMissing(path, content) {
  if (existsSync(path)) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
  return true;
}

function briefContent({ project, purpose, users, production, sensitive }) {
  return `# Project Brief\n\n## Purpose\n${purpose || 'TBD — clarify the product purpose before consequential implementation decisions.'}\n\n## Primary users\n${users || 'TBD'}\n\n## Scope\nMaintain this section with durable product scope and permanent constraints only.\n\n## Operational context\n- Project: ${project.name}\n- Lifecycle state: ${production ? 'Already used in production or production-like operation' : 'Not confirmed as production'}\n- Sensitive/personal data: ${sensitive ? 'Yes or possible — treat privacy/security as consequential' : 'Not currently identified'}\n\n## Non-goals\nRecord durable non-goals when they become known.\n`;
}

function architectureContent(project) {
  const detected = project.stacks.length ? project.stacks.join(', ') : 'No architecture/stack safely inferred yet';
  return `# Architecture\n\n## Observed baseline\n${detected}.\n\n## Boundaries and data flow\nDocument only durable, repository-supported boundaries. For greenfield projects, leave undecided architecture explicit until Design approves it.\n\n## Integrations and security boundaries\nAdd external systems, trust boundaries, auth/authorization boundaries, sensitive-data flows, and deployment boundaries when known.\n\n## Invariants\nRecord architecture rules that future changes must preserve.\n`;
}

function techStackContent(project, stackDecision) {
  const detected = project.stacks.length ? project.stacks.map((item) => `- ${item}`).join('\n') : '- Undecided';
  return `# Tech Stack\n\n## Status\n${project.kind === 'greenfield' && !stackDecision ? 'Undecided — choose through Requirements/Design when enough information exists.' : 'Observed/confirmed from the repository and setup answers.'}\n\n## Detected technologies\n${detected}\n\n## Important commands\nAdd only non-obvious setup, run, build, migration, or deployment commands that are expensive to rediscover.\n\n## Rationale and constraints\nRecord durable reasons for consequential stack choices; do not duplicate package manifests.\n`;
}

function testingContent(checks) {
  const lines = checks.length ? checks.map((item) => `- ${item.name}: \`${item.command.join(' ')}\`${item.required ? ' (required)' : ''}`).join('\n') : '- No executable checks configured yet.';
  return `# Testing and Verification\n\n## Executable checks\n${lines}\n\n## Runtime/user-surface verification\nDescribe browser, device, integration, data, or operational checks that cannot be proven by automated commands alone.\n\n## Minimum expectations\nUnchecked behavior is NOT VERIFIED. Do not weaken a failing check merely to obtain PASS.\n`;
}

function checksConfig(checks) {
  return JSON.stringify({ schema_version: 1, checks: Object.fromEntries(checks.map((item) => [item.name, { command: item.command, required: item.required, timeout_ms: item.timeout_ms }])) }, null, 2) + '\n';
}

function summarizeDoctor(report) {
  const failed = report.checks.filter((item) => item.status === 'fail');
  if (!failed.length) return 'healthy';
  return failed.map((item) => `${item.name}: ${item.message}`).join('; ');
}

export async function initProject({ root: requestedRoot, yes = false } = {}) {
  if (!hasGit()) throw new Error('Git is required but was not found in PATH.');
  let root = resolve(requestedRoot ?? process.cwd());
  await assertDirectory(root);
  const prompts = await promptFactory(yes);
  const created = [];
  const preserved = [];

  try {
    const existingGitRoot = gitRoot(root);
    if (existingGitRoot) root = existingGitRoot;
    else {
      const initialize = await prompts.yesNo(`No Git repository was found at ${root}. Initialize one here?`, true);
      if (!initialize) throw new Error('AI-DLC bootstrap requires a Git repository.');
      const result = run('git', ['init'], root);
      if (result.status !== 0) throw new Error(`git init failed: ${result.stderr.trim()}`);
    }

    const project = await detectProject(root);
    output.write(`\nAI-DLC Slim setup\nProject root: ${root}\nProject type: ${project.kind}\n`);
    if (project.stacks.length) output.write(`Detected stack: ${project.stacks.join(', ')}\n`);
    if (project.checkCandidates.length) output.write(`Detected checks: ${project.checkCandidates.map((item) => item.command.join(' ')).join(', ')}\n`);

    const installedSkill = join(root, '.agents', 'skills', 'aidlc-workflows');
    if (resolve(installedSkill) !== resolve(SKILL_ROOT)) {
      const copied = await copyMissingTree(SKILL_ROOT, installedSkill);
      if (copied) created.push(`.agents/skills/aidlc-workflows (${copied} missing files installed)`);
      else preserved.push('.agents/skills/aidlc-workflows');
    }

    const agentsPath = join(root, 'AGENTS.md');
    if (await copyFileIfMissing(join(TEMPLATE_ROOT, 'AGENTS.md'), agentsPath)) created.push('AGENTS.md');
    else preserved.push('AGENTS.md');

    const baselineDir = join(root, 'aidlc-docs', 'project');
    await mkdir(join(baselineDir, 'decisions'), { recursive: true });

    const briefPath = join(baselineDir, 'brief.md');
    const architecturePath = join(baselineDir, 'architecture.md');
    const stackPath = join(baselineDir, 'tech-stack.md');
    const testingPath = join(baselineDir, 'testing.md');
    const checksPath = join(baselineDir, 'checks.json');

    let purpose = '';
    let users = '';
    let production = false;
    let sensitive = false;
    let stackDecision = project.stacks.length > 0;

    if (!existsSync(briefPath)) {
      purpose = await prompts.text('What is this product/project primarily for?', project.description || '');
      users = await prompts.text('Who are the primary users or operators?', 'TBD');
      production = await prompts.yesNo('Is this already used in production or by real users?', false);
      sensitive = await prompts.yesNo('Does it handle sensitive/personal data, auth, payments, secrets, or other security-critical information?', false);
    }

    if (!existsSync(stackPath)) {
      if (project.kind === 'greenfield' && !project.stacks.length) {
        stackDecision = await prompts.yesNo('Has the technology stack already been decided?', false);
        if (stackDecision) {
          const stack = await prompts.text('Briefly describe the decided stack', '');
          if (stack) project.stacks = stack.split(',').map((item) => item.trim()).filter(Boolean);
        }
      } else if (project.stacks.length && !yes) {
        const correct = await prompts.yesNo(`I detected ${project.stacks.join(', ')}. Is that materially correct?`, true);
        if (!correct) {
          const correction = await prompts.text('Enter a short corrected stack summary', project.stacks.join(', '));
          project.stacks = correction.split(',').map((item) => item.trim()).filter(Boolean);
        }
      }
    }

    const selectedChecks = [];
    if (!existsSync(checksPath)) {
      for (const candidate of project.checkCandidates) {
        const use = yes ? candidate.required : await prompts.yesNo(`Use '${candidate.command.join(' ')}' as ${candidate.required ? 'a required' : 'an optional'} verification check?`, candidate.required);
        if (use) selectedChecks.push(candidate);
      }
    }

    const files = [
      [briefPath, briefContent({ project, purpose, users, production, sensitive }), 'aidlc-docs/project/brief.md'],
      [architecturePath, architectureContent(project), 'aidlc-docs/project/architecture.md'],
      [stackPath, techStackContent(project, stackDecision), 'aidlc-docs/project/tech-stack.md'],
      [testingPath, testingContent(selectedChecks), 'aidlc-docs/project/testing.md'],
      [checksPath, checksConfig(selectedChecks), 'aidlc-docs/project/checks.json'],
    ];

    for (const [path, content, label] of files) {
      if (await writeIfMissing(path, content)) created.push(label);
      else preserved.push(label);
    }

    readChecksConfig(root);
    const engine = new AidlcEngine(root);
    const report = engine.doctor(false);
    const health = summarizeDoctor(report);

    output.write(`\nSetup summary\n`);
    output.write(`Created/repaired: ${created.length ? created.join(', ') : 'nothing (existing setup preserved)'}\n`);
    if (preserved.length) output.write(`Preserved: ${preserved.join(', ')}\n`);
    output.write(`Doctor: ${report.ok ? 'healthy' : health}\n`);
    if (existsSync(join(root, 'aidlc-docs', 'aidlc-state.json'))) output.write('Existing workflow state was preserved; init does not create, advance, or reset a change.\n');
    output.write(`\nNext step:\n  Tell your coding agent: \"Use AI-DLC Slim to implement <your change>.\"\n`);

    if (!report.ok) process.exitCode = 1;
    return { root, project, created, preserved, doctor: report };
  } finally {
    prompts.close();
  }
}
