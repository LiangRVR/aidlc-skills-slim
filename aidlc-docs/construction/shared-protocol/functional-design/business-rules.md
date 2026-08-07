# Business Rules（unit: shared-protocol）

## 信封规则
| 规则 | 内容 |
|---|---|
| BR-P-01 | 所有消息必须是 JSON 对象且含 `version`/`type`/`payload` 三个字段；缺一即拒绝 |
| BR-P-02 | `version` 必须为整数且等于当前 PROTOCOL_VERSION（=1）；不一致即拒绝（版本不兼容） |
| BR-P-03 | `type` 必须属于白名单（ClientMessage 3 种 / ServerMessage 8 种）；未知 type 拒绝 |
| BR-P-04 | deserialize 对任何输入不抛异常，失败一律返回 null |

## payload 逐字段校验规则（Q1=A）

### 通用约束
- `index`：整数，0-80
- `value`：整数，1-9
- `difficulty`：`'easy' | 'medium' | 'hard' | 'expert'` 之一
- `PlayerId`/`RoomId`：非空字符串
- `notes`：整数数组，元素 1-9，无重复，长度 ≤ 9
- `startedAt`/`elapsedSeconds`：非负数

### ClientMessage
| type | 字段规则 |
|---|---|
| `join` | `difficulty` 合法 |
| `op` | `op.kind ∈ {fill, erase, note, undo, redo}`；fill/note 需合法 index+value；erase 需合法 index；undo/redo 无额外字段 |
| `leave` | 无字段要求 |

### ServerMessage
| type | 字段规则 |
|---|---|
| `joined` | 完整 Snapshot（见 domain-entities.md）：cells 恰 81 项、players 1-2 人、status 合法、you 必须在 players 中 |
| `opApplied` | `playerId` 非空；`op` 合法；`result ∈ {correct, wrong, note, erased, undone, redone}`；`cell` 为合法 CellEntry；`clearedNotes` 为合法 index 数组；`completedUnits` 为 `{type: 'row'|'col'|'box', index: 0-8}` 数组（可为空） |
| `opRejected` | `playerId` 非空；`reason` 非空字符串 |
| `playerJoined` | `player` 为合法 PlayerInfo |
| `playerLeft` / `playerLost` | `playerId` 非空 |
| `gameWon` | `elapsedSeconds` 非负 |
| `error` | `message` 非空字符串 |

### CellEntry 规则
| 规则 | 内容 |
|---|---|
| BR-P-05 | `value` 0-9；`given`/`wrong` 布尔；`owner` 为 null 或非空字符串 |
| BR-P-06 | `given === true` 时 `owner` 必须为 null 且 `value ≠ 0`（预填格必有数字且无归属） |
| BR-P-07 | `value === 0` 时 `wrong` 必须为 false（空格不算错填） |
| BR-P-08 | `value ≠ 0 且 given === false` 时 `owner` 必须非 null（玩家填写必有归属） |

## 序列化规则
| 规则 | 内容 |
|---|---|
| BR-P-09 | serialize 自动注入当前 PROTOCOL_VERSION，调用方不得手工指定 version |
| BR-P-10 | serialize/deserialize 均为纯函数：同输入必同输出，无副作用 |
