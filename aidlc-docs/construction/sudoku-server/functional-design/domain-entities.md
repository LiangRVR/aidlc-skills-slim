# Domain Entities（unit: sudoku-server）

## 实体总览

```
RoomManager 1 ── * GameRoom 1 ── * RoomPlayer
                     │               │
                     │               └── * MoveRecord（独立 undo/redo 栈）
                     ├── 1 GameState（复用 src/core，棋盘引擎，见适配策略）
                     └── 1 Solution（81 数，仅服务端持有）
ConnectionManager 1 ── * Connection 1 ── 0..1 RoomPlayer（加入房间后关联）
```

## RoomManager

| 字段 | 类型 | 说明 |
|---|---|---|
| rooms | Map\<RoomId, GameRoom\> | 全部存活房间 |

- **生命周期**：随进程启动创建、随进程终止销毁（纯内存，NFR-7）。
- **职责**：matchRoom（BR-S-01/02）、createRoom（BR-S-04）、reclaimRoom（BR-S-13）。

## GameRoom

| 字段 | 类型 | 说明 |
|---|---|---|
| roomId | RoomId | 创建时生成（非空字符串） |
| difficulty | Difficulty | 创建时确定，不变 |
| status | 'playing' \| 'won' | 状态机见 game-logic §2，仅 playing→won 单向 |
| startedAt | number（epoch ms） | 创建时刻，共享计时基准（BR-S-04） |
| players | Map\<PlayerId, RoomPlayer\> | 1-2 人，含观战者 |
| board | GameState（复用 src/core） | 权威棋盘；单机语义按 game-logic §11 适配 |
| solution | readonly number[81] | 谜题解，仅服务端持有，永不下发 |

- **生命周期**：join 未命中匹配时创建 → playing →（填满全对）won → 在线人数 0 销毁。
- **不变量**：`players.size ∈ [1,2]`（存活期间）；`status='won'` 后 players 只减不增。

## RoomPlayer

| 字段 | 类型 | 说明 |
|---|---|---|
| playerId | PlayerId | 接入时分配（BR-S-03） |
| connection | Connection 引用 | 发送通道；断线时随 removePlayer 解除 |
| mistakes | 0-3 整数 | 独立错误计数（BR-S-07）；补位玩家从 0 起（BR-S-18） |
| spectating | boolean | mistakes=3 时置 true，单向不可逆（本局内） |
| undoStack | MoveRecord[] | 仅自己的操作（BR-S-10） |
| redoStack | MoveRecord[] | 自己新操作成功时清空 |

## MoveRecord（撤销/重做记录）

| 字段 | 类型 | 说明 |
|---|---|---|
| op | Op | 原始操作（fill/erase/note） |
| cellIndex | number | 主格 |
| before | CellEntry 快照 | 操作前主格状态（undo 恢复目标） |
| after | CellEntry 快照 | 操作后主格状态（redo 恢复目标） |
| clearedNotes | Array\<{ index: number; value: number }\> | fill 正确时联动清除的他人/共享笔记（undo 需恢复） |

- 结构复用 src/core `Move` 的快照思想，扩展 owner/wrong 归属字段以适配双人棋盘。

## Connection

| 字段 | 类型 | 说明 |
|---|---|---|
| playerId | PlayerId | 接入即分配 |
| roomId | RoomId \| null | join 成功后关联；leave/断线置 null |
| socket | ws 句柄 | 发送/关闭 |

- **生命周期**：ws open 创建（分配 playerId）→ join 关联房间 → leave/close 解除关联并销毁。

## 与协议传输模型的对应

| 领域实体 | 协议模型（shared/protocol） | 转换点 |
|---|---|---|
| GameRoom.board 第 i 格 | CellEntry | toSnapshot / opApplied.cell |
| GameRoom（整体）+ you | Snapshot | joined payload（cells 恰 81、players、startedAt、status、you） |
| RoomPlayer | PlayerInfo | { id, mistakes, spectating } |
| MoveRecord | 无（不传输） | 仅服务端内部 |
| solution | 无（不下发） | 仅服务端裁决用 |

## 实体关系约束
1. 一个 Connection 同时至多属于一个 GameRoom（roomId 单值）。
2. RoomPlayer 与 Connection 一一对应（同一 playerId 不重复入房；重复 join 视为重连请求 → 设计决策：回复 error('already-joined')）。
3. GameRoom 销毁时其 RoomPlayer/MoveRecord 一并丢弃，无残留引用（RoomManager.rooms 移除即 GC）。
