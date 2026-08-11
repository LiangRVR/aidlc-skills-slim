# Components（Round 5 - 竞速对抗模式）

组件边界与 Round 4 一致（单 package：src/ + server/ + shared/）。本文件仅列 Round 5 变更；未列组件与 components-round4.md 相同。

## 变更组件

| 组件 | 归属 | 变更 | Round 5 职责修订 |
|---|---|---|---|
| H1 Protocol | shared/ | Major | 协议 v2：CellEntry 去 notes、PlayerInfo 去 mistakes/spectating 加 score、Snapshot 加 yourNotes、opApplied 个性化负载、gameOver 取代 gameWon/playerLost |
| S4 RoomManager | server/ | Moderate | 离开编排修订：playing 且已成局 → forfeit 终局；移除补位路径 |
| S5 GameRoom | server/ | Major | 持有 scores/notesByPlayer/hadTwoPlayers；权限矩阵重构（fill/erase/note/undo/redo）；ScoreEngine 调用；gameOver 终局；移除旁观与补位 |
| F2 OnlineGameController | src/net/ | Major | 分数镜像、私有笔记镜像、gameOver 结算缓存；移除旁观逻辑 |
| F5 GameScene | src/scenes/ | Moderate | 终局结算覆盖层（双方分数+胜负+用时）；挂载 ScoreBoard；移除旁观覆盖层 |
| F7 BoardView | src/ui/ | Minor | 笔记渲染数据源改为自己的私有笔记镜像；归属着色不变 |

## 新增组件

| 组件 | 归属 | 职责 |
|---|---|---|
| S6 ScoreEngine | server/ | 纯函数计分/连击结算模块（无状态；PBT 友好；Application Design Q3=A） |
| F8 ScoreBoard | src/ui/ | 双方分数实时显示（自己/对方），仅线上模式挂载 |

## 无变更组件

S1 ServerEntry、S2 ConnectionManager、S3 MessageRouter、F1 LocalGameController、F3 WebSocketClient、F4 MenuScene、F6 JoinToast、src/core 全部（GameState/Generator/Solver/RuleValidator——Q4=A 保证 core 零改动）。

## 职责要点

### S6 ScoreEngine
- 纯函数：`applyFillCorrect/applyFillWrong/applyUndoFill/applyRedoFill/applyErase`（**【Application Design 变更】applyOpponentCorrect 已删除：连击不被对手打断**）
- 输入 `ScoreState {score, combo}` 输出 `{next, delta}`；combo 为服务端内部状态，不下发不显示（Application Design Q2 补充）
- 计分规则常量集中于此：BASE=100、WRONG=-100、COMBO_BONUS=20、COMBO_THRESHOLD=3、FLOOR=0

### S5 GameRoom（Round 5 状态模型）
```
GameRoom
  core GameState        // 权威棋盘（不含笔记，复用 src/core，零改动）
  scores: Map<PlayerId, ScoreState>
  notesByPlayer: Map<PlayerId, Map<cellIndex, Set<digit>>>   // 私有笔记（Q4=A）
  undoStacks: Map<PlayerId, MoveRecord[]>  // MoveRecord 增加 scoreDelta 字段（FR-33 对称结算）
  hadTwoPlayers: boolean
  status: 'playing' | 'won'
```

### F8 ScoreBoard
- 数据源：opApplied.scores / Snapshot.players；两行显示（自己 n 分 / 对方 n 分）
- 不显示连击计数（Q2 补充）；终局后由结算覆盖层接管展示

## FR 覆盖（Round 5）

| 需求 | 设计落点 |
|---|---|
| FR-31 计分系统 | S6 ScoreEngine + S5 scores + H1 scores 字段 + F8 ScoreBoard |
| FR-32 连击计分 | S6（4 种清零路径，均为自己的操作；不受对方影响）；combo 服务端内部 |
| FR-33 undo/erase 分数结算 | S6 applyUndoFill/applyRedoFill/applyErase + S5 undoStacks.scoreDelta |
| FR-34 笔记私有化 | S5 notesByPlayer + H1 yourNotes/个性化 opApplied + F2 私有镜像 |
| FR-35 操作权限 | S5 applyOp 权限矩阵 |
| FR-36 竞速胜负判定 | S5 finalize('completed'/'forfeit') + H1 gameOver |
| FR-37 废除判负旁观 | S5 移除 mistakes/playerLost；F2/F5 移除旁观 UI |
| FR-38 断线与房间生命周期 | S4 removePlayer 分支（hadTwoPlayers） |
| FR-39 终局结算展示 | F5 结算覆盖层 + H1 gameOver 负载 |
| FR-40 本地模式回归 | F1/src/core 零改动 |
