# Domain Entities（unit: sudoku-online-client）

## 实体总览

```
GameScene ──> IGameController
                ├── LocalGameController（改名，既有）
                └── OnlineGameController ──> WebSocketClient ──> (ws) ──> sudoku-server
                        │ 持有 MirrorState
                        └──> EventBus（复用 src/core，驱动既有渲染管线）
GameScene ──> JoinToast / PlayerCountBadge（仅联机）
BoardView <── BoardSnapshot（扩展 owners 字段）
```

## IGameController（接口，src/core/game-controller.ts 改动）

契约以 component-methods-round4.md §IGameController 为准，不重复罗列。关键语义：
- `isReadOnly()`：本地恒 false；联机=旁观||断线。
- `capabilities()`：本地全 true；联机全 false。

## OnlineGameController（新增，src/net/online-game-controller.ts，Q2 定稿）

| 字段 | 类型 | 说明 |
|---|---|---|
| bus | EventBus | 复用既有事件管线（state:changed 等），GameScene 无需区分控制器实现即可渲染 |
| ws | WebSocketClient | 连接通道 |
| mirror | MirrorState | 服务端状态投影（见下） |
| noteMode | boolean | 本地笔记模式（BR-C-04） |
| disconnected | boolean | 断线标志（→ isReadOnly） |

- **方法**：IGameController 全部（输入→op 消息）+ `applyServerMessage(msg: ServerMessage): void` + `snapshot(): BoardSnapshot`（含 owners）。
- **依赖方向**：`src/net` → `src/core`（EventBus/types）、`shared/protocol`、`src/ui`（BoardSnapshot 类型）；单向，无环。

## MirrorState（镜像，内嵌于 OnlineGameController）

| 字段 | 类型 | 来源消息 |
|---|---|---|
| cells | CellEntry[81] | joined 初始化；opApplied 增量 |
| players | PlayerInfo[] | joined / playerJoined / playerLeft / playerLost |
| startedAt | number | joined |
| status | 'playing' \| 'won' | joined / gameWon |
| you | PlayerId | joined |
| myMistakes | number | players 中自己项（playerLost/opApplied 同步） |

- **不变量**：只在 applyServerMessage 内被修改；与最后收到的 Snapshot + 后续 opApplied 流严格一致（testable-properties CP-1）。

## WebSocketClient（新增，src/net/ws-client.ts）

| 成员 | 说明 |
|---|---|
| connect(url): Promise\<void\> | 失败 reject（BR-C-08） |
| send(msg: ClientMessage): void | serialize 后发送；未连接时静默丢弃（防御） |
| onMessage(cb): void | deserialize 成功才回调；非法帧 console 警告忽略（shared-protocol 设计） |
| onClose(cb): void | 断线回调 |
| close(): void | 主动关闭（不触发断线覆盖层——主动离开语义由调用方区分） |

## BoardSnapshot 扩展（src/ui/board-view.ts 改动）

| 新增字段 | 类型 | 说明 |
|---|---|---|
| owners | (PlayerId \| null)[81] | 每格归属；BoardView 以 `owners[i]===you` 区分自己/对方着色（BR-C-09）；本地模式恒全 null（走既有渲染路径，零变化） |
| you | PlayerId \| null | 本地模式恒 null |

## PlayerCountBadge（新增，src/ui/player-count-badge.ts，FR-30）

| 成员 | 说明 |
|---|---|
| setCount(n: 1 \| 2): void | 更新文本"在线 n/2" |
| 可见性 | 仅联机模式创建；本地模式不实例化 |

## JoinToast（新增，src/ui/join-toast.ts）

| 成员 | 说明 |
|---|---|
| show(text: string): void | 右上角非阻塞提示，~3 秒淡出（BR-C-11） |

## 与协议/服务端模型的对应

| 客户端实体 | 对应 | 说明 |
|---|---|---|
| MirrorState.cells | Snapshot.cells / opApplied.cell | 逐字段一致 |
| MirrorState.players | Snapshot.players / player* 消息 | joined 初始化后增量维护 |
| BoardSnapshot.owners | CellEntry.owner | 渲染投影 |
| myMistakes | RoomPlayer.mistakes（服务端权威） | 只镜像不本地计数（opApplied wrong 显示以服务端广播为准） |
