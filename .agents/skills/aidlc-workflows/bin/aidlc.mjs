#!/usr/bin/env node
import { runCli } from '../bootstrap/cli.mjs';

runCli(process.argv.slice(2)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`\nAI-DLC init failed: ${message}\n`);
  process.exitCode = 1;
});
