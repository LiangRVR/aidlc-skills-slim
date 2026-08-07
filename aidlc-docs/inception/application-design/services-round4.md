# Services（Round 4 - 多人版）

## 服务端编排

### 连接生命周期编排（ServerEntry + ConnectionManager + MessageRouter）
1. `main()` 启动 ws 服务，每个新连接交给 `ConnectionManager.register` 分配 playerId
2. 消息到达 → `MessageRouter.handleMessage`：deserialize 校验 → 按 type 分发
3. 连接关闭 → `ConnectionManager.unregister` → `RoomManager.removePlayer`（广播 `playerLeft`，房间保留待补位）

### 匹配编排（RoomManager）
```
join(difficulty)
  -> findMatch(difficulty): 可加入房间（playing 且 1 人在线）中，按优先级：
       1) 同难度：取 startedAt 最早
       2) 其他档位：按与所选难度的档位距离升序检查，
          同距离时更难档优先于更简单档，命中的档位内取 startedAt 最早
       3) 均无：返回 null
  -> 命中：room.addPlayer -> 向新房客发 joined(Snapshot)，向已在局玩家广播 playerJoined
  -> 未命中：创建 GameRoom（SudokuGenerator 生成谜题，复用 src/core）-> joined(Snapshot)
```
（查找顺序示例：选"中等" = 困难(d1) → 简单(d1) → 专家(d2) → 创建；选"困难" = 专家(d1) → 中等(d1) → 简单(d2) → 创建；选"简单" = 中等(d1) → 困难(d2) → 专家(d3) → 创建；选"专家" = 困难(d1) → 中等(d2) → 简单(d3) → 创建。）

### GameRoom 生命周期编排（RoomManager）
- **创建**：仅由 `join` 未命中匹配时触发；创建即生成谜题、初始化权威 GameState、记录 startedAt、状态 playing
- **状态机**：`playing`（可加入/可游戏）→ `won`（棋盘完成，终态，不可加入）；玩家个人状态 `playing → spectating` 不影响房间状态
- **销毁**：每次 `removePlayer` 后检查在线人数，为 0 即回收（无论 playing/won）；无定时清理任务——纯内存、进程生命周期内按需回收
- **won 房间的玩家**：可继续留在房间查看棋盘直到主动离开或断线，离开即触发回收检查

### 操作确认编排（GameRoom.applyOp）
```
op(playerId, op)
  -> 校验：旁观中? 格子可写? undo/redo 目标须为该玩家自己的操作?
     失败 -> opRejected（仅回发操作者）
  -> 应用权威 GameState（fill/erase/note/undo/redo）
  -> fill 判定：value == solution[index]
       对 -> 清除相关行/列/宫共享笔记中的该数字；计算 completedUnits；检查全盘完成 -> gameWon
       错 -> 该玩家 mistakes+1；达 3 -> playerLost（转旁观）
  -> 广播 opApplied（双方）；单方事件（playerLost/gameWon）广播双方
```

### 共享计时
- GameRoom 创建时记录 `startedAt`；所有 Snapshot 携带；服务端不主动推时钟，各端用本地时钟显示 `now - startedAt`（局域网时钟误差可忽略；joined 时校准一次）

## 前端编排

### 模式选择编排（MenuScene）
```
线上游戏 -> 难度选择 -> WebSocketClient.connect(ws://<页面host>:8081)
  -> 失败：中文提示"无法连接到服务器"，留在菜单
  -> 成功：send join{difficulty} -> 等待 joined -> 进入 GameScene(OnlineGameController)
本地游戏 -> 现有流程（含存档续玩），零改动
```

### 联机对局编排（GameScene + OnlineGameController）
- 输入路径：用户输入 -> OnlineGameController -> `op` 消息 -> （服务端确认）-> `opApplied` -> 更新镜像 -> EventBus 渲染
- VFX 路径：仅 `opApplied.playerId == you && result == 'correct'` 触发本地 VfxManager（completedUnits 取自消息）；对方 correct 只渲染数字（蓝色）
- 加入提示：`playerJoined` -> JoinToast.show("有玩家加入")
- 旁观：`playerLost.playerId == you` -> isReadOnly()=true + 旁观覆盖层；对方 lost -> 状态栏提示
- 离开：返回主菜单/页面关闭 -> send `leave` + close()；`playerLeft` -> 状态栏提示"对方已离开，等待新玩家"
- 存档：联机模式不启用 SaveManager（本地模式独占 localStorage）
