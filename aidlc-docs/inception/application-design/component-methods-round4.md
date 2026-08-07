# Component Methods & 消息协议（Round 4 - 多人版）

**本文件冻结前后端 WebSocket 消息协议契约**（Unit 1 / Unit 2 的协调点）。详细业务规则在 Functional Design（per unit）定义。

## 共享传输模型（shared/protocol.ts）

```typescript
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';   // 复用 src/core/types
type PlayerId = string;                                     // 服务端分配的 UUID
type RoomId = string;

// 操作（客户端意图，不含判定结果）
type Op =
  | { kind: 'fill'; index: number; value: number }          // 1-9
  | { kind: 'erase'; index: number }
  | { kind: 'note'; index: number; value: number }          // toggle 候选数
  | { kind: 'undo' }
  | { kind: 'redo' };

// 棋盘格传输模型：value=0 表示空；owner 区分归属
interface CellEntry {
  value: number;                        // 0-9
  given: boolean;
  owner: PlayerId | null;               // 填写者（given 或空时为 null）
  wrong: boolean;                       // 错填标红
  notes: number[];                      // 共享笔记（不区分归属）
}

interface PlayerInfo {
  id: PlayerId;
  mistakes: number;                     // 0-3，各自独立
  spectating: boolean;                  // 错满 3 次转旁观
}

interface Snapshot {                    // 全量状态（加入时下发）
  roomId: RoomId;
  difficulty: Difficulty;
  cells: CellEntry[81];
  players: PlayerInfo[];                // 1-2 人
  startedAt: number;                    // 房间创建时间戳（共享计时基准）
  status: 'playing' | 'won';
  you: PlayerId;
}
```

## 客户端 → 服务端消息（ClientMessage）

| type | payload | 说明 |
|---|---|---|
| `join` | `{ difficulty: Difficulty }` | 请求匹配/创建房间（连接建立后首条消息） |
| `op` | `Op` | 游戏操作意图 |
| `leave` | `{}` | 主动离开房间（返回主菜单；断开连接等效） |

## 服务端 → 客户端消息（ServerMessage）

| type | payload | 说明 |
|---|---|---|
| `joined` | `Snapshot` | 匹配成功/房间创建，全量快照（FR-17/FR-18） |
| `opApplied` | `{ playerId, op, result, cell, clearedNotes, completedUnits }` | 操作已应用（见下注） |
| `opRejected` | `{ playerId, reason }` | 操作被拒（旁观/非法格/非自己 undo 等） |
| `playerJoined` | `{ player: PlayerInfo }` | 新玩家加入（触发 JoinToast，FR-19） |
| `playerLeft` | `{ playerId }` | 对方离开，房间保留可补位（FR-28） |
| `playerLost` | `{ playerId }` | 该玩家错满 3 次转旁观（FR-23） |
| `gameWon` | `{ elapsedSeconds }` | 合作胜利（FR-22） |
| `error` | `{ message }` | 协议级错误 |

`opApplied.result`: `'correct' | 'wrong' | 'note' | 'erased' | 'undone' | 'redone'`
`opApplied.cell`: 变化后的 CellEntry；`clearedNotes`: 被联动清除笔记的格子索引列表；`completedUnits`: 因本次填对而新完成的行/列/宫（仅 correct 且由服务端计算——客户端无 solution）

## 序列化（PBT 往返测试目标）
- **信封格式**（functional-design Q2=B 契约变更）：所有消息统一 `{ version, type, payload }`；version 当前恒定 1，不一致即拒绝并提示版本不兼容
- `serialize(msg: ClientMessage | ServerMessage): string` — 自动注入 version + JSON.stringify
- `deserialize(raw: string): ClientMessage | ServerMessage | null` — 解析 + 版本校验 + 逐字段严格校验（functional-design Q1=A），非法返回 null，不抛异常

## 后端组件方法

### ServerEntry
- `main(): void` — 启动 ws 服务（默认 `0.0.0.0:8081`，支持 `PORT` 环境变量）；接入 ConnectionManager/MessageRouter

### ConnectionManager
- `register(conn: WebSocket): PlayerId`
- `unregister(conn: WebSocket): void` — 触发 RoomManager.removePlayer
- `playerOf(conn: WebSocket): PlayerId | null`
- `send(playerId: PlayerId, msg: ServerMessage): void`

### MessageRouter
- `handleMessage(conn: WebSocket, raw: string): void` — deserialize 失败回复 `error`；`join` → RoomManager.joinOrCreate；`op` → GameRoom.applyOp；`leave` → RoomManager.removePlayer

### RoomManager
- `joinOrCreate(playerId: PlayerId, difficulty: Difficulty): { room: GameRoom; snapshot: Snapshot }` — 匹配逻辑：同难度最早开始 > 档位距离升序（同距离更难档优先）中最早开始 > 创建（详见 services-round4.md 匹配编排）
- `removePlayer(playerId: PlayerId): void` — 广播 `playerLeft`；房间在线人数为 0 则回收销毁
- `findMatch(difficulty: Difficulty): GameRoom | null` — 仅返回 joinable 房间

### GameRoom
- **生命周期**：创建（join 未命中时，生成谜题 + startedAt，状态 playing）→ playing（1-2 人，可加入/可游戏）→ won（棋盘完成，终态不可加入）→ 销毁（在线人数 0 时 RoomManager 回收）
- `addPlayer(playerId: PlayerId): Snapshot` — 满 2 人拒绝（路由层保证不发生）；生成全量快照
- `removePlayer(playerId: PlayerId): void`
- `applyOp(playerId: PlayerId, op: Op): void` — 校验（旁观/格子可写/undo 仅限自己）→ 应用权威 GameState → 广播 `opApplied`/`opRejected`/`playerLost`/`gameWon`
- `isJoinable(): boolean` — status=='playing' 且在线玩家数==1
- `snapshotFor(playerId: PlayerId): Snapshot`

## 前端组件方法

### IGameController（接口抽取，GameScene 只依赖它）
- `newGame(difficulty: Difficulty): void`（联机模式由匹配代替，接口保留语义）
- `inputDigit(value: CellValue): { index: CellIndex; result: 'correct' | 'wrong' | 'ignored' | 'note' } | null`
- `erase(): void` / `undo(): void` / `redo(): void` / `hint(): void` / `reset(): void` / `toggleNoteMode(): void`
- `selectCell(index: CellIndex): void`
- `tick(seconds: number): void`
- `isReadOnly(): boolean` — 联机旁观/连接断开时为 true（GameScene 阻断输入）
- `capabilities(): { hint: boolean; reset: boolean; newGame: boolean }` — 联机模式三者均 false

### OnlineGameController（实现 IGameController）
- `constructor(bus: EventBus, ws: WebSocketClient)`
- `applyServerMessage(msg: ServerMessage): void` — 更新镜像状态并经 EventBus 触发渲染；`opApplied` 且 playerId==自己且 result=='correct' 时派发本地 VFX 事件（含 completedUnits）
- 其余接口方法将输入转为 `op` 消息发送（本地不先行改棋盘，等服务端确认——权威一致）
- `snapshot(): BoardSnapshot` — 供 BoardView 渲染（含 owner 归属：自己/对方/given）

### WebSocketClient
- `connect(url: string): Promise<void>` — 失败 reject（GameScene 显示中文连接失败提示）
- `send(msg: ClientMessage): void`
- `onMessage(cb: (msg: ServerMessage) => void): void`
- `onClose(cb: () => void): void`
- `close(): void`

### JoinToast
- `show(text: string): void` — 右上角非阻塞提示，~3 秒自动淡出

### MenuScene（改动点）
- 模式选择：`线上游戏` → 难度选择 → 连接 `ws://<host>:8081` → 发送 `join`；`本地游戏` → 现有流程不变

### GameScene（改动点）
- 依模式构造 Local/Online 控制器；联机模式：订阅 `playerJoined` → JoinToast、`playerLost`/`gameWon` → 对应覆盖层、`isReadOnly()` 阻断输入；返回主菜单时发送 `leave` 并 `close()`；不实例化 SaveManager 自动存档
