# Domain Entities（unit: sudoku-server）— Round 5 v2（竞速对抗模式）

**v2 取代 v1**：RoomPlayer 去 mistakes/spectating、 GameRoom 加 scores/notesByPlayer/hadTwoPlayers、MoveRecord 加 scoreDelta；新增 ScoreEngine 纯模块（S6）。

## 实体总览

```
RoomManager 1 ── * GameRoom 1 ── * RoomPlayer
                      │               │
                      │               └── * MoveRecord（独立 undo/redo 栈，含 scoreDelta）
                      ├── 1 GameState（复用 src/core，棋盘引擎）
                      ├── 1 Solution（81 数，仅服务端持有）
                      ├── * ScoreState（每玩家 { score, combo }，经 ScoreEngine 纯函数演进）
                      └── * NotesByPlayer（每玩家 Map<cellIndex, Set<digit>>，私有笔记，Q4=A）
ConnectionManager 1 ── * Connection 1 ── 0..1 RoomPlayer
ScoreEngine（无状态纯模块，S6）── 被 GameRoom 调用
```

## RoomManager

| 字段 | 类型 | 说明 |
|---|---|---|
| rooms | Map\<RoomId, GameRoom\> | 全部存活房间 |

- **生命周期**：随进程启动创建、随进程终止销毁（纯内存，NFR-7）。
- **职责**：matchRoom（BR-S-01/02）、createRoom（BR-S-04）、reclaimRoom（BR-S-13）、removePlayer 触发 forfeit 判定（BR-S-23）。

## GameRoom（v2 修订）

| 字段 | 类型 | 说明 |
|---|---|---|
| roomId | RoomId | 创建时生成（非空字符串） |
| difficulty | Difficulty | 创建时确定，不变 |
| status | 'playing' \| 'won' | 状态机仅 playing→won 单向（BR-S-14） |
| startedAt | number（epoch ms） | 创建时刻，共享计时基准（BR-S-04） |
| players | Map\<PlayerId, RoomPlayer\> | 1-2 人 |
| board | GameState（复用 src/core） | 权威棋盘 |
| solution | readonly number[81] | 谜题解，仅服务端持有，永不下发 |
| **scores** | Map\<PlayerId, ScoreState\> | **v2 新增**：每玩家 { score, combo }；combo 服务端内部、永不下发（FR-32） |
| **notesByPlayer** | Map\<PlayerId, Map\<number, Set\<number\>\>\> | **v2 新增**：私有笔记外挂（Q4=A），core GameState 零改动；对方笔记永不下发（FR-34） |
| **hadTwoPlayers** | boolean | **v2 新增**：第二名玩家加入时置 true，用于离开判胜（BR-S-23） |
| ~~mistakes~~ | — | **v2 移除**（FR-37 废除判负旁观） |

- **生命周期**：join 未命中匹配时创建 → playing →（finalize completed/forfeit）won → 在线人数 0 销毁。
- **不变量**：`players.size ∈ [1,2]`（存活期间）；`status='won'` 后 players 只减不增；每玩家 `score ≥ 0`（FR-31 下限）。

## ScoreState / ScoreEngine（新增 S6，纯模块）

| 项 | 内容 |
|---|---|
| ScoreState | `{ score: number; combo: number }`，score ≥ 0，combo ≥ 0 |
| ScoreEngine | 无状态纯函数集：`applyFillCorrect / applyFillWrong / applyUndoFill / applyRedoFill / applyErase`，输入 ScoreState（+记录参数）输出 `{ next, delta }` |
| 调用方 | GameRoom 持有每玩家 ScoreState，fill/erase/undo/redo 裁决时调用；note op 不经 ScoreEngine |

- combo 递增：仅 fill correct（combo+1）；清零：自己 fill wrong / erase / undo / redo；**对方任何操作不影响**（applyOpponentCorrect 已删除，FR-32 修订）
- delta 规则见 business-rules.md BR-S-24~28

## RoomPlayer（v2 修订）

| 字段 | 类型 | 说明 |
|---|---|---|
| playerId | PlayerId | 接入时分配（BR-S-03） |
| connection | Connection 引用 | 发送通道；断线时随 removePlayer 解除 |
| undoStack | MoveRecord[] | 仅自己的操作（BR-S-10） |
| redoStack | MoveRecord[] | 自己新操作成功时清空 |
| ~~mistakes / spectating~~ | — | **v2 移除**（FR-37） |

## MoveRecord（v2 修订）

| 字段 | 类型 | 说明 |
|---|---|---|
| op | Op | 原始操作（fill/erase/note） |
| cellIndex | number | 主格 |
| before | CellEntry 快照 | 操作前主格状态（undo 恢复目标） |
| after | CellEntry 快照 | 操作后主格状态（redo 恢复目标） |
| clearedNotes | Array\<{ index: number; value: number }\> | fill 正确时联动清除的**发起者自己**的私有笔记（undo 仅恢复自己的笔记——对方笔记不受 undo 影响，SP-4；对方被清笔记不入栈，仅在广播时按归属者分发给各自副本） |
| **scoreDelta** | number | **v2 新增**：本次操作的分数增量（fill 含连击加成；erase 为扣分；note 为 0），供 undo/redo 对称结算（FR-33） |

## Connection

| 字段 | 类型 | 说明 |
|---|---|---|
| playerId | PlayerId | 接入即分配 |
| roomId | RoomId \| null | join 成功后关联；leave/断线置 null |
| socket | ws 句柄 | 发送/关闭 |

- **生命周期**：ws open 创建（分配 playerId）→ join 关联房间 → leave/close 解除关联并销毁。

## 与协议传输模型的对应（v2）

| 领域实体 | 协议模型（shared/protocol v2） | 转换点 |
|---|---|---|
| GameRoom.board 第 i 格 | CellEntry（无 notes） | toSnapshot / opApplied.cell |
| GameRoom + 接收方 | Snapshot（含 yourNotes + players[].score） | snapshotFor(playerId) |
| RoomPlayer + ScoreState | PlayerInfo { id, score } | snapshotFor / playerJoined |
| notesByPlayer.get(you) | Snapshot.yourNotes / opApplied.notes/clearedNotes | snapshotFor / 个性化副本装配 |
| scores（全房） | opApplied.scores / gameOver.scores | 个性化副本装配 / finalize |
| MoveRecord | 无（不传输） | 仅服务端内部 |
| ScoreState.combo | 无（**不下发**，FR-32/Q2 补充） | 仅服务端内部 |
| solution | 无（不下发） | 仅服务端裁决用 |

## 实体关系约束
1. 一个 Connection 同时至多属于一个 GameRoom（roomId 单值）。
2. RoomPlayer 与 Connection 一一对应（重复 join → 回复 error('already-joined')）。
3. GameRoom 销毁时其 RoomPlayer/MoveRecord/notesByPlayer/scores 一并丢弃，无残留引用。
4. notesByPlayer 与 scores 的键集合恒等于 players 的键集合（加入时初始化、离开时清理）。
