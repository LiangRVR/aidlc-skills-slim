import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { AidlcEngine } from '../engine/runtime/engine.js';
import { readChecksConfig } from '../engine/runtime/checks.js';
import { assertBootstrapPathsContained, readContainedProjectText } from './safety.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(HERE, '..');
const TEMPLATE_ROOT = join(SKILL_ROOT, 'templates');
const INSTALLATION_MANIFEST = join(HERE, 'installation.json');
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

async function readProjectJson(root, relativePath) {
  const text = await readContainedProjectText(root, relativePath);
  if (text === null) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function readProjectText(root, relativePath) {
  return readContainedProjectText(root, relativePath);
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

// Bootstrap detection is intentionally mechanical. These signals may help select
// safe repository-defined verification commands, but they are not durable project
// truth. Semantic project understanding belongs to the active parent agent.
async function detectProject(root) {
  const pkg = await readProjectJson(root, 'package.json');
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
    const pythonConfig = `${await readProjectText(root, 'pyproject.toml') ?? ''}\n${await readProjectText(root, 'requirements.txt') ?? ''}`;
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
    const text = await readProjectText(root, candidate);
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
    yesNo: async (_q, fallback = true) => fallback,
    close: () => {},
  };
  const rl = createInterface({ input, output });
  return {
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
    if (IGNORED_NAMES.has(entry.name) || entry.name === '.DS_Store') continue;
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

async function skillVersion(path) {
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  if (parsed?.schema_version !== 1 || typeof parsed.skill_version !== 'string' || !parsed.skill_version) {
    throw new Error(`Invalid AI-DLC installation manifest: ${path}`);
  }
  return parsed.skill_version;
}

async function assertCompatibleInstalledSkill(root, installedSkill) {
  if (!existsSync(installedSkill)) return;
  const entries = await readdir(installedSkill);
  if (!entries.length) return;
  const relativeManifest = '.agents/skills/aidlc-workflows/bootstrap/installation.json';
  const targetRaw = await readContainedProjectText(root, relativeManifest, 64 * 1024);
  if (targetRaw === null) {
    throw new Error('Existing AI-DLC Skill installation has no version marker. Refusing mixed-version repair; back up/remove .agents/skills/aidlc-workflows and rerun aidlc init.');
  }
  let target;
  try { target = JSON.parse(targetRaw); } catch { throw new Error('Existing AI-DLC Skill installation has an invalid version marker. Refusing mixed-version repair.'); }
  const sourceVersion = await skillVersion(INSTALLATION_MANIFEST);
  if (target?.schema_version !== 1 || target.skill_version !== sourceVersion) {
    throw new Error(`AI-DLC Skill version mismatch: project has ${target?.skill_version ?? 'unknown'}, initializer is ${sourceVersion}. Refusing mixed-version repair; back up/remove the existing Skill and rerun aidlc init.`);
  }
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

    await assertBootstrapPathsContained(root);
    const project = await detectProject(root);
    output.write(`\nAI-DLC Slim mechanical bootstrap\nProject root: ${root}\nProject type: ${project.kind}\n`);
    if (project.stacks.length) output.write(`Observed stack signals: ${project.stacks.join(', ')}\n`);
    if (project.checkCandidates.length) output.write(`Detected repository checks: ${project.checkCandidates.map((item) => item.command.join(' ')).join(', ')}\n`);

    const installedSkill = join(root, '.agents', 'skills', 'aidlc-workflows');
    if (resolve(installedSkill) !== resolve(SKILL_ROOT)) {
      await assertCompatibleInstalledSkill(root, installedSkill);
      const copied = await copyMissingTree(SKILL_ROOT, installedSkill);
      if (copied) created.push(`.agents/skills/aidlc-workflows (${copied} missing files installed)`);
      else preserved.push('.agents/skills/aidlc-workflows');
    }

    const agentsPath = join(root, 'AGENTS.md');
    if (await copyFileIfMissing(join(TEMPLATE_ROOT, 'AGENTS.md'), agentsPath)) created.push('AGENTS.md');
    else preserved.push('AGENTS.md');

    const baselineDir = join(root, 'aidlc-docs', 'project');
    await mkdir(join(baselineDir, 'decisions'), { recursive: true });

    for (const name of ['brief.md', 'architecture.md', 'tech-stack.md', 'testing.md']) {
      const target = join(baselineDir, name);
      if (await copyFileIfMissing(join(TEMPLATE_ROOT, 'project', name), target)) created.push(`aidlc-docs/project/${name}`);
      else preserved.push(`aidlc-docs/project/${name}`);
    }

    const checksPath = join(baselineDir, 'checks.json');
    if (!existsSync(checksPath)) {
      const selectedChecks = [];
      for (const candidate of project.checkCandidates) {
        const use = yes ? candidate.required : await prompts.yesNo(`Use '${candidate.command.join(' ')}' as ${candidate.required ? 'a required' : 'an optional'} verification check?`, candidate.required);
        if (use) selectedChecks.push(candidate);
      }
      if (await writeIfMissing(checksPath, checksConfig(selectedChecks))) created.push('aidlc-docs/project/checks.json');
    } else preserved.push('aidlc-docs/project/checks.json');

    readChecksConfig(root);
    const engine = new AidlcEngine(root);
    const report = engine.doctor(false);
    const health = summarizeDoctor(report);

    output.write(`\nBootstrap summary\n`);
    output.write(`Created/repaired: ${created.length ? created.join(', ') : 'nothing (existing setup preserved)'}\n`);
    if (preserved.length) output.write(`Preserved: ${preserved.join(', ')}\n`);
    output.write(`Doctor: ${report.ok ? 'healthy' : health}\n`);
    if (existsSync(join(root, 'aidlc-docs', 'aidlc-state.json'))) output.write('Existing workflow state was preserved; bootstrap does not create, advance, or reset a change.\n');
    output.write('\nSemantic project initialization is owned by the active coding agent, not this CLI.\n');
    output.write('Next step:\n  Tell your coding agent: "Initialize/reconcile the AI-DLC Slim project context from this repository, then continue with my requested work."\n');

    if (!report.ok) process.exitCode = 1;
    return { root, project, created, preserved, doctor: report };
  } finally {
    prompts.close();
  }
}
