# Game Logic（unit: sudoku-server）

## 1. 组件编排总览

```
Client ──ws──> ServerEntry ──> ConnectionManager ──> MessageRouter ──> RoomManager ──> GameRoom
                                     │                                        │
                                     └── error（非法帧，BR-S-15）              └── 广播经 ConnectionManager 送达各连接
```

| 组件 | 职责（落点） |
|---|---|
| ServerEntry | 启动 ws 服务（默认端口 8081）；连接接入/断开；优雅关闭 |
| ConnectionManager | 连接注册/注销；按 playerId 或 roomId 定向发送/广播 |
| MessageRouter | deserialize 入站帧；null → 回 `error`；按 type 分发 join/op/leave |
| RoomManager | 房间注册表；四级匹配（BR-S-01/02）；房间创建与回收（BR-S-13） |
| GameRoom | 权威对局：操作裁决、双人规则、广播事件生成（本文件主体） |

## 2. 房间生命周期状态机

```
（不存在）── join 未命中可加入房间 ──> playing（players 1-2 人，可加入=players.length===1）
playing ── 棋盘填满且全对 ──> won（终态：不可加入、拒绝一切 op、继续同步）
playing/won ── 在线玩家数=0（leave/断线）──> 销毁（RoomManager 立即回收，无定时清理）
```

- 玩家个人状态 `active → spectating`（错满 3 次，BR-S-07）**不影响**房间状态；观战者仍计入 players 数量。
- `won` 房间内的玩家可留观棋盘直到主动离开/断线（services-round4 §GameRoom 生命周期编排）。

## 3. join / 匹配处理流（US-16、US-17）

```
join(difficulty)
  1. 连接已分配 playerId（接入即分配，免登录，BR-S-03）
  2. RoomManager.matchRoom(difficulty)（BR-S-01 优先级链）：
     a. 同难度、可加入（status=playing 且 players.length===1）中 startedAt 最早的房间
     b. 否则按档位距离升序、同距离更难档优先（中等→困难→简单→专家；困难→专家→中等→简单；简单→中等→困难→专家；专家→困难→中等→简单），取可加入中 startedAt 最早者
     c. 均无 → null
  3. 命中：GameRoom.addPlayer(playerId, connection)
     → 向加入者单发 joined(Snapshot)（含 you、startedAt、当前棋盘、players）
     → 向房间其他人广播 playerJoined(PlayerInfo)
  4. 未命中：RoomManager 创建新房间：
     → SudokuGenerator.generate(difficulty) 得 puzzle+solution（solution 仅服务端持有，不下发）
     → startedAt = now（BR-S-04）；status=playing
     → addPlayer → joined(Snapshot)
```

- 补位（US-28/FR-28）：断线/leave 后 players.length===1 的房间自动重新进入可加入池（无需显式动作，匹配谓词自然命中）。补位玩家 mistakes 从 0 起、从当前棋盘继续（BR-S-18）。

## 4. op 裁决管线（US-18、21、22、23、25、26）

```
op(playerId, op)
  1. 房间定位失败 → error('未在房间中')
  2. room.status !== 'playing' → opRejected('game-over')（BR-S-14）
  3. player.spectating → opRejected('spectating')（BR-S-08）
  4. 按 op.kind 分支（payload 字段合法性已由协议层 BR-P 保证）：
     fill(i,v)  → §5
     erase(i)   → §6
     note(i,v)  → §7
     undo/redo  → §8
  5. 接受的 op → 生成 opApplied 广播给房间全体成员（含发起者，权威确认语义，BR-S-16）
     拒绝的 op → opRejected 仅回发起者
```

## 5. fill 裁决（核心分支）

```
fill(i, v)
  前置校验：
    - cell[i].given === true → opRejected('given-cell')（预填格不可改）
    - cell[i].value === v 且归属/笔记无变化 → opRejected('no-op')
  判定：solution[i] === v ?
  ├─ 正确：
  │   cell[i] = { value: v, given: false, owner: playerId, wrong: false, notes: [] }
  │   联动清除：同行/列/宫所有格 notes 中的 v 移除（FR-21，不区分归属）→ clearedNotes[]
  │   收集 completedUnits：本次填入后新完成的行/列/宫（BR：单元内 9 格全填且全对）
  │   记入发起者 undo 栈（含被清笔记快照，供 undo 恢复）
  │   RuleValidator.isComplete(board) === true → 触发胜利（§9）
  │   → opApplied(result: 'correct', cell, clearedNotes, completedUnits)
  └─ 错误：
      cell[i] = { value: v, given: false, owner: playerId, wrong: true, notes: [] }
      该玩家 mistakes += 1；记入其 undo 栈
      → opApplied(result: 'wrong', cell, clearedNotes: [], completedUnits: [])
      mistakes 达到 3 → 该玩家 spectating=true，广播 playerLost(playerId)（BR-S-07）
        （本 op 的 opApplied 先广播，playerLost 后广播，保证顺序语义）
```

## 6. erase 裁决（US-26/FR-26）

```
erase(i)
  权限：cell.given === false 且 cell.value !== 0 且
        （cell.wrong === true 或 cell.owner === playerId）  ← 任何人可擦错填格；正确格仅归属者可擦
  不满足 → opRejected('not-erasable')
  满足 → 记入发起者 undo 栈（含原 cell 快照）；cell 复位为空（value:0, owner:null, wrong:false，notes 保留原笔记）
       → opApplied(result: 'erased', cell, ...)
```

## 7. note 裁决（US-21/FR-21）

```
note(i, v)
  cell.given === false 且 cell.value === 0，否则 opRejected('invalid-note-cell')
  笔记无归属、双方互见互改：toggle 语义（存在则移除、不存在则加入）
  记入发起者 undo 栈 → opApplied(result: 'note', cell, ...)
```

## 8. undo / redo（US-25/FR-25）

- **每玩家独立撤销/重做栈**（MoveRecord，见 domain-entities.md）：只记录自己的 fill/erase/note 操作。
- 自己新操作成功 → 清空自己的 redo 栈（标准语义）。
- `undo`：弹自己栈顶，按快照逆向恢复（fill 逆向=恢复空格与被清笔记；erase 逆向=恢复原 cell；note 逆向=反向 toggle）；压入自己 redo 栈。空栈 → opRejected('nothing-to-undo')。
- `redo`：对称。空栈 → opRejected('nothing-to-redo')。
- **隔离性（BR-S-10）**：undo/redo 只触及自己记录涉及的格子；对方 owner 格与对方操作历史不受影响。
- 成功 → opApplied(result: 'undone' | 'redone', cellIndex: 主格, cell, ...)（涉及多格恢复时以主格为 cell，清笔记恢复并入 clearedNotes 反向——协议单格模型下：fill 逆向产生的多格笔记恢复通过多条 opApplied 广播，主格为 'undone'，笔记恢复格各发一条 result:'note'（cellIndex=该格）。设计取舍：复用现有协议类型，不扩协议。**2026-08-07 协议修订：opApplied 统一携带 cellIndex（undo/redo 定位必需）**）

## 9. 胜利判定（US-22/FR-22）

```
RuleValidator.isComplete(board) === true（填满且全对）
  → room.status = 'won'；广播 gameWon({ elapsedSeconds: floor((now - startedAt)/1000) })
  → 此后一切 op → opRejected('game-over')；房间不再可加入；成员可留观或离开
```

## 10. leave / 断线（US-28/FR-28）

```
leave / ws close
  → GameRoom.removePlayer(playerId)：从 players 移除（其 owner 格保留在棋盘上，棋局不重置）
  → 广播 playerLeft(playerId)
  → players.length === 0 → RoomManager 回收销毁房间（BR-S-13）
  → players.length === 1 且 status=playing → 房间自动回到可加入池（BR-S-12）
```

## 11. src/core 复用边界（实施期细化，2026-08-07 修订）

**原设计**：GameRoom 持有一个 `GameState` 实例作为棋盘/笔记/完成判定引擎，单机语义适配（计数归零等）。

**实施期发现**：`GameState` 无法承载双人语义，修订为**不复用 GameState 类**，理由：
1. `GameState` 不追踪格子 **owner/wrong**（协议 CellEntry 的核心字段），GameRoom 无论如何都要自建归属层；
2. 其单机规则（错误计数、3 次判负 lost、单一 undo/redo 栈）耦合在 **private 字段**中，无法在不修改 core 的前提下旁路；修改 core 则触碰 FR-29（本地模式回归约束）风险面；
3. 其棋盘操作原语（fill/erase/toggleNote）本身仅十余行逻辑，复用收益低、适配成本高。

**修订后复用清单**（server 自建权威棋盘 `CellEntry[81]` + 归属/错误信息，行为与单机完全一致）：

| 复用（import） | 用途 |
|---|---|
| `Puzzle`、`CellIndex`、`CellValue`、`Difficulty`（types） | 纯类型 |
| `SudokuGenerator.generate` | 创建房间时生成谜题 + solution |
| `RuleValidator.isComplete` / `isCorrect` | 胜利判定 / fill 对错判定 |

| 不复用 | 替代 |
|---|---|
| GameState（整类） | GameRoom 自建 CellEntry[81] 权威状态与操作原语 |
| GameState.peersOf（private） | server 内部实现 peers/units 辅助（~20 行，与 core 逻辑同构） |
| Move（types） | MoveRecord 按 domain-entities.md 自建（含归属快照） |
| EventBus / SaveManager / applyHint / reset / newGame | 无服务端入口（BR-S-17） |

## 12. 计时（US-24/FR-24）

- 权威时钟 = `startedAt`（房间创建时刻，创建房间的那次 join 触发）。
- 服务端不做周期广播；客户端各自以 `now - startedAt` 渲染（协议 Snapshot 含 startedAt）。
- 页面可见性暂停规则（本地模式第三轮 Q3）不适用于线上。
- `gameWon.elapsedSeconds = floor((wonAt - startedAt) / 1000)`。

## 13. 广播目标规则

| 消息 | 目标 |
|---|---|
| joined | 仅加入者 |
| opApplied / playerJoined / playerLeft / playerLost / gameWon | 房间全体成员（opApplied 含发起者，作权威确认） |
| opRejected / error | 仅发起者 |
