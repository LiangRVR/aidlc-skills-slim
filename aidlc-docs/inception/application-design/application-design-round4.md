# Application Design（Round 4 - 多人版，合并稿）

## 架构总览

纯前端 SPA 演进为 **前端 + WebSocket 后端** 双进程应用，单 package 结构：

```
workspace-root/
  src/        前端（Phaser 表现层 + 纯 TS core + 新增 net/ 联机层）
  server/     后端（Node.js + TypeScript + ws，内存态）
  shared/     前后端共享消息协议（类型 + 序列化）
```

**关键决策**（application-design-plan-round4.md 问答）：
1. 单 package：`server/` + `shared/` 与 `src/` 同 package.json，直接 import 共享 TS 类型
2. 服务端复用 `src/core` 纯 TS 核心作为权威状态（GameState/Generator/Solver/RuleValidator）
3. 前端双控制器 `IGameController`：LocalGameController（现有，零行为变化）/ OnlineGameController
4. 操作-确认-广播（增量）+ joined 全量快照
5. JSON `{version, type, payload}` 信封消息（version 字段为 functional-design Q2=B 决策，当前恒定 1，为后续演进预留）
6. **防作弊**：判定/计数/笔记清除全部服务端执行；solution 不下发联机客户端；客户端仅发操作意图（残余风险：外部求解器辅助，局域网合作演示场景可接受）

## 组件清单

**后端（新增）**：S1 ServerEntry、S2 ConnectionManager、S3 MessageRouter、S4 RoomManager、S5 GameRoom
**共享（新增）**：H1 Protocol（shared/protocol.ts，契约冻结于 component-methods-round4.md）
**前端（新增）**：F2 OnlineGameController、F3 WebSocketClient、F6 JoinToast
**前端（改动）**：F1 GameController→IGameController 接口抽取（现有实现改 LocalGameController）、F4 MenuScene 模式选择、F5 GameScene 联机适配、F7 BoardView 归属着色

## FR 覆盖校验

| 需求 | 设计落点 |
|---|---|
| FR-15 模式选择 | F4 MenuScene（线上/本地）；本地路径零改动 |
| FR-16 后端服务/免登录 | S1+S2（连接即分配 playerId，无账号）；F3 连接失败中文提示 |
| FR-17 开局与匹配 | S4 RoomManager.joinOrCreate/findMatch（同难度最早 > 档位距离升序（同距离更难优先）最早 > 创建；joinable=playing 且 1 人） |
| FR-18 实时共享 | S5 GameRoom 权威状态 + opApplied 广播 + joined Snapshot |
| FR-19 加入提示 | `playerJoined` → F6 JoinToast（右上角非阻塞） |
| FR-20 特效/视觉隔离 | F2 仅自己 correct 触发 VFX（completedUnits 服务端附带）；F7 归属着色（自己蓝/对方黑）、错填均红 |
| FR-21 笔记共享/清除 | CellEntry.notes 不区分归属；fill 正确时服务端清除并广播 clearedNotes |
| FR-22 合作胜利 | S5 全盘完成 → `gameWon` 广播双方 |
| FR-23 独立错误/旁观 | PlayerInfo.mistakes 各自计数；满 3 → `playerLost` 转旁观；F2 isReadOnly 阻断 |
| FR-24 共享计时 | Snapshot.startedAt（房间创建起算），各端本地显示 now-startedAt |
| FR-25 撤销/提示限制 | S5 校验 undo/redo 仅限自己操作；capabilities() 联机 hint/reset/newGame=false |
| FR-26 错填互擦 | erase 操作不限填写者（S5 仅校验格子可写） |
| FR-27 禁用重开/新游戏 | capabilities()=false；返回菜单即 `leave` |
| FR-28 断线补位 | S2 unregister → S4 removePlayer 广播 `playerLeft`，房间保留可再匹配；补位玩家 mistakes=0 |
| FR-29 本地回归 | LocalGameController 零改动；联机改动全部走新组件与接口分支 |

覆盖率 100%（FR-15~FR-29），无超出需求范围的组件。

## GameRoom 生命周期

- **创建**：`join` 未命中匹配时由 RoomManager 创建——生成谜题（唯一解）、初始化权威 GameState、记录 `startedAt`、状态 `playing`
- **状态机**：`playing`（1-2 人，可加入/可游戏）→ `won`（棋盘完成，终态，不可加入，仍同步给在局玩家）；玩家个人 `playing → spectating` 不影响房间状态
- **销毁**：在线玩家数降为 0（离开/断线，playing 或 won 均可）时 RoomManager 立即回收，内存状态丢弃；无定时清理任务

## 一致性
- 与 RE 制品一致：core 纯 TS 无 Phaser 依赖（architecture.md/code-structure.md），复用成立
- 与 requirements.md FR-15~FR-29、stories.md US-15~US-29 对齐
- 依赖无环：`scenes -> controllers -> (core | net -> shared)`；`server -> (core | shared)`；`src` 与 `server` 之间仅经 `shared/`
- 遗留定稿项：OnlineGameController 文件归属（`src/core/` vs `src/net/`）在 Functional Design 定稿，不影响接口契约
