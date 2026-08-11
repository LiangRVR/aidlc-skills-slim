# Services（Round 5 - 竞速对抗模式）

仅列 Round 5 修订的编排；连接生命周期、匹配编排（FR-17）、共享计时（FR-24）、模式选择编排与 services-round4.md 相同，不再重复。

## 服务端编排

### 操作确认编排 v2（GameRoom.applyOp + ScoreEngine）

```
op(playerId, op)
  -> 前置校验（顺序固定，BR-S-05 语义保留）：房间存在 -> status=playing -> 权限矩阵
  -> 权限矩阵（BR-S 修订，FR-35）：
       fill:  目标格=空格 | owner=自己 | wrong=true（任意归属）；对方正确格 -> opRejected('not-overwritable')
       erase: owner=自己 且非 given 非空；否则 opRejected
       note:  目标格为空格（笔记仅存于自己的 notesByPlayer）
       undo/redo: 仅自己的操作栈；空栈 opRejected
  -> 应用变更：
       fill -> 判定 value==solution[index]
         对 -> ScoreEngine.applyFillCorrect(发起者)  // +100 (+20 连击加成)
              -> 服务端代清双方 notesByPlayer 中相关行/列/宫的该值（FR-34）
              -> completedUnits 计算 -> 全盘完成则标记待终局
         错 -> ScoreEngine.applyFillWrong(发起者)   // -100 clamp 0，combo 清零
       erase -> ScoreEngine.applyErase(发起者, erasedCellCorrect)
       note -> 更新发起者 notesByPlayer（toggle）；不经 ScoreEngine
       undo/redo -> ScoreEngine.applyUndoFill/applyRedoFill(发起者, recordedDelta)
              -> 联动笔记恢复仅作用于发起者自己的 notesByPlayer
  -> 下发（个性化，Q5=A）：
       note op -> opApplied 仅回发发起者（含 notes 私有字段）
       其他 op -> 双方各收一份 opApplied：公共字段相同；clearedNotes 各带自己的清除结果
  -> 若标记待终局 -> finalize('completed')：opApplied 先达，gameOver 后达（顺序约束保留）
```

### 终局编排（GameRoom.finalize）

- `completed`：棋盘填满且全部正确 → 比较双方分数：高者 winnerId，平分 winnerId=null（平局）
- `forfeit`：playing 中一方离开（RoomManager 触发，见下）→ winnerId=在局者
- 广播 `gameOver { winnerId, reason, scores, elapsedSeconds }` → status='won'
- won 房间：玩家可留观棋盘直至离开；一切 op 拒绝（'game-over'，BR-S-14 语义保留）

### 离开/断线编排（RoomManager.removePlayer，FR-38）

```
removePlayer(playerId)
  -> room.status=='playing' 且 room.hadTwoPlayers
       -> room.finalize('forfeit')   // 在局者直接判胜；不广播 playerLeft；不进入可加入池
  -> room.status=='playing' 且仅 1 人（从未成局）
       -> 原语义：房间空置 -> 在线人数 0 -> 回收销毁
  -> room.status=='won'
       -> 广播 playerLeft -> 在线人数 0 -> 回收销毁
```

- 匹配可加入谓词不变：`status=='playing' 且在线玩家数==1`（单人等待房仍可被第二人加入；一旦成局，离开即终局不可再补位）

### 连击状态说明（FR-32）

- combo 为服务端内部状态：不下发、不显示（Application Design Q2 补充）
- 连击仅被**自己的**填错/erase/undo/redo 清零；对方任何操作（含填对）不影响本玩家连击（**【Application Design 变更】原"对方填对清零"已删除**：与连击不可见决策配套，避免隐性惩罚）

### 私有笔记编排（FR-34）

- note op：仅改发起者 `notesByPlayer`；`opApplied` 仅回发发起者（对方无事件）
- fill correct：服务端计算相关行/列/宫，分别从**双方各自**的 notesByPlayer 删除该值；发给 A 的 opApplied.clearedNotes 只含 A 被清的格子，发给 B 的只含 B 的（Q5=A 个性化副本）
- undo/redo 联动笔记恢复：仅作用于发起者自己的 notesByPlayer 中仍为空格的格子（BR-S-10 过期记录语义保留）
- Snapshot.yourNotes：仅含请求者自己的笔记

## 前端编排

### 联机对局编排 v2（GameScene + OnlineGameController + ScoreBoard）

- 输入路径不变：输入 -> op 消息 -> 服务端确认 -> opApplied -> 更新镜像 -> EventBus 渲染（权威一致，BR-S-16 保留）
- 分数路径：opApplied.scores -> ScoreBoard.update（双方分数即时刷新）
- VFX 路径不变：仅自己 correct 触发本地 VfxManager；对方 correct 仅渲染黑色数字（FR-20 保留）
- 笔记路径：opApplied 私有字段（notes/clearedNotes）-> 仅更新自己的笔记镜像 -> BoardView 渲染
- 终局路径：gameOver -> 结算覆盖层：胜/负/平局 + 双方最终分数 + 用时（elapsedSeconds）；胜负相对自己视角展示
- 离开提示：playerLeft 仅在 won 房间出现 -> 状态栏提示
- 旁观路径删除：无 playerLost 订阅、无旁观覆盖层（FR-37）
