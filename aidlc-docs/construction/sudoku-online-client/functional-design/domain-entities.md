# Domain Entities（unit: sudoku-online-client）— Round 5 v2（竞速对抗模式）

**v2 取代 v1**：MirrorState 去 myMistakes、笔记改 ownNotes 私有镜像；新增 ScoreBoard（F8）与 GameOverData；BoardSnapshot 扩展微调（notes 数据源改为自己的私有笔记镜像）。

## 实体总览

```
GameScene ──> IGameController
                ├── LocalGameController（既有，FR-40 零改动）
                └── OnlineGameController ──> WebSocketClient ──> (ws v2) ──> sudoku-server
                        │ 持有 MirrorState v2（含 ownNotes 私有笔记镜像）
                        └──> EventBus（复用 src/core，驱动既有渲染管线）
GameScene ──> JoinToast / PlayerCountBadge / ScoreBoard(F8) / GameOverOverlay（仅联机）
BoardView <── BoardSnapshot（owners + 自己私有笔记）
```

## IGameController（接口，既有）

- `isReadOnly()`：本地恒 false；**联机 = disconnected || status==='won'**（v2 修订：不再有旁观态，BR-C-06）
- `capabilities()`：本地全 true；联机 `{hint:false, reset:false, newGame:false}`（不变）

## OnlineGameController（F2，重大修订，src/net/online-game-controller.ts）

| 字段 | 类型 | 说明 |
|---|---|---|
| bus | EventBus | 复用既有事件管线 |
| ws | WebSocketClient | 连接通道 |
| mirror | MirrorState v2 | 服务端状态投影（见下） |
| noteMode | boolean | 本地笔记模式（BR-C-04） |
| disconnected | boolean | 断线标志（→ isReadOnly） |
| gameOverData | GameOverData \| null | **v2 新增**：终局结算缓存（供 GameScene 覆盖层） |

- **方法**：IGameController 全部（输入→op 消息）+ `applyServerMessage(msg: ServerMessage v2)` + `snapshot(): BoardSnapshot` + `getGameOverData(): GameOverData | null`。
- 笔记镜像私有化：**镜像中只存在自己的笔记**（对方笔记永不存在于客户端，FR-34）。

## MirrorState（v2 修订）

| 字段 | 类型 | 来源消息 |
|---|---|---|
| cells | CellEntry[81]（**v2 无 notes**） | joined 初始化；opApplied 增量 |
| **ownNotes** | Map\<number, Set\<number\>\> | **v2 新增**：joined.yourNotes 初始化；opApplied.notes（note op 回发）/clearedNotes（代清/恢复）增量维护 |
| players | PlayerInfo[]（**v2 含 score**） | joined / playerJoined / playerLeft；**分数经 opApplied.scores 即时更新（Q2=A）** |
| startedAt | number | joined |
| status | 'playing' \| 'won' | joined / gameOver |
| you | PlayerId | joined |
| ~~myMistakes~~ | — | **v2 移除**（FR-37） |

- **不变量**：只在 applyServerMessage 内被修改；公共字段与 Snapshot + opApplied 公共部分流严格一致；ownNotes 与 yourNotes + 自己副本的 notes/clearedNotes 流严格一致（CP-1）。

## GameOverData（v2 新增）

| 字段 | 类型 | 说明 |
|---|---|---|
| winnerId | PlayerId \| null | null=平局 |
| reason | 'completed' \| 'forfeit' | 终局原因 |
| scores | Record\<PlayerId, number\> | 双方最终分 |
| elapsedSeconds | number | 用时 |

## ScoreBoard（新增 F8，src/ui/score-board.ts，FR-31 展示）

| 成员 | 说明 |
|---|---|
| update(scores: Record\<PlayerId, number\>, you: PlayerId): void | 渲染双方分数（单行双段：自己/对方，顶部中央）；随 opApplied.scores 即时更新 |
| 可见性 | 仅联机模式挂载（FR-40 本地零改动）；非交互元素 |

## WebSocketClient（F3，无契约变更）

- v2 协议类型适配（serialize/deserialize 已 unit 1 实现）；非法帧忽略语义不变。

## BoardSnapshot 扩展（src/ui/board-view.ts，v2 微调）

| 字段 | 类型 | 说明 |
|---|---|---|
| owners | (PlayerId \| null)[81] | 归属着色（BR-C-09，不变） |
| you | PlayerId \| null | 不变 |
| notes | number[][81] | **v2 数据源变更**：来自 ownNotes 私有镜像（v1 来自 CellEntry.notes 共享笔记）；本地模式数据源不变（GameState.getNotes()） |

## PlayerCountBadge / JoinToast（F6，无变更）

- Badge："在线 n/2"；joined/playerJoined/playerLeft 驱动（BR-C-10/11 沿用）。

## 与协议/服务端模型的对应（v2）

| 客户端实体 | 对应 | 说明 |
|---|---|---|
| MirrorState.cells | Snapshot.cells / opApplied.cell | 逐字段一致（无 notes） |
| MirrorState.ownNotes | Snapshot.yourNotes / opApplied.notes/clearedNotes（自己副本） | 仅自己的笔记 |
| MirrorState.players[].score | opApplied.scores / gameOver.scores | 即时更新 |
| GameOverData | gameOver payload | 一对一 |
| ScoreBoard | players[].score 渲染投影 | F8 |
