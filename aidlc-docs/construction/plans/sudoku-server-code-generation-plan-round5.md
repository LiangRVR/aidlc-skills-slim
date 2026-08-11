# Code Generation Plan — unit: sudoku-server（Round 5，竞速对抗模式）

> 本文件是 unit 2 Code Generation 的**唯一事实来源**；执行时严格按步骤顺序，完成即勾 [x]。

## Unit Context
- **故事追溯**：US-31~US-39 服务端部分（计分/连击/undo-redo 结算/笔记私有/归属/终局/forfeit）
- **依赖**：unit 1 shared-protocol ✔（v2 类型已实现并测试）
- **接口/契约**：`component-methods-round5.md`（ScoreEngine 契约、GameRoom/RoomManager 修订）；FD v2 四份制品（BR-S-01~31、SP-1~6、game-logic §1~14）
- **拥有实体**：ScoreEngine（S6 新增）/ GameRoom v2 / MoveRecord v2 / notesByPlayer / finalize
- **Brownfield 规则**：除 score-engine.ts 外均就地修改，禁止副本文件

## 既有文件盘点
| 文件 | 现状 | v2 处置 |
|---|---|---|
| `server/score-engine.ts` | 不存在 | **新建**（S6 纯模块） |
| `server/game-room.ts` | v1 合作制（493 行：mistakes/spectating/playerLost/gameWon/共享笔记/互擦） | 就地重写为 v2 |
| `server/room-manager.ts` | 匹配/回收（84 行） | 预期不变（selectRoom 纯函数 SP-1 语义不变；forfeit 决策放 GameRoom.removePlayer，因其持有 status/hadTwoPlayers） |
| `server/message-router.ts` / `connection-manager.ts` / `index.ts` | v1 | 预期不变（join/op/leave 分发与连接管理语义同 v1；如有微调仅限类型适配） |
| `tests/server-generators.ts` | v1（82 行） | 就地更新（v2 消息/操作脚本生成器、录制辅助适配 v2） |
| `tests/game-room.test.ts` | v1（193 行） | 就地重写（18 场景表适用子集） |
| `tests/game-room.pbt.test.ts` | v1（150 行） | 就地重写（SP-1~5 v2） |
| `tests/score-engine.test.ts` | 不存在 | **新建**（SP-6 属性 + 计分 example） |

## 执行步骤

- [x] **Step 1: 新建 `server/score-engine.ts`（S6）**
  - `ScoreState { score, combo }`；纯函数：`applyFillCorrect`（combo+1；delta=100+(combo'>=3?20:0)）、`applyFillWrong`（delta=-min(100,score)；combo=0）、`applyUndoFill(recordedDelta)`（正→-min(d,score)；负→0；combo=0）、`applyRedoFill`（正→+d；负→0；combo=0）、`applyErase(erasedCellCorrect)`（correct→-min(100,score)；否则 0；combo=0）
  - 每个函数返回 `{ next: ScoreState; delta: number }`；score 下限 0（BR-S-24~28）
- [x] **Step 2: 就地重写 `server/game-room.ts` 为 v2**
  - 状态：去 mistakes/spectating；`scores: Map<PlayerId, ScoreState>`；`notesByPlayer: Map<PlayerId, Map<number, Set<number>>>`；`hadTwoPlayers: boolean`；棋盘 CellEntry 无 notes（笔记全部外置）
  - fill（BR-S-06/21/24/25）：given 拒绝；同值 no-op；覆盖权限（空格/自己/任意 wrong 格，覆盖转移归属；对方正确格 not-overwritable）；solution 裁决；correct → applyFillCorrect + 双方笔记代清 + completedUnits + isComplete → finalize('completed')；wrong → applyFillWrong
  - erase（BR-S-09/28）：仅归属者；applyErase(erasedCellCorrect=!wrong)
  - note（BR-S-11/26）：仅 notesByPlayer[playerId] toggle；opApplied 仅回发发起者（含 notes 全集）；不经 ScoreEngine
  - undo/redo（BR-S-10/27/28）：过期记录语义保留；scoreDelta 结算；笔记恢复仅自己且仍为空格；combo 清零
  - 个性化 opApplied 装配（game-logic §10）：公共部分全房相同，clearedNotes 各自归属者副本
  - finalize（BR-S-29~31）：completed 比分（平分 winnerId=null）/forfeit 在局者胜 → 广播 gameOver → status='won'；opApplied 先于 gameOver（BR-S-20）
  - removePlayer（BR-S-23）：playing && hadTwoPlayers → finalize('forfeit') 后再移除；won → 广播 playerLeft；单人房 → 直接移除（回收由 manager 负责）
  - snapshotFor：含 yourNotes 与 players[].score（PlayerInfo v2）
- [x] **Step 3: `room-manager.ts` / `message-router.ts` / `connection-manager.ts` / `index.ts` 适配检查**
  - 仅做 v2 类型适配所必需的最小改动；预期零逻辑变更（若有逻辑变更须偏离说明）
- [x] **Step 4: 更新 `tests/server-generators.ts`**
  - v2 消息类型适配（PlayerInfo/gameOver/opApplied 出席矩阵）；arbOpScript/arbTwoPlayerScript/arbRoomPool 语义保留；录制辅助（opsOf 等）适配 v2
- [x] **Step 5: 新建 `tests/score-engine.test.ts`**
  - SP-6 五条属性（下限/fill correct 公式/combo 清零/undo-redo 对称/note 无影响）+ example：连击 120、下限截断、错填不返还
- [x] **Step 6: 重写 `tests/game-room.test.ts`（example-based）**
  - 覆盖 FD v2 场景表服务端适用子集（18 场景中除前端展示项外全部）：单人完局、双人竞速、平分判和、连击不被打断、扣分下限、错填覆盖转移、擦对方格拒绝、覆盖对方正确格拒绝、笔记私有、笔记代清双方、undo 错填不返还、undo/redo 正确返还、离开判胜、won 后操作、单人房离开回收、非法帧（router 层）、undo/redo 空栈、fill 预填格
- [x] **Step 7: 重写 `tests/game-room.pbt.test.ts`（SP-1~5 v2）**
  - SP-1 匹配 Oracle（selectRoom 纯函数，沿用）；SP-2 状态机不变量（score≥0 等）；SP-3 广播完整性与个性化（note 仅发起者、clearedNotes 归属者副本、opApplied→gameOver 顺序）；SP-4 undo 隔离（棋盘+笔记+ScoreState 三维）；SP-5 forfeit 与回收
- [x] **Step 8: 运行测试并修复至全绿**
  - `npx vitest run tests/score-engine.test.ts tests/game-room.test.ts tests/game-room.pbt.test.ts tests/protocol.test.ts tests/protocol.pbt.test.ts`
  - 失败只允许改 unit 2 范围内文件
  - 备注：client 侧（src/net、tests/online-game-controller*、tests/client-generators.ts）仍引用 v1 语义，tsc 全量与其测试失败属预期，归 unit 3
- [x] **Step 9: 生成代码摘要文档**
  - `aidlc-docs/construction/sudoku-server/code/code-summary-round5.md`

## 验证命令
```
npx vitest run tests/score-engine.test.ts tests/game-room.test.ts tests/game-room.pbt.test.ts tests/protocol.test.ts tests/protocol.pbt.test.ts
```
