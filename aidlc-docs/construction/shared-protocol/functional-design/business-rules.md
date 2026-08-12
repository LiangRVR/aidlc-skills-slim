# Business Rules（unit: shared-protocol）— 协议 v2（Round 5 重写）

## 信封规则
| 规则 | 内容 |
|---|---|
| BR-P-01 | 所有消息必须是 JSON 对象且含 `version`/`type`/`payload` 三个字段；缺一即拒绝 |
| BR-P-02 | `version` 必须为整数且等于当前 PROTOCOL_VERSION（**=2**）；不一致即拒绝（版本不兼容） |
| BR-P-03 | `type` 必须属于白名单（ClientMessage 3 种 / ServerMessage **7** 种）；未知 type 拒绝 |
| BR-P-04 | deserialize 对任何输入不抛异常，失败一律返回 null |

## payload 逐字段校验规则（Q1=A 严格校验语义保留）

### 通用约束
- `index`：整数，0-80
- `value`：整数，1-9
- `difficulty`：`'easy' | 'medium' | 'hard' | 'expert'` 之一
- `PlayerId`/`RoomId`：非空字符串
- `startedAt`/`elapsedSeconds`/`score`：非负整数
- 笔记数组（yourNotes 的值 / opApplied.notes）：整数数组，元素 1-9，无重复，长度 ≤ 9

### ClientMessage
| type | 字段规则 |
|---|---|
| `join` | `difficulty` 合法 |
| `op` | `op.kind ∈ {fill, erase, note, undo, redo}`；fill/note 需合法 index+value；erase 需合法 index；undo/redo 无额外字段 |
| `leave` | 无字段要求 |

### ServerMessage
| type | 字段规则 |
|---|---|
| `joined` | 完整 Snapshot（见 domain-entities.md）：cells 恰 81 项、players 1-2 人且 score 非负整数、status 合法、you 必须在 players 中、**yourNotes 合法（BR-P-11）** |
| `opApplied` | `playerId` 非空；`op` 合法；`result` 合法；`scores` 合法（BR-P-13）；**字段出席矩阵 BR-P-12** |
| `opRejected` | `playerId` 非空；`reason` 非空字符串（**v2 枚举见 BR-P-14**） |
| `playerJoined` | `player` 为合法 PlayerInfo（v2：id + score） |
| `playerLeft` | `playerId` 非空 |
| `gameOver` | `winnerId` 为 null 或非空字符串；`reason ∈ {'completed','forfeit'}`；`scores` 合法（BR-P-13）；`elapsedSeconds` 非负；**`reason='forfeit'` 时 winnerId 必非 null（BR-P-15）** |
| `error` | `message` 非空字符串 |

### CellEntry 规则
| 规则 | 内容 |
|---|---|
| BR-P-05 | `value` 0-9；`given`/`wrong` 布尔；`owner` 为 null 或非空字符串（**v2：无 notes 字段，出现 notes 即整帧拒绝——严格字段白名单**） |
| BR-P-06 | `given === true` 时 `owner` 必须为 null 且 `value ≠ 0` |
| BR-P-07 | `value === 0` 时 `wrong` 必须为 false |
| BR-P-08 | `value ≠ 0 且 given === false` 时 `owner` 必须非 null |

### v2 新增规则
| 规则 | 内容 |
|---|---|
| BR-P-11 | `yourNotes`：对象；键为 "0"-"80" 的整数字符串；值为合法笔记数组；不得含 value≠0 的格子的键（笔记只属空格）——**键越界/值非法即拒绝** |
| BR-P-12 | opApplied 字段出席矩阵：`result='note'` → 必有 `notes`、必无 `cellIndex`/`cell`/`completedUnits`；`result='correct'` → 必有 `cellIndex`+`cell`+`completedUnits`；`result ∈ {wrong, erased, undone, redone}` → 必有 `cellIndex`+`cell`、必无 `completedUnits`；`clearedNotes` 任何 result 均可出席或缺席（出席则为合法 ClearedNote 数组——{index, value} 条目，v2.1 修正案由 number[] 格索引修订） |
| BR-P-13 | `scores`：对象，键为房间内合法 PlayerId（1-2 个），值为非负整数；空对象拒绝 |
| BR-P-14 | opRejected reason 枚举（v2）：`'not-overwritable' \| 'no-op' \| 'nothing-to-undo' \| 'nothing-to-redo' \| 'game-over' \| 'invalid-op'`；**v1 的 'spectating' 已移除（FR-37）**；反序列化仅校验非空字符串（枚举为服务端语义约束，协议层不白名单化——与 v1 一致） |
| BR-P-15 | `gameOver.reason='forfeit'` → `winnerId` 非 null；`reason='completed'` → winnerId 可为 null（平局） |

## 序列化规则
| 规则 | 内容 |
|---|---|
| BR-P-09 | serialize 自动注入当前 PROTOCOL_VERSION（=2），调用方不得手工指定 version |
| BR-P-10 | serialize/deserialize 均为纯函数：同输入必同输出，无副作用 |
