# Domain Entities（unit: shared-protocol）

传输域实体（协议线上格式）。与 component-methods-round4.md 契约一致；信封变更（version 字段）为 functional-design Q2=B 决策。

## Envelope（消息信封）
| 字段 | 类型 | 约束 |
|---|---|---|
| version | number | 整数，== PROTOCOL_VERSION(1) |
| type | string | 消息类型白名单 |
| payload | object | 按 type 而定 |

## Op（操作意图，客户端 → 服务端）
| 变体 | 字段 | 约束 |
|---|---|---|
| fill | index, value | index 0-80；value 1-9 |
| erase | index | index 0-80 |
| note | index, value | 同 fill（toggle 语义） |
| undo / redo | — | 无字段 |

## CellEntry（棋盘格传输模型）
| 字段 | 类型 | 说明 |
|---|---|---|
| value | number | 0-9，0 为空 |
| given | boolean | 是否预填格 |
| owner | PlayerId \| null | 填写者；given 或空时为 null（BR-P-06/08） |
| wrong | boolean | 错填标红；空格必 false（BR-P-07） |
| notes | number[] | 共享候选数（1-9，无重复，不区分归属） |

## PlayerInfo（玩家状态）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | PlayerId | 服务端分配 |
| mistakes | number | 0-3，各自独立计数 |
| spectating | boolean | 错满 3 次转旁观 |

## Snapshot（全量状态，joined 下发）
| 字段 | 类型 | 说明 |
|---|---|---|
| roomId | RoomId | 房间标识 |
| difficulty | Difficulty | easy/medium/hard/expert |
| cells | CellEntry[81] | 恰好 81 项 |
| players | PlayerInfo[] | 1-2 人 |
| startedAt | number | 房间创建时间戳（共享计时基准） |
| status | 'playing' \| 'won' | 房间状态机 |
| you | PlayerId | 接收方自身 id，必须在 players 中 |

## ClientMessage（3 种）
`join { difficulty }` / `op { op: Op }` / `leave {}`

## ServerMessage（8 种）
| type | payload |
|---|---|
| joined | Snapshot |
| opApplied | playerId, op, result('correct'\|'wrong'\|'note'\|'erased'\|'undone'\|'redone'), cell: CellEntry, clearedNotes: number[], completedUnits: CompletedUnit[] |
| opRejected | playerId, reason |
| playerJoined | player: PlayerInfo |
| playerLeft | playerId |
| playerLost | playerId |
| gameWon | elapsedSeconds |
| error | message |

## CompletedUnit
`{ type: 'row' \| 'col' \| 'box', index: 0-8 }` — 因填对而新完成的行/列/宫（服务端计算，客户端无 solution）

## 关系
- ClientMessage/ServerMessage 均为 Envelope 的特化
- Snapshot 聚合 CellEntry × 81 与 PlayerInfo × 1-2
- opApplied 关联 Op（回显客户端意图）+ CellEntry（权威结果）
