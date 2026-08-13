# API Documentation — Sudoku Web Game

## REST APIs

**There are no REST APIs, GraphQL endpoints, or any external network interfaces.** The application is a frontend-only static SPA. All data is stored client-side in `localStorage`.

---

## Internal APIs — Core Module Public Method Signatures

All methods are synchronous and run entirely in the browser's main thread.

### GameController

**Source**: `src/core/game-controller.ts`

| Method | Signature | Return | Description |
|--------|-----------|--------|-------------|
| `constructor` | `(bus?: EventBus)` | — | Creates controller with optional external EventBus |
| `getState` | `(): GameState \| null` | Current game state or null if no active game | Accessor for the current game state |
| `getBus` | `(): EventBus` | The controller's EventBus instance | Accessor for the event bus |
| `newGame` | `(difficulty: Difficulty): void` | — | Clears old save, generates a new puzzle, creates GameState, wires clear-save handler |
| `continueGame` | `(save: GameSave): void` | — | Restores GameState from a saved snapshot, wires clear-save handler |
| `inputDigit` | `(value: CellValue): { index: CellIndex; result: 'correct' \| 'wrong' \| 'ignored' \| 'note' } \| null` | Result object or null if no active game/not playing/no selection/invalid value | Routes input to fill (normal mode) or toggleNote (note mode); triggers auto-save on non-ignored results |
| `erase` | `(): void` | — | Erases the selected cell if user-filled; auto-saves if successful |
| `undo` | `(): void` | — | Undoes last move if stack non-empty; auto-saves |
| `redo` | `(): void` | — | Redoes last undone move if stack non-empty; auto-saves |
| `hint` | `(): void` | — | Applies a hint if an empty cell exists; auto-saves |
| `reset` | `(): void` | — | Resets game to initial puzzle state; resets tickSinceSave |
| `toggleNoteMode` | `(): void` | — | Toggles note mode on/off |
| `selectCell` | `(index: CellIndex \| null): void` | — | Selects or deselects a cell |
| `tick` | `(seconds: number): void` | — | Advances timer; triggers auto-save every 5 accumulated seconds (only when playing) |

### GameState

**Source**: `src/core/game-state.ts`

| Method | Signature | Return | Description |
|--------|-----------|--------|-------------|
| `constructor` | `(puzzle: Puzzle, difficulty: Difficulty, bus: EventBus)` | — | Initializes board from givens, empty notes, isGiven flags; status = 'playing' |
| `setClearSaveHandler` | `(handler: () => void): void` | — | Registers callback invoked on win, loss, or reset |
| `getPuzzle` | `(): Puzzle` | Puzzle object {givens, solution} | The puzzle for this game |
| `getDifficulty` | `(): Difficulty` | 'easy' \| 'medium' \| 'hard' \| 'expert' | Difficulty level of this game |
| `getBoard` | `(): CellValue[]` | Copy of 81-element board array (0=empty, 1-9=filled) | Current board state |
| `getNotes` | `(): number[][]` | 81-element array of sorted note arrays | Per-cell candidate notes |
| `getNoteMode` | `(): boolean` | true if note mode is active | Current input mode |
| `getSelectedIndex` | `(): CellIndex \| null` | 0-80 or null | Currently selected cell index |
| `getMistakes` | `(): number` | 0-3 | Current mistake count |
| `getElapsedSeconds` | `(): number` | Non-negative integer | Accumulated play time in seconds |
| `getStatus` | `(): GameStatus` | 'playing' \| 'won' \| 'lost' | Current game status |
| `isGivenCell` | `(index: CellIndex): boolean` | true if given or hint-locked | Whether cell is immutable |
| `canUndo` | `(): boolean` | true if playing and undo stack non-empty | Undo availability |
| `canRedo` | `(): boolean` | true if playing and redo stack non-empty | Redo availability |
| `selectCell` | `(index: CellIndex \| null): void` | — | Sets selection, emits `state:changed` |
| `fill` | `(index: CellIndex, value: CellValue): 'correct' \| 'wrong' \| 'ignored'` | Result classification | Fills a cell; checks correctness, updates mistakes, auto-clears peer notes, emits events, checks win/loss |
| `erase` | `(index: CellIndex): boolean` | true if erased | Clears a user-filled cell |
| `toggleNote` | `(index: CellIndex, value: CellValue): boolean` | true if changed | Toggles a candidate note on an empty cell |
| `setNoteMode` | `(on: boolean): void` | — | Sets note mode; emits `note-mode:changed` if changed |
| `undo` | `(): boolean` | true if undone | Pops and reverses last move from undo stack |
| `redo` | `(): boolean` | true if redone | Pops and re-applies last move from redo stack |
| `applyHint` | `(): { index: CellIndex; value: CellValue } \| null` | Hint info or null if no empty cell | Fills the first empty cell with its solution and locks it |
| `reset` | `(): void` | — | Restores initial puzzle state, clears all history/notes/mistakes/timer; invokes clearSaveHandler |
| `tick` | `(seconds: number): void` | — | Accumulates time if playing; emits `timer:tick` with new total |
| `toSave` | `(): GameSave` | Serialized game snapshot | Creates a save data object of current state |
| `fromSave` | `(save: GameSave, bus: EventBus): GameState` | Restored GameState instance | Static factory: reconstructs GameState from a save |

### SudokuGenerator

**Source**: `shared/sudoku-generator.ts`（v2.2 迁移） (all methods static)

| Method | Signature | Return | Description |
|--------|-----------|--------|-------------|
| `generate` | `(difficulty: Difficulty): Puzzle` | Puzzle {givens, solution} | Generates a unique-solution puzzle at the given difficulty. Retries up to 200 times if givens count falls outside the target range. |

### SudokuSolver

**Source**: `shared/sudoku-solver.ts`（v2.2 迁移） (all methods static)

| Method | Signature | Return | Description |
|--------|-----------|--------|-------------|
| `solve` | `(grid: CellValue[]): CellValue[] \| null` | Full 81-cell solution or null if unsolvable | MRV backtracking solver |
| `countSolutions` | `(grid: CellValue[], limit: number): number` | Number of solutions found (capped at limit) | Counts solutions; used with limit=2 for uniqueness checks |
| `findHint` | `(board: CellValue[], solution: CellValue[]): { index: CellIndex; value: CellValue } \| null` | First empty cell + its solution value, or null | Finds the first empty cell index-wise and returns its correct value |

### RuleValidator

**Source**: `shared/rule-validator.ts`（v2.2 迁移） (all methods static)

| Method | Signature | Return | Description |
|--------|-----------|--------|-------------|
| `conflictsAt` | `(board: CellValue[], index: CellIndex): CellIndex[]` | Array of conflicting peer indices (empty if cell is 0 or no conflicts) | Finds all cells in the same row/col/box with the same non-zero value |
| `isCorrect` | `(solution: CellValue[], index: CellIndex, value: CellValue): boolean` | true if value matches solution at index | Single-cell correctness check |
| `isComplete` | `(board: CellValue[], solution: CellValue[]): boolean` | true if all 81 cells match solution | Full board completion check |

### SaveManager

**Source**: `src/persistence/save-manager.ts`

| Method | Signature | Return | Description |
|--------|-----------|--------|-------------|
| `save` | `(data: GameSave): void` | — | Serializes to JSON and writes to localStorage key `sudoku-game-save`. Silently catches errors. |
| `load` | `(): GameSave \| null` | Parsed and validated GameSave, or null | Reads from localStorage, parses JSON, validates version (must equal SAVE_VERSION=1), board structure, notes, moves, mistakes (0-3), status/difficulty enums. Any failure returns null. |
| `hasSave` | `(): boolean` | true if a save key exists in localStorage | Checks for save existence without parsing |
| `clear` | `(): void` | — | Removes the save key from localStorage. Silently catches errors. |

### EventBus

**Source**: `src/core/event-bus.ts`

| Method | Signature | Return | Description |
|--------|-----------|--------|-------------|
| `on` | `(event: string, handler: (payload?: unknown) => void): void` | — | Registers an event handler |
| `off` | `(event: string, handler: (payload?: unknown) => void): void` | — | Removes an event handler |
| `emit` | `(event: string, payload?: unknown): void` | — | Calls all registered handlers for the event with the payload |

**Domain events and their payloads:**

| Event | Payload | Emitted By |
|-------|---------|------------|
| `state:changed` | none | GameState: selectCell, fill, erase, toggleNote, reset, afterBoardChange |
| `conflict:updated` | `CellIndex[]` (conflicting peer indices after last change) | GameState: afterBoardChange |
| `mistakes:changed` | `number` (current mistake count) | GameState: fill (on wrong), reset (emits 0), undo/redo (if mistakes change) |
| `timer:tick` | `number` (cumulative elapsed seconds) | GameState: tick |
| `note-mode:changed` | `boolean` (new note mode state) | GameState: setNoteMode |
| `game:won` | none | GameState: fill (when complete), applyHint (when complete) |
| `game:lost` | none | GameState: fill (when mistakes >= MAX_MISTAKES) |

---

## Data Models

### CellValue
- Type: `number` (0-9, where 0 = empty, 1-9 = filled digit)

### CellIndex
- Type: `number` (0-80, row-major: `index = row * 9 + col`)

### Difficulty
- Type: `'easy' | 'medium' | 'hard' | 'expert'`
- Validation: must be one of the four literal strings

### GameStatus
- Type: `'playing' | 'won' | 'lost'`

### Puzzle

| Field | Type | Validation |
|-------|------|------------|
| `givens` | `CellValue[81]` | 81 elements; 0 for empty cells; non-zero must be consistent with solution |
| `solution` | `CellValue[81]` | 81 elements; all 1-9; must form a valid complete Sudoku grid (rows, cols, boxes each contain 1-9) |

### Move

| Field | Type | Validation |
|-------|------|------------|
| `type` | `MoveType` = `'fill' \| 'erase' \| 'note' \| 'hint'` | Must be one of the four string literals |
| `index` | `CellIndex` | 0-80 integer |
| `prevValue` | `CellValue` | 0-9 integer |
| `nextValue` | `CellValue` | 0-9 integer |
| `prevNotes` | `number[]` | Array of numbers 1-9 (snapshot of cell's notes before operation) |
| `nextNotes` | `number[]` | Array of numbers 1-9 (snapshot of cell's notes after operation) |
| `clearedPeerNotes` | `{ index: CellIndex; value: CellValue }[]` | Array of {index, value} for peer notes that were automatically cleared |
| `mistakesDelta` | `number` | 0 or 1 (0 for correct fill/erase/note/hint; 1 for wrong fill) |

### GameSave

| Field | Type | Validation |
|-------|------|------------|
| `version` | `number` | Must equal `SAVE_VERSION` (currently 1) |
| `difficulty` | `Difficulty` | Must be one of the four string literals |
| `givens` | `CellValue[81]` | 81 elements, each 0-9 |
| `solution` | `CellValue[81]` | 81 elements, each 0-9 |
| `board` | `CellValue[81]` | 81 elements, each 0-9 (current board state) |
| `notes` | `number[][]` | 81 elements, each an array of numbers 1-9 (no duplicates in practice) |
| `mistakes` | `number` | Integer 0-3 |
| `elapsedSeconds` | `number` | Finite, >= 0 |
| `history` | `Move[]` | Array of valid Move objects (the undo stack) |
| `status` | `GameStatus` | One of 'playing', 'won', 'lost' |

### MoveType
- Type: `'fill' | 'erase' | 'note' | 'hint'`
