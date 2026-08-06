# Domain Entities - unit: sudoku-game

## Cell（格子）

| 属性 | 类型 | 说明 |
|---|---|---|
| index | 0-80 | 行优先序号（row = index div 9, col = index mod 9） |
| value | 0-9 | 0 = 空；1-9 正式值 |
| isGiven | boolean | 预填格标记（含提示锁定格） |
| notes | Set<number> | 候选数集合（仅空格有效） |
| isError | boolean | 当前值与 solution 不符 |

## Puzzle（谜题）

| 属性 | 类型 | 说明 |
|---|---|---|
| givens | CellValue[81] | 初始布局，0 为挖空 |
| solution | CellValue[81] | 唯一完整解 |

## GameState（单局游戏）

| 属性 | 类型 | 说明 |
|---|---|---|
| puzzle | Puzzle | 本局谜题 |
| difficulty | Difficulty | easy / medium / hard |
| cells | Cell[81] | 棋盘状态 |
| selectedIndex | 0-80 或 null | 当前选中格 |
| noteMode | boolean | 笔记模式开关 |
| mistakes | 0-3 | 错误计数 |
| status | playing / won / lost | 状态机 |
| elapsedSeconds | number | 累计用时（暂停不计） |
| undoStack | Move[] | 撤销栈 |
| redoStack | Move[] | 重做栈 |

## Move（操作记录）

| 属性 | 类型 | 说明 |
|---|---|---|
| type | fill / erase / note / hint | 操作类型 |
| index | 0-80 | 目标格 |
| prevValue / nextValue | 0-9 | 值快照 |
| prevNotes / nextNotes | number[] | 该格笔记快照 |
| clearedPeerNotes | { index, value }[] | 被自动清除的关联笔记快照（BR-07） |
| mistakesDelta | number | 错误计数变化量 |

## GameSave（存档）

与 GameState 对应的可序列化结构（见 component-methods.md 共享类型），含 `version` 字段用于结构校验与降级（BR-22、BR-23）。

## Difficulty（枚举）

- `easy`：预填 40-45
- `medium`：预填 32-39
- `hard`：预填 26-31

## 实体关系

```text
GameState 1---81 Cell        （棋盘由格子组成）
GameState 1---1  Puzzle      （本局谜题与解）
GameState 1---*  Move        （操作历史，undo/redo 栈）
GameState 1---0..1 GameSave  （可序列化为存档；GameSave 可反序列化恢复 GameState）
Puzzle   1---1   Difficulty  （挖空策略由难度决定）
```
