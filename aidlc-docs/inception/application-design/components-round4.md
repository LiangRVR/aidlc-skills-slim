# Components（Round 4 - 多人版）

**架构决策**（来自 application-design-plan-round4.md 问答）：
- 单 package 结构：根 package.json 下新增 `server/`（后端）、`shared/`（前后端共享协议类型），前端代码仍在 `src/`
- 服务端复用 `src/core` 纯 TS 核心（GameState/SudokuGenerator/SudokuSolver/RuleValidator/types）作为权威状态
- 前端双控制器：抽取控制器接口，`LocalGameController`（现有 GameController）与 `OnlineGameController` 实现同一接口
- 同步策略：操作-确认-广播（增量事件）+ 加入时全量快照
- 消息格式：JSON 文本信封 `{ version, type, payload }`（version 字段为 functional-design Q2=B 契约变更）
- **防作弊**：在线模式对错判定/错误计数/笔记清除均在服务端执行；solution 永不下发联机客户端；客户端仅发送操作意图

---

## 后端组件（server/ — 全部新增）

### S1. ServerEntry
- **Purpose**: 后端进程入口
- **Responsibilities**: 启动 ws WebSocket 服务（默认端口 8081）；连接接入/断开生命周期；将消息路由给 MessageRouter；优雅关闭
- **Interfaces**: `main(): void`（进程入口）

### S2. ConnectionManager
- **Purpose**: 连接与玩家会话管理（免登录）
- **Responsibilities**: 为每个 WebSocket 连接分配 playerId；维护 connection ↔ playerId ↔ roomId 映射；连接断开时通知 RoomManager 移除玩家
- **Interfaces**: `register(conn) / unregister(conn) / playerOf(conn) / roomOf(playerId)`

### S3. MessageRouter
- **Purpose**: 协议消息解析与分发
- **Responsibilities**: 校验消息格式（JSON 信封 `{version, type, payload}` + 逐字段校验，非法消息回复 `error`）；按 type 分发到 RoomManager/GameRoom；序列化与广播服务端消息
- **Interfaces**: `handleMessage(conn, raw: string): void`

### S4. RoomManager
- **Purpose**: 房间管理与自动匹配（FR-17）
- **Responsibilities**: 房间创建/销毁（空房间回收）；匹配算法：① 同难度最早开始的可加入房间；② 否则按档位距离由近到远找可加入房间中最早开始的，同距离时**更难档优先于更简单档**（如选"中等"：困难 → 简单 → 专家；选"困难"：专家 → 中等 → 简单；选"简单"：中等 → 困难 → 专家）；③ 均无则创建新房间；"可加入"= 对局进行中且仅 1 名玩家
- **Interfaces**: `joinOrCreate(playerId, difficulty): GameRoom` / `removePlayer(playerId): void`

### S5. GameRoom
- **Purpose**: 单房间权威对局状态与双人规则执行
- **Responsibilities**: 持有权威 GameState（复用 src/core）与谜题 solution（不下发）；应用玩家操作并判定对错；维护每玩家独立错误计数、旁观状态、各自撤销/重做栈；笔记共享与填对联动清除；共享计时起点；胜利/判负/加入/离开事件生成
- **生命周期**:
  - **创建**：玩家 `join` 且无可加入房间时，由 RoomManager 创建；创建时调用 SudokuGenerator 按所选难度生成谜题（唯一解），初始化权威 GameState，记录 `startedAt`（共享计时基准），状态置 `playing`，创建者为第 1 名玩家
  - **运行**：`playing` 状态接收第 2 名玩家加入（匹配或补位）；满 2 人后不再可加入，有玩家离开时恢复可加入
  - **终态**：棋盘完成 → 状态置 `won`，广播 `gameWon`，不再可加入；`won` 房间继续为仍在局的玩家提供同步直到其离开
  - **销毁**：在线玩家数降为 0（离开/断线，无论 `playing` 或 `won`）时由 RoomManager 立即回收，内存状态全部丢弃（纯内存存储决策）
- **Interfaces**: `addPlayer(playerId): Snapshot` / `removePlayer(playerId): void` / `applyOp(playerId, op): BroadcastEvent[]` / `isJoinable(): boolean`

---

## 共享组件（shared/ — 全部新增）

### H1. Protocol（shared/protocol.ts）
- **Purpose**: 前后端消息协议契约（类型 + 序列化）
- **Responsibilities**: 定义全部 ClientMessage / ServerMessage 类型；Snapshot / Op / CellEntry（含 owner 归属）等传输模型；serialize/deserialize 函数（PBT 往返测试目标）
- **Interfaces**: 类型定义 + `serialize(msg) / deserialize(raw)` 

---

## 前端组件（src/ — 新增与改动）

### F1. GameController 接口抽取（改动 src/core/game-controller.ts）
- **Purpose**: 统一本地/联机控制器契约
- **Responsibilities**: 抽取 `IGameController` 接口（GameScene 只依赖接口）；现有 GameController 更名为实现 `LocalGameController`，行为零变化（FR-29）
- **Interfaces**: `IGameController`（方法集见 component-methods-round4.md）

### F2. OnlineGameController（新增 src/core/online-game-controller.ts）
- **Purpose**: 联机模式控制器，实现 IGameController
- **Responsibilities**: 将本地输入转换为操作消息发送服务端；维护镜像棋盘状态用于渲染；应用服务端广播（对方填数蓝色、笔记同步、旁观锁定）；本地 VFX 仅在自己填对的确认事件时触发；撤销/重做仅发送自己的操作；旁观状态阻断输入；提示/重开/新游戏禁用
- **Interfaces**: 同 IGameController + `applyServerMessage(msg): void`

### F3. WebSocketClient（新增 src/net/ws-client.ts）
- **Purpose**: WebSocket 连接封装
- **Responsibilities**: 连接/断开；JSON 消息收发；连接失败回调（中文错误提示）；断线回调
- **Interfaces**: `connect(url) / send(msg) / onMessage(cb) / onClose(cb) / close()`

### F4. MenuScene 扩展（改动 src/scenes/menu-scene.ts）
- **Purpose**: 模式选择入口（FR-15）
- **Responsibilities**: 提供"线上游戏 / 本地游戏"两个选项；本地路径保持现有行为（含存档续玩）；线上路径进入难度选择后发起连接与匹配
- **Interfaces**: Phaser Scene 生命周期

### F5. GameScene 联机适配（改动 src/scenes/game-scene.ts）
- **Purpose**: 对局场景同时支持两种控制器
- **Responsibilities**: 依模式实例化 Local/Online 控制器；联机模式：显示对手状态（对方错误计数）、旁观覆盖层、连接失败提示、返回菜单即离开房间；联机模式禁用本地存档（SaveManager 不启用）
- **Interfaces**: Phaser Scene 生命周期

### F6. JoinToast（新增 src/ui/join-toast.ts）
- **Purpose**: 新玩家加入的非阻塞提示（FR-19）
- **Responsibilities**: 界面右上方显示"有玩家加入"提示，自动淡出；不弹模态、不抢占输入
- **Interfaces**: `show(text: string): void`

### F7. BoardView 归属着色（改动 src/ui/board-view.ts）
- **Purpose**: 对方填入数字的蓝色区分（FR-20）
- **Responsibilities**: 渲染数据增加 cell owner 归属（自己/对方/预填）；对方填入数字渲染为蓝色，自己保持黑色，错填仍标红
- **Interfaces**: `render(snapshot)`（snapshot 含 owner 信息）
