#!/usr/bin/env node
import { AidlcEngine } from './engine.js';
import { EngineError } from './errors.js';
import { assertRisk } from './validation.js';
import type { InitInput, LifecycleEvent, WorkflowFlags } from './types.js';

interface ParsedArgs {
  command?: string;
  positional: string[];
  options: Map<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { command: argv[0], positional: [], options: new Map() };
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        parsed.options.set(key, next);
        i += 1;
      } else {
        parsed.options.set(key, true);
      }
    } else {
      parsed.positional.push(token);
    }
  }
  return parsed;
}

function optionString(args: ParsedArgs, name: string, required = false): string | undefined {
  const value = args.options.get(name);
  if (typeof value === 'string') return value;
  if (required) throw new EngineError('USAGE', `Missing --${name}`);
  return undefined;
}

function optionBoolean(args: ParsedArgs, name: string): boolean {
  const value = args.options.get(name);
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new EngineError('USAGE', `--${name} must be true or false`);
}

function workflowOptions(args: ParsedArgs): WorkflowFlags {
  return {
    design_required: optionBoolean(args, 'design-required'),
    planning_gate_required: optionBoolean(args, 'planning-gate-required'),
    review_required: optionBoolean(args, 'review-required'),
    final_acceptance_required: optionBoolean(args, 'final-acceptance-required'),
    security_required: optionBoolean(args, 'security-required'),
  };
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage(): string {
  return `AI-DLC Slim Engine v0.1\n\nUsage:\n  aidlc-engine init --change <id> --risk <low|standard|high> --risk-rationale <text> --design-required <bool> --planning-gate-required <bool> --review-required <bool> --final-acceptance-required <bool> --security-required <bool> --request <text> [--root <dir>]\n  aidlc-engine next [--root <dir>]\n  aidlc-engine status [--root <dir>]\n  aidlc-engine reclassify --risk <low|standard|high> --risk-rationale <text> --design-required <bool> --planning-gate-required <bool> --review-required <bool> --final-acceptance-required <bool> --security-required <bool> [--root <dir>]\n  aidlc-engine report <requirements_complete|design_complete|plan_complete|implementation_complete|review_pass|review_fail|verification_complete|accept> [--root <dir>]\n  aidlc-engine approve [--root <dir>]\n  aidlc-engine continue [--root <dir>]\n  aidlc-engine request-changes [--root <dir>]\n  aidlc-engine block --reason <text> [--root <dir>]\n  aidlc-engine unblock (--reason <exact-text>|--all) [--root <dir>]\n`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || args.command === 'help' || args.options.has('help')) {
    process.stdout.write(usage());
    return;
  }

  const root = optionString(args, 'root') ?? process.cwd();
  const engine = new AidlcEngine(root);

  switch (args.command) {
    case 'init': {
      const risk = optionString(args, 'risk', true)!;
      assertRisk(risk);
      const input: InitInput = {
        active_change: optionString(args, 'change', true)!,
        risk,
        risk_rationale: optionString(args, 'risk-rationale', true)!,
        workflow: workflowOptions(args),
        request: optionString(args, 'request', true)!,
      };
      print(engine.init(input));
      break;
    }
    case 'next': print(engine.next()); break;
    case 'status': print(engine.status()); break;
    case 'reclassify': {
      const risk = optionString(args, 'risk', true)!;
      assertRisk(risk);
      print(engine.reclassify({
        risk,
        risk_rationale: optionString(args, 'risk-rationale', true)!,
        workflow: workflowOptions(args),
      }));
      break;
    }
    case 'report': {
      const event = args.positional[0] as LifecycleEvent | undefined;
      if (!event) throw new EngineError('USAGE', 'report requires an event');
      print(engine.report(event));
      break;
    }
    case 'approve': print(engine.approve()); break;
    case 'continue': print(engine.continue()); break;
    case 'request-changes': print(engine.requestChanges()); break;
    case 'block': print(engine.block(optionString(args, 'reason', true)!)); break;
    case 'unblock': print(engine.unblock(optionString(args, 'reason'), args.options.get('all') === true)); break;
    default: throw new EngineError('USAGE', `Unknown command: ${args.command}`);
  }
}

try {
  main();
} catch (error) {
  if (error instanceof EngineError) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: error.code, message: error.message, details: error.details ?? [] }, null, 2)}\n`);
    process.exitCode = error.code === 'USAGE' ? 2 : 1;
  } else {
    process.stderr.write(`${JSON.stringify({ ok: false, error: 'UNEXPECTED', message: (error as Error).message }, null, 2)}\n`);
    process.exitCode = 1;
  }
}
