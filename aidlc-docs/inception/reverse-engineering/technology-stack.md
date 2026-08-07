# Technology Stack — Sudoku Web Game

## Languages

| Language | Version | Usage |
|----------|---------|-------|
| TypeScript | ^5.5.4 (compiled to ES2020) | All application code (src/), test code (tests/), and build config (vite.config.ts) |
| HTML | 5 | Single HTML file hosting the Phaser canvas |
| CSS | 3 (inline in index.html) | Minimal: body margin reset, centering, background color |

## Frameworks & Libraries

| Framework/Library | Version | Purpose |
|-------------------|---------|---------|
| Phaser | ^3.85.0 | 2D game framework: canvas/WebGL rendering, scene management, input handling, tweens, particle system, camera effects |
| Vite | ^5.4.8 | Development server (HMR), production bundler, TypeScript transpilation |

## Build Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | ^5.4.8 | Dev server (port 5173, host 127.0.0.1), production build (output: dist/) |
| tsc | (bundled with TypeScript) | Type checking (`noEmit: true` — Vite handles actual transpilation) |
| npm | (bundled with Node.js) | Package manager, script runner |

## Testing Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | ^2.1.8 | Unit test runner with assertion library (describe/it/expect); compatible with Vite's transform pipeline |

## Runtime Environment

- **Target**: Modern browsers (ES2020, DOM API, localStorage, WebGL/Canvas)
- **Dev Server**: `127.0.0.1:5173` (Vite)
- **Production**: Static files served from any HTTP server (no server-side requirements)

## Configuration Notes

- TypeScript strict mode enabled (`strict: true`)
- Additional compiler checks: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitReturns`
- No ESLint or Prettier configuration present
- No CSS preprocessors or PostCSS
- No environment variable files (.env)
