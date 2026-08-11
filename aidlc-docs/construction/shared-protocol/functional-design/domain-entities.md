# Domain Entities（unit: shared-protocol）— 协议 v2（Round 5 重写）

传输域实体（协议线上格式）。与 component-methods-round5.md 冻结契约一致。**v2 取代 v1**：CellEntry 去 notes、PlayerInfo 去 mistakes/spectating 加 score、Snapshot 加 yourNotes、gameOver 取代 gameWon/playerLost。

## Envelope（消息信封）
| 字段 | 类型 | 约束 |
|---|---|---|
| version | number | 整数，== PROTOCOL_VERSION(**2**) |
| type | string | 消息类型白名单 |
| payload | object | 按 type 而定 |

## Op（操作意图，客户端 → 服务端）——与 v1 相同
| 变体 | 字段 | 约束 |
|---|---|---|
| fill | index, value | index 0-80；value 1-9 |
| erase | index | index 0-80 |
| note | index, value | 同 fill（toggle 语义；**私有操作**，FR-34） |
| undo / redo | — | 无字段 |

## CellEntry（棋盘格公共传输模型，v2 修订）
| 字段 | 类型 | 说明 |
|---|---|---|
| value | number | 0-9，0 为空 |
| given | boolean | 是否预填格 |
| owner | PlayerId \| null | 填写者；given 或空时为 null（BR-P-06/08） |
| wrong | boolean | 错填标红；空格必 false（BR-P-07） |
| ~~notes~~ | — | **v2 移除**：笔记私有化（FR-34），经 Snapshot.yourNotes 与 opApplied 私有字段下发 |

## PlayerInfo（玩家状态，v2 修订）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | PlayerId | 服务端分配 |
| score | number | 整数，≥ 0（FR-31 下限 0） |
| ~~mistakes / spectating~~ | — | **v2 移除**（FR-37 废除判负旁观） |

## Snapshot（全量状态，joined 下发，v2 修订）
| 字段 | 类型 | 说明 |
|---|---|---|
| roomId | RoomId | 房间标识 |
| difficulty | Difficulty | easy/medium/hard/expert |
| cells | CellEntry[81] | 恰好 81 项 |
| players | PlayerInfo[] | 1-2 人（含分数） |
| yourNotes | Record<number, number[]> | **v2 新增**：仅接收方自己的私有笔记（cellIndex -> digits，FR-34） |
| startedAt | number | 房间创建时间戳（共享计时基准） |
| status | 'playing' \| 'won' | 房间状态机 |
| you | PlayerId | 接收方自身 id，必须在 players 中 |

## OpApplied（个性化负载，v2 修订）

同一 op 向不同玩家发送不同副本（Application Design Q5=A）：

| 字段 | 可见性 | 类型 | 说明 |
|---|---|---|---|
| playerId | 公共 | PlayerId | 操作发起者 |
| op | 公共 | Op | 回显客户端意图 |
| result | 公共 | 'correct' \| 'wrong' \| 'note' \| 'erased' \| 'undone' \| 'redone' | 判定结果 |
| cellIndex | 条件 | number 0-80 | 棋盘变化格定位（note 结果时缺席） |
| cell | 条件 | CellEntry | 变化后的格子（note 结果时缺席） |
| completedUnits | 条件 | CompletedUnit[] | 仅 result=correct 时出现（可为空数组） |
| scores | 公共 | Record<PlayerId, number> | 双方最新总分（连击计数不下发） |
| notes | **私有** | number[] | 仅 result=note：该格自己的笔记全集（仅发发起者） |
| clearedNotes | **私有** | number[] | 自己被联动清除/恢复笔记的格索引；仅出现在归属者副本 |

- **note op 的 opApplied 仅发发起者**（对方收不到任何事件）
- 字段出席矩阵详见 business-rules.md BR-P-12

## ClientMessage（3 种）——与 v1 相同
`join { difficulty }` / `op { op: Op }` / `leave {}`

## ServerMessage（7 种，v2 修订）
| type | payload | v2 变更 |
|---|---|---|
| joined | Snapshot | 含 yourNotes |
| opApplied | 见 OpApplied 实体 | 个性化负载 + scores |
| opRejected | playerId, reason | reason 集修订（移除 'spectating'） |
| playerJoined | player: PlayerInfo | PlayerInfo v2 |
| playerLeft | playerId | 语义收窄：仅 won 房间成员离开时广播（FR-38） |
| **gameOver** | winnerId: PlayerId \| null, reason: 'completed' \| 'forfeit', scores: Record<PlayerId, number>, elapsedSeconds | **v2 新增**：终局结算；winnerId=null 为平局（FR-36/39） |
| error | message | 不变 |
| ~~playerLost~~ | — | **v2 移除**（FR-37） |
| ~~gameWon~~ | — | **v2 移除**（由 gameOver 取代） |

## CompletedUnit——与 v1 相同
`{ type: 'row' | 'col' | 'box', index: 0-8 }`

## 关系
- ClientMessage/ServerMessage 均为 Envelope 的特化
- Snapshot 聚合 CellEntry × 81、PlayerInfo × 1-2 与接收方私有 yourNotes
- opApplied 关联 Op（回显）+ CellEntry（权威结果）+ scores（计分态）+ 私有笔记字段
- gameOver 聚合胜负判定与双方最终分数
