# Component Inventory — Sudoku Web Game

## Application Packages

| Package | Type | Description |
|---------|------|-------------|
| `sudoku-game` | SPA (Single-Page Application) | Frontend-only Sudoku web game built with Phaser 3 + TypeScript + Vite. Served as static files from `dist/`. |

## Shared Packages

**None.** The application has no shared libraries, monorepo packages, or internal npm packages.

## Test Packages

| Package | Test Framework | Test Files | Test Cases |
|---------|---------------|------------|------------|
| `sudoku-game` (unit tests) | Vitest 2 | 5 | 60 |

### Test File Breakdown

| File | Test Cases | Focus Area |
|------|-----------|------------|
| `tests/sudoku-solver.test.ts` | 9 | Solver: solve (empty/known/unsolvable), countSolutions (limit/short-circuit/unique/unsolvable), findHint (normal/null) |
| `tests/sudoku-generator.test.ts` | 10 | Generator: uniqueness across 4 difficulties (4 parametrized), given-count ranges across 4 difficulties × 5 iterations (4 parametrized), solution consistency, symmetric digging |
| `tests/rule-validator.test.ts` | 8 | Validator: row/col/box conflicts, empty cell, self-exclusion, different values, isCorrect, isComplete |
| `tests/game-state.test.ts` | 24 | Game state: fill correct/wrong/ignored, conflict payload, notes, peer auto-clear, undo/redo snapshots, redo stack clearing, empty history, 3-mistake lock + loss, win detection, erase, hint apply/lock/undo/unlock/null, reset + clear handler, win/lost clear-save, tick, selection, toSave/fromSave round-trip |
| `tests/save-manager.test.ts` | 9 | Save manager: valid round-trip, no save null, corrupted JSON → null, version mismatch → null, invalid board → null, missing fields → null, mistakes out of range → null, clear, GameState.toSave round-trip |

## Totals

| Metric | Count |
|--------|-------|
| Application packages | 1 (SPA) |
| Shared/internal packages | 0 |
| Source files (src/) | 16 |
| `src/core/` files | 7 |
| `src/persistence/` files | 1 |
| `src/scenes/` files | 2 |
| `src/ui/` files | 5 |
| Entry point | 1 (`src/main.ts`) |
| Test files | 5 |
| Test cases | 60 |
| External dependencies | 1 (phaser) |
| Dev dependencies | 3 (typescript, vite, vitest) |
