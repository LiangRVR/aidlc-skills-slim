# Component Methods - 数独 Web 游戏

**说明**：仅定义方法签名与高层用途；详细业务规则在 Functional Design 阶段定义。

## 共享类型

```typescript
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type CellIndex = number;            // 0-80
type CellValue = number;            // 0=空, 1-9
type GameStatus = 'playing' | 'won' | 'lost';

interface Puzzle {
  givens: CellValue[];              // 81 格，0 表示挖空
  solution: CellValue[];            // 81 格完整解
}

interface GameSave {
  version: number;
  difficulty: Difficulty;
  givens: CellValue[];
  solution: CellValue[];
  board: CellValue[];
  notes: number[][];                // 每格候选数集合
  mistakes: number;
  elapsedSeconds: number;
  history: Move[];                  // 撤销栈（重做栈可派生）
  status: GameStatus;
}
```

## SudokuGenerator
- `generate(difficulty: Difficulty): Puzzle` — 生成唯一解谜题；难度决定挖空数量

## SudokuSolver
- `solve(grid: CellValue[]): CellValue[] | null` — 回溯求一个解
- `countSolutions(grid: CellValue[], limit: number): number` — 统计解数量（达 limit 即停止，用于唯一性校验）
- `findHint(board: CellValue[], solution: CellValue[]): { index: CellIndex; value: CellValue } | null` — 定位一个可提示的空格

## RuleValidator
- `conflictsAt(board: CellValue[], index: CellIndex): CellIndex[]` — 返回与指定格同行/列/宫且同值的格子索引
- `isCorrect(solution: CellValue[], index: CellIndex, value: CellValue): boolean` — 校验填入值是否与解一致
- `isComplete(board: CellValue[], solution: CellValue[]): boolean` — 填满且全部正确

## GameState
- `constructor(puzzle: Puzzle, difficulty: Difficulty, bus: EventBus)`
- `fill(index: CellIndex, value: CellValue): 'correct' | 'wrong' | 'ignored'` — 正式填入；更新错误计数/胜利失败判定；清除关联候选数
- `erase(index: CellIndex): boolean` — 清除用户填写数字
- `toggleNote(index: CellIndex, value: CellValue): boolean` — 笔记模式下标注/取消候选数
- `setNoteMode(on: boolean): void`
- `undo(): boolean` / `redo(): boolean`
- `applyHint(): { index: CellIndex; value: CellValue } | null` — 调用 Solver.findHint 并正式填入
- `reset(): void` — 恢复初始谜题状态
- `tick(seconds: number): void` — 累计用时
- `toSave(): GameSave` / `static fromSave(save: GameSave, bus: EventBus): GameState`

## EventBus
- `on(event: string, handler: (payload?: unknown) => void): void`
- `off(event: string, handler: (payload?: unknown) => void): void`
- `emit(event: string, payload?: unknown): void`

**领域事件**：`state:changed`、`conflict:updated`、`mistakes:changed`、`timer:tick`、`note-mode:changed`、`game:won`、`game:lost`

## GameController（core 编排服务）
- `newGame(difficulty: Difficulty): void` — 生成谜题并创建 GameState，清空旧存档
- `continueGame(save: GameSave): void` — 从存档恢复 GameState
- `inputDigit(value: CellValue): { index: CellIndex; result: 'correct' | 'wrong' | 'ignored' | 'note' } | null` — 依笔记模式分发 fill/toggleNote，返回判定结果供表现层驱动特效（第二轮调整）
- `erase(): void` / `undo(): void` / `redo(): void` / `hint(): void` / `reset(): void` / `toggleNoteMode(): void`
- `selectCell(index: CellIndex): void`
- `tick(seconds: number): void` — 转发计时并触发自动保存

## BoardView
- `render(snapshot: BoardSnapshot): void` — 依核心状态快照重绘棋盘与高亮
- `setSelected(index: CellIndex | null): void`

## NumberPad
- `onInput(handler: (value: CellValue | 'erase') => void): void`
- `setNoteMode(on: boolean): void`

## ControlBar
- `onAction(handler: (action: 'undo' | 'redo' | 'hint' | 'note' | 'new' | 'reset') => void): void`
- `render(info: { elapsedSeconds: number; mistakes: number; maxMistakes: number; canUndo: boolean; canRedo: boolean; noteMode: boolean }): void`

## SaveManager
- `save(data: GameSave): void`
- `load(): GameSave | null` — 解析失败/版本不符返回 null（降级）
- `hasSave(): boolean`
- `clear(): void`
