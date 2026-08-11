# Game Logic（unit: sudoku-server）— Round 5 v2（竞速对抗模式）

**v2 取代 v1**：废除旁观/补位/playerLost/gameWon；新增 ScoreEngine 计分编排、私有笔记流、个性化 opApplied 装配、finalize 终局流。

## 1. 组件编排总览

```
Client ──ws──> ServerEntry ──> ConnectionManager ──> MessageRouter ──> RoomManager ──> GameRoom ──> ScoreEngine（纯函数）
                                     │                                        │
                                     └── error（非法帧，BR-S-15）              └── 个性化副本经 ConnectionManager 按 playerId 定向送达
```

| 组件 | 职责（落点） |
|---|---|
| ServerEntry | 启动 ws 服务（默认端口 8081）；连接接入/断开；优雅关闭 |
| ConnectionManager | 连接注册/注销；按 playerId 或 roomId 定向发送/广播（Q5=A 个性化副本承载点） |
| MessageRouter | deserialize 入站帧；null → 回 `error`；按 type 分发 join/op/leave |
| RoomManager | 房间注册表；四级匹配（BR-S-01/02）；房间创建与回收（BR-S-13）；removePlayer 触发 forfeit（BR-S-23） |
| GameRoom | 权威对局：操作裁决、计分编排、私有笔记、个性化广播事件生成（本文件主体） |
| ScoreEngine（S6） | 无状态纯函数：ScoreState 演进与 delta 计算（BR-S-24~28） |

## 2. 房间生命周期状态机（v2）

```
（不存在）── join 未命中可加入房间 ──> playing（players 1-2 人，可加入=players.length===1）
playing ── 棋盘填满且全对 ── finalize('completed') ──> won（终态）
playing ── hadTwoPlayers 且一方 leave/断线 ── finalize('forfeit') ──> won（终态）
playing/won ── 在线玩家数=0（leave/断线）──> 销毁（RoomManager 立即回收，无定时清理）
```

- `won` 为终态：不可加入、拒绝一切 op（'game-over'）、继续为在局成员同步直至其离开（BR-S-14）。
- won 房间成员离开 → 广播 playerLeft + 回收检查（BR-S-23）。
- ~~补位回流~~：**v2 废除**——playing 中双人房有一人离开即终局，不存在"剩 1 人 playing 的双人房"；单人房（hadTwoPlayers=false）离开即空置回收。

## 3. join / 匹配处理流（US-16、US-17）

```
join(difficulty)
  1. 连接已分配 playerId（接入即分配，免登录，BR-S-03）
  2. RoomManager.matchRoom(difficulty)（BR-S-01 优先级链，与 v1 相同）
  3. 命中：GameRoom.addPlayer(playerId, connection)
     → 初始化 scores[playerId]={score:0,combo:0}、notesByPlayer[playerId]=空
     → players.length 变 2 → hadTwoPlayers=true
     → 向加入者单发 joined(snapshotFor(playerId))（含 yourNotes、players[].score）
     → 向房间其他人广播 playerJoined({id, score:0})
  4. 未命中：创建新房间（SudokuGenerator.generate 得 puzzle+solution；solution 仅服务端持有）
     → startedAt = now（BR-S-04）；status=playing → addPlayer → joined
```

## 4. op 裁决管线（v2）

```
op(playerId, op)
  1. 房间定位失败 → error('未在房间中')
  2. room.status !== 'playing' → opRejected('game-over')（BR-S-14）
  3. 按 op.kind 分支（payload 合法性已由协议层 BR-P 保证）：
     fill(i,v) → §5；erase(i) → §6；note(i,v) → §7；undo/redo → §8
  4. 接受的 op → 按 §10 装配个性化 opApplied 副本定向发送
     拒绝的 op → opRejected 仅回发起者（reason 集 v2：'given-cell'/'not-overwritable'/'not-erasable'/'no-op'/'nothing-to-undo'/'nothing-to-redo'/'game-over'/'invalid-note-cell'/'invalid-op'；'spectating' 已移除，BR-P-14）
  5. 若本 op 触发终局 → opApplied 先于 gameOver 广播（BR-S-20）
```

## 5. fill 裁决（v2 核心分支，含计分）

```
fill(i, v)
  前置校验：
    - cell[i].given === true → opRejected('given-cell')
    - cell[i].value === v → opRejected('no-op')（幂等，BR-S-21）
    - 覆盖权限：cell[i].value===0（空格）或 cell[i].owner===playerId（自己格）或 cell[i].wrong===true（任意错填格）
      否则（对方正确格）→ opRejected('not-overwritable')（BR-S-21）
  判定：solution[i] === v ?
  ├─ 正确：
  │   cell[i] = { value: v, given: false, owner: playerId, wrong: false }  ← 覆盖错填格时归属转移（FR-35）
  │   计分：ScoreEngine.applyFillCorrect(scores[playerId]) → delta=100+(combo'>=3?20:0)，记入 MoveRecord.scoreDelta（BR-S-24）
  │   联动清除：双方 notesByPlayer 中同行/列/宫格子的 v 移除 → 各自的 clearedNotes（BR-S-11）
  │   收集 completedUnits；记入发起者 undo 栈（含双方被清笔记快照）
  │   RuleValidator.isComplete(board) → finalize('completed')（§9，BR-S-29）
  │   → opApplied(result:'correct', cell, completedUnits, scores, 各自 clearedNotes)
  └─ 错误：
      cell[i] = { value: v, given: false, owner: playerId, wrong: true }  ← 错填格占位，对方可 fill 覆盖（BR-S-21）
      计分：ScoreEngine.applyFillWrong → delta=-min(100, score)，combo 清零（BR-S-25）
      记入发起者 undo 栈（scoreDelta=-100）
      → opApplied(result:'wrong', cell, scores)
```

## 6. erase 裁决（v2 修订：仅归属者）

```
erase(i)
  权限：cell.given === false 且 cell.value !== 0 且 cell.owner === playerId  ← v2：仅归属者本人（BR-S-09）
  不满足 → opRejected('not-erasable')
  满足 → 计分：ScoreEngine.applyErase(erasedCellCorrect=!cell.wrong)
         擦自己正确格 delta=-min(100, score)；擦自己错填格 delta=0；combo 清零（BR-S-28）
       → 记入 undo 栈（原 cell 快照 + scoreDelta）；cell 复位为空（value:0, owner:null, wrong:false）
       → opApplied(result:'erased', cell, scores)
  注：对方错填格的清除路径 = fill 覆盖（§5），erase 不再承担互擦（FR-35）
```

## 7. note 裁决（v2 修订：私有）

```
note(i, v)
  cell.given === false 且 cell.value === 0，否则 opRejected('invalid-note-cell')
  仅作用于 notesByPlayer[playerId]：toggle 语义（BR-S-11）
  不经 ScoreEngine（不影响分数/连击，BR-S-26）
  记入发起者 undo 栈（scoreDelta=0）
  → opApplied(result:'note', notes: 该格自己的笔记全集) 【仅回发发起者，对方收不到任何事件】
```

## 8. undo / redo（v2：含计分结算）

- **每玩家独立栈**（MoveRecord 含 scoreDelta）：只记录自己的 fill/erase/note。
- 自己新操作成功 → 清空自己的 redo 栈。
- `undo`：弹自己栈顶：
  - **过期记录语义保留**（BR-S-10）：主格当前状态与记录 after 快照不一致（此后被他人改动）→ 跳过恢复、丢弃记录、照常广播 'undone'（携带当前格状态）、不计分变更
  - 正常恢复：fill 逆向=恢复空格与**发起者自己**被清笔记（对方笔记不受影响，SP-4）；erase 逆向=恢复原 cell；note 逆向=反向 toggle（仅自己笔记）
  - 计分：ScoreEngine.applyUndoFill(recordedDelta)：正 delta → -min(recordedDelta, score) 返还；**负 delta（错填或 erase 扣分记录）→ 0，永久不返还（错填防穷举；erase 扣分不返还为冻结契约语义——契约无 applyUndoErase，BR-S-27）**；combo 清零
  - 压入 redo 栈。空栈 → opRejected('nothing-to-undo')
- `redo`：对称——applyRedoFill：原正确填入 +recordedDelta 原样恢复（不重算连击）；原错填 delta=0（不再扣分）；combo 清零（BR-S-28）。空栈 → opRejected('nothing-to-redo')
- **隔离性（BR-S-10）**：undo/redo 只触及自己记录涉及的格子与自己的 notesByPlayer；对方 owner 格、对方笔记、对方 ScoreState 不受影响
- 成功 → opApplied(result:'undone'|'redone', cellIndex, cell, scores, 发起者 clearedNotes)

## 9. 终局（v2：finalize 取代胜利判定）

```
finalize(reason: 'completed' | 'forfeit')
  completed（棋盘填满且全对，RuleValidator.isComplete）：
    比分数：分高者 winnerId；平分 winnerId=null（判和，BR-S-29）
  forfeit（BR-S-23 触发）：
    winnerId = 在局者（非 null，BR-S-30）
  → 广播 gameOver{ winnerId, reason, scores: 双方最终分, elapsedSeconds: floor((now-startedAt)/1000) }（BR-S-31）
  → room.status = 'won'
  → 此后一切 op → opRejected('game-over')；房间不可加入；成员可留观或离开
```

## 10. 个性化 opApplied 装配（Q5=A，v2 新增）

```
对同一已接受 op，为房间内每个接收者 r 装配独立副本：
  公共部分（所有副本相同）：playerId, op, result, cellIndex?, cell?, completedUnits?, scores（全房最新总分）
  私有部分：
    r === 笔记归属者 → clearedNotes: r 自己被联动清除/恢复的格索引（fill correct 时双方各自不同；undo/redo 仅发起者有）
    note op → 仅装配发起者副本（含 notes 全集），不向对方发送
  经 ConnectionManager.send(r.playerId, 副本) 定向送达
```

- 出席矩阵由协议层 BR-P-12 保证；连击计数从不出现在任何副本（FR-32/Q2 补充）

## 11. leave / 断线（v2：forfeit 取代补位）

```
leave / ws close → RoomManager.removePlayer(playerId)
  房间 playing 且 hadTwoPlayers → room.finalize('forfeit')（在局者胜）
    不广播 playerLeft；离开后 won 房间继续为在局者同步（BR-S-14）
  房间 playing 且仅 1 人（hadTwoPlayers=false）→ 房间空置 → 回收检查（BR-S-13）
  房间 won → 广播 playerLeft → 回收检查（在线 0 销毁）
  清理：scores/notesByPlayer 中该 playerId 条目随成员移除清理
```

## 12. src/core 复用边界（沿用 v1 实施期修订）

**不复用 GameState 类**（v1 实施期决策保留，理由不变：owner/wrong 归属层、私有字段耦合、FR-29/FR-40 本地回归风险面）。v2 新增 ScoreEngine 与 notesByPlayer 均为 server 侧自建，core 零改动（Q3=A/Q4=A）。

| 复用（import） | 用途 |
|---|---|
| `Puzzle`、`CellIndex`、`CellValue`、`Difficulty`（types） | 纯类型 |
| `SudokuGenerator.generate` | 创建房间时生成谜题 + solution |
| `RuleValidator.isComplete` / `isCorrect` | 终局判定 / fill 对错判定 |

| 不复用 | 替代 |
|---|---|
| GameState（整类） | GameRoom 自建 CellEntry[81] 权威状态与操作原语 |
| GameState.peersOf（private） | server 内部 peers/units 辅助 |
| Move（types） | MoveRecord（含归属快照 + scoreDelta） |
| EventBus / SaveManager / applyHint / reset / newGame | 无服务端入口（BR-S-17） |

## 13. 计时（沿用 v1）

- 权威时钟 = `startedAt`；服务端不做周期广播；客户端各自以 `now - startedAt` 渲染。
- `gameOver.elapsedSeconds = floor((wonAt - startedAt) / 1000)`（取代 v1 gameWon.elapsedSeconds）。

## 14. 广播目标规则（v2）

| 消息 | 目标 |
|---|---|
| joined | 仅加入者 |
| opApplied（note op） | **仅发起者**（FR-34） |
| opApplied（其余 op） | 房间全体成员，**个性化副本**（clearedNotes 各自不同，Q5=A） |
| playerJoined | 房间其余成员 |
| playerLeft | 仅 won 房间全体成员（BR-S-23） |
| gameOver | 房间全体成员（BR-S-31） |
| opRejected / error | 仅发起者 |
