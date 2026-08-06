# Business Logic Summary - sudoku-game（核心业务逻辑实现摘要）

> 对应 Code Generation Plan Step 1-10：项目脚手架 + 纯 TypeScript 核心逻辑 + 单元测试。
> 本文档描述 `src/core/` 与 `src/persistence/` 的实现；Phaser UI/场景（Step 11-12）不在此范围。

## 1. 文件清单与职责

| 文件 | 职责 |
|---|---|
| `src/core/types.ts` | 共享类型契约（Difficulty / CellValue / CellIndex / GameStatus / Puzzle / Move / GameSave）、领域事件名常量 `EVENTS`、`MAX_MISTAKES=3`、`SAVE_VERSION=1` |
| `src/core/event-bus.ts` | 发布/订阅总线（on / off / emit），核心 → 表现层唯一通信通道 |
| `src/core/sudoku-solver.ts` | `solve`（MRV 回溯）、`countSolutions(grid, limit)`（达 limit 短路）、`findHint` |
| `src/core/sudoku-generator.ts` | 完整解随机生成 → 对称挖空 → 唯一性校验，产出唯一解谜题 |
| `src/core/rule-validator.ts` | `conflictsAt` / `isCorrect` / `isComplete` |
| `src/core/game-state.ts` | 单局状态机：fill / erase / toggleNote / undo / redo / applyHint / reset / tick / toSave / fromSave |
| `src/core/game-controller.ts` | 编排服务：newGame / continueGame / inputDigit / 自动存档 / 存档清除 |
| `src/persistence/save-manager.ts` | localStorage 存档（固定 key `sudoku-game-save`），版本 + 结构校验，损坏降级 |
| `tests/*.test.ts` | 5 个测试文件，58 个用例（见 §8） |

约束遵守：`core/` 与 `persistence/` 零 Phaser 依赖，可独立于 UI 运行与测试；`GameController` 是 core → persistence 的唯一入口（与 component-dependency.md 一致）。

## 2. 求解器（SudokuSolver）

- **`solve(grid)`**：回溯 + MRV 启发。每层扫描全部空格，选取候选数最少的一格尝试；某格候选数为 0 立即剪枝返回 false（失败）；候选数为 1 时直接确定（短路）。返回完整解数组或 null。
- **`countSolutions(grid, limit)`**：同样的 MRV 回溯，累计解数量，达到 `limit` 立即短路返回（供唯一性校验与生成器使用，`limit=2`）。
- **`findHint(board, solution)`**：按索引升序返回第一个空格的 `{ index, value: solution[index] }`；无空格返回 null（BR-16）。

## 3. 谜题生成器（SudokuGenerator）

1. **完整解**：从空盘出发随机化回溯（候选数洗牌后尝试），得到随机解。
2. **目标预填数**：在难度区间内随机取 `target`（easy 40-45 / medium 32-39 / hard 26-31）。
3. **对称挖空**：81 格索引随机排序后遍历，按中心对称配对（i 与 80-i）同时挖空；挖后调用 `countSolutions(givens, 2) === 1` 校验唯一性（BR-01），不唯一则回退该对。
4. **奇偶性保证（关键设计）**：配对挖空使预填数按 81-2k 递减（恒为奇数），而三档难度区间均为 `[偶数, 奇数]`，因此配对挖空终止时预填数必然落在区间内（BR-02 恒成立）。挖空仅在「当前数 - 挖格数 ≥ target」时进行；中心格（索引 40，单格挖）仅当其恰好使预填数等于 target 时挖空，否则跳过，避免破坏奇偶性导致越界。
5. **终止**：预填数降至 target（或 target+1，偶数目标时），或全部格子遍历完毕（接受当前结果）。

## 4. 规则校验（RuleValidator）

- `conflictsAt(board, index)`：返回与指定格同行/列/宫且同值的其它格子索引（空格返回空数组，不含自身）。
- `isCorrect(solution, index, value)`：与解比对。
- `isComplete(board, solution)`：81 格全部与解一致。

## 5. 游戏状态机（GameState）

### 状态流转
```
newGame/continueGame → playing →（填满全对）→ won
playing →（mistakes 达 3）→ lost（棋盘锁定）
playing → reset → playing（恢复初始谜题，计时/错误清零，清空历史）
won/lost 后一切填数/笔记/撤销/重做返回 'ignored'/false
```

### fill（BR-04/05/06/07/10/12/13/14）
1. 前置校验：非 playing、预填格、值 0、与当前值相同 → `'ignored'`。
2. 记录 Move（含该格旧值/旧笔记、被自动清除的关联笔记、mistakes 增量），清空重做栈。
3. 写入新值并清空该格笔记；错误值**保留**在格内（标红由 UI 呈现），mistakes+1 并 emit `mistakes:changed`；正确值自动清除同行/列/宫其它空格中该值的候选笔记（BR-07），清除项记入 Move 快照。
4. 每次 fill 后 emit `state:changed` 与 `conflict:updated`；达 3 次错误 → `lost` + `game:lost`；填满全对 → `won` + `game:won`（BR-14：填满但有错不判胜）。

### 笔记（BR-09/10/11）
- 切换语义：`toggleNote` 标注/取消候选数，不写正式值、不改错误计数、不触发冲突判定。
- 仅在空格上有效（BR-10），预填格拒绝（BR-03）；`setNoteMode` 变化时 emit `note-mode:changed`。

### 撤销/重做（BR-17~BR-20）
- Move 快照：type / index / prevValue / nextValue / prevNotes / nextNotes / clearedPeerNotes / mistakesDelta。
- `undo` 逆向恢复（值、本格笔记、被清关联笔记、mistakes），压入重做栈；`redo` 正向重放。
- 提示格（hint）撤销后解除锁定，重做后重新锁定（isGiven 随 hint Move 恢复）。
- 任何新操作清空重做栈；栈空时返回 false；reset 清空全部历史。

### 提示（BR-15/16）
- `applyHint` 调用 `findHint` 填入解值并锁定该格（等同预填），不计数错误；无空格返回 null；提示填满 → won。

### 计时与存档清除回调（BR-21/24）
- `tick(seconds)` 仅 playing 态累计并 emit `timer:tick`（载荷为累计秒数）；won/lost 后停止。
- `reset()` 恢复初始谜题、清零错误/计时、清空历史，并触发外部存档清除回调（独立触发点，reset 后 status 仍为 playing）。
- `setClearSaveHandler` 注册回调；won/lost 与 reset 时调用（BR-24）。

### 序列化（BR-22）
- `toSave()`：version / difficulty / givens / solution / board / notes / mistakes / elapsedSeconds / history（撤销栈）/ status。
- `static fromSave(save, bus)`：还原全部状态（含 status=lost/won），历史栈深度克隆。

## 6. 编排服务（GameController）

- `newGame(difficulty)`：清空旧存档（BR-24）→ 生成谜题 → 创建 GameState；`continueGame(save)`：从存档恢复。
- `inputDigit(value)`：按当前笔记模式分发 `toggleNote` / `fill`（仅选中格、playing 态、值 1-9）。
- `erase/undo/redo/hint/reset/toggleNoteMode/selectCell/tick`：转发至 GameState。
- **自动存档**：每次有效操作（fill/erase/note/undo/redo/hint）后 + `tick` 每累计 5 秒（仅 playing 态）；won/lost/reset/newGame 均不残留存档。

## 7. 持久化（SaveManager）

- localStorage 固定 key `sudoku-game-save`；`save` / `load` / `hasSave` / `clear`。
- `load` 依次做 JSON 解析、version 匹配（`SAVE_VERSION`）、结构校验（81 格棋盘、notes 81×候选数、Move 字段、mistakes 0-3、status/difficulty 枚举），任何失败返回 null（BR-23 降级），不抛出异常。

## 8. 测试覆盖（58 用例，5 文件）

| 文件 | 用例数 | 覆盖点 |
|---|---|---|
| `sudoku-solver.test.ts` | 9 | 空盘求解、已知谜题求解（保持预填）、不可解返回 null（构造即时矛盾实例）、countSolutions 短路/唯一/无解、findHint 空盘/null |
| `sudoku-generator.test.ts` | 8 | 三档难度唯一解（BR-01）、三档预填数范围（BR-02）、解与预填一致、对称挖空（i 与 80-i） |
| `rule-validator.test.ts` | 8 | 行/列/宫冲突、空格无冲突、不含自身、isCorrect/isComplete |
| `game-state.test.ts` | 24 | fill 正/误/ignored、冲突事件载荷、笔记切换与自动清除、撤销重做快照恢复（含 mistakes 与关联笔记）、新操作清重做栈、3 次错误锁定、胜利判定与计时停止、erase 仅限用户格、hint 锁定/撤销解锁/无空格 null、reset、存档清除回调（won/lost/reset）、tick、toSave/fromSave 往返（含 lost 态） |
| `save-manager.test.ts` | 9 | 正常往返、无存档、损坏 JSON / 版本不符 / 结构不符 / 缺字段 / mistakes 越界 → null、clear、GameState.toSave 往返 |

## 9. 事件清单（载荷约定）

| 事件 | 载荷 |
|---|---|
| `state:changed` | 无 |
| `conflict:updated` | `CellIndex[]`（受变更格的行/列/宫同值冲突格索引） |
| `mistakes:changed` | `number`（当前错误数） |
| `timer:tick` | `number`（累计秒数） |
| `note-mode:changed` | `boolean` |
| `game:won` / `game:lost` | 无 |

## 10. 关键实现决策（假设记录）

1. `fill` 填入与当前值相同返回 `'ignored'`（不产生 Move，避免无意义撤销项与存档）。
2. 撤销错误填入只回滚 mistakes，不额外扣分；错误数只增不减。
3. `conflict:updated` 载荷语义为「最后变更格的冲突索引数组」，UI 可据此高亮。
4. 提示格撤销后解除锁定（BR-15 的锁定可通过 undo 回退，redo 恢复）。
5. 生成器中心格仅在恰好命中目标预填数时挖空，保证预填数恒在难度区间内且对称性完好。
