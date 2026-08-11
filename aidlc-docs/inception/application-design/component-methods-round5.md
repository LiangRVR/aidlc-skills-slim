# Component Methods & 消息协议 v2（Round 5 - 竞速对抗模式）

**本文件冻结 Round 5 前后端 WebSocket 消息协议契约（v2）**。详细业务规则在 Functional Design（per unit）定义。取代 component-methods-round4.md 的协议部分（Round 4 组件结构描述仍有效，差异以本文件为准）。

## 协议版本

- 信封格式不变：`{ version, type, payload }`；**version 升 2**
- 服务端收到 version≠2 的连接/消息 → 按既有非法版本路径处理（回复 `error`，BR-S-15 语义保留）（Application Design Q1=A）

## 共享传输模型（shared/protocol.ts）

```typescript
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';   // 复用 src/core/types
type PlayerId = string;
type RoomId = string;

// 操作（客户端意图）——与 v1 相同
type Op =
  | { kind: 'fill'; index: number; value: number }          // 1-9
  | { kind: 'erase'; index: number }
  | { kind: 'note'; index: number; value: number }          // toggle 候选数（私有，FR-34）
  | { kind: 'undo' }
  | { kind: 'redo' };

// 棋盘格公共传输模型：notes 字段移除（笔记私有化，FR-34）
interface CellEntry {
  value: number;                        // 0-9
  given: boolean;
  owner: PlayerId | null;
  wrong: boolean;
}

interface PlayerInfo {
  id: PlayerId;
  score: number;                        // >= 0（FR-31 下限 0）；mistakes/spectating 移除（FR-37）
}

interface Snapshot {                    // 全量状态（加入时下发）
  roomId: RoomId;
  difficulty: Difficulty;
  cells: CellEntry[81];
  players: PlayerInfo[];                // 1-2 人，含双方分数
  yourNotes: Record<number, number[]>;  // 仅自己的私有笔记（cellIndex -> digits），对方笔记永不下发
  startedAt: number;
  status: 'playing' | 'won';
  you: PlayerId;
}
```

## 客户端 → 服务端消息（ClientMessage）——与 v1 相同

| type | payload | 说明 |
|---|---|---|
| `join` | `{ difficulty: Difficulty }` | 请求匹配/创建房间 |
| `op` | `Op` | 游戏操作意图 |
| `leave` | `{}` | 主动离开房间（playing 中离开 = 认输，FR-36/FR-38） |

## 服务端 → 客户端消息（ServerMessage v2）

| type | payload | 说明 |
|---|---|---|
| `joined` | `Snapshot` | 匹配成功/房间创建（含 yourNotes 私有笔记） |
| `opApplied` | 见下"个性化负载" | 操作已应用（含双方最新分数，Q2=A） |
| `opRejected` | `{ playerId, reason }` | 操作被拒；reason 集修订：移除 `'spectating'`，保留 `'not-overwritable'/'no-op'/'nothing-to-undo'/'nothing-to-redo'/'game-over'` 等 |
| `playerJoined` | `{ player: PlayerInfo }` | 新玩家加入（JoinToast，FR-19） |
| `playerLeft` | `{ playerId }` | 仅 won 房间成员离开时广播；playing 中离开直接走 `gameOver`（FR-38） |
| `gameOver` | `{ winnerId: PlayerId \| null, reason: 'completed' \| 'forfeit', scores: Record<PlayerId, number>, elapsedSeconds }` | 终局结算（FR-36/FR-39）；winnerId=null 为平局；**取代 v1 的 gameWon 与 playerLost** |
| `error` | `{ message }` | 协议级错误 |

### opApplied 个性化负载（Q5=A：同一 op 向不同玩家发送不同负载）

```typescript
interface OpApplied {
  playerId: PlayerId;                   // 操作发起者（公共）
  op: Op;                               // 公共
  result: 'correct' | 'wrong' | 'note' | 'erased' | 'undone' | 'redone';  // 公共
  cell?: CellEntry;                     // 公共：fill/erase/undo/redo 引起的格子变化（note op 无）
  completedUnits?: CompletedUnit[];     // 公共：correct 时新完成的行/列/宫
  scores: Record<PlayerId, number>;     // 公共：双方最新总分（连击计数不下发，Q2 补充）
  // —— 以下仅存在于发给"归属者本人"的个性化副本 ——
  notes?: number[];                     // 私有：note op 后该格自己的笔记全集
  clearedNotes?: number[];              // 私有：本次操作联动清除/恢复的、自己的笔记格索引
}
```

- **note op**：`opApplied` 仅回发发起者（对方收不到任何事件，FR-34）
- **fill correct**：双方均收到公共部分；各自的 `clearedNotes` 仅出现在自己的副本中（服务端代清双方私有笔记，FR-34）
- **undo/redo**：格子变化公共；联动笔记恢复仅作用于发起者自己的笔记，体现在发起者副本的 `clearedNotes`

## 后端组件方法（Round 5 变更）

### ScoreEngine（新增 S6，纯模块，`server/score-engine.ts`；Q3=A）

无状态纯函数，输入当前状态输出新状态与增量；GameRoom 持有每玩家 `ScoreState` 并调用。

```typescript
interface ScoreState { score: number; combo: number }   // combo 服务端内部状态，不下发

applyFillCorrect(s: ScoreState): { next: ScoreState; delta: number }
  // combo' = combo+1；delta = 100 + (combo' >= 3 ? 20 : 0)
applyFillWrong(s: ScoreState): { next: ScoreState; delta: number }
  // delta = -min(100, score)；combo 清零
applyUndoFill(s: ScoreState, recordedDelta: number): { next: ScoreState; delta: number }
  // recordedDelta > 0（原正确填入）：delta = -min(recordedDelta, score)
  // recordedDelta < 0（原错填）：delta = 0（错填扣分永久不返还，FR-33）；combo 清零
applyRedoFill(s: ScoreState, recordedDelta: number): { next: ScoreState; delta: number }
  // 原正确填入：delta = +recordedDelta；原错填：delta = 0；combo 清零
applyErase(s: ScoreState, erasedCellCorrect: boolean): { next: ScoreState; delta: number }
  // erasedCellCorrect：delta = -min(100, score)；否则 delta = 0；combo 清零（FR-32 ③）
```

- 每次 fill 的 delta（含连击加成）记入该玩家的 undo 栈记录，供 undo/redo 对称结算（FR-33）
- note op 不经 ScoreEngine（不影响分数与连击）
- 对方任何操作不影响本玩家 ScoreState（**【Application Design 变更】原 applyOpponentCorrect 已删除**：连击不被对手打断，FR-32 修订）

### GameRoom（S5，重大修订）

- **新增状态**：`scores: Map<PlayerId, ScoreState>`；`notesByPlayer: Map<PlayerId, Map<number, Set<number>>>`（Q4=A，core GameState 零改动）；`hadTwoPlayers: boolean`（第二名玩家加入时置 true，用于离开判胜）
- `applyOp(playerId, op)` —— 按新权限矩阵裁决（Functional Design 细化）：
  - fill：目标格为空格 / 归属者=自己 / 任意 wrong=true 格；覆盖成功归属转移
  - erase：仅归属者自己的格
  - note：仅作用于自己的 notesByPlayer；确认仅回发发起者
  - undo/redo：仅自己的操作栈；分数按 ScoreEngine.applyUndoFill/applyRedoFill 结算
- `finalize(reason: 'completed' | 'forfeit'): void` — 计算胜负（completed 比分数，forfeit 在局者胜）→ 广播 `gameOver` → status='won'
- `snapshotFor(playerId): Snapshot` — 含该玩家 yourNotes 与双方分数
- 移除：mistakes 计数、playerLost 路径、旁观状态（FR-37）；移除：补位语义（FR-38）
- 广播顺序约束保留：同一 op 触发的 `opApplied` 先于 `gameOver`（BR-S-20 语义延续）

### RoomManager（S4，修订）

- `removePlayer(playerId)`：
  - 房间 playing 且 hadTwoPlayers → `room.finalize('forfeit')`（在局者胜），不广播 playerLeft、不进入补位（FR-38）
  - 房间 playing 且仅 1 人 → 原语义（离开即房间空置，回收检查）
  - 房间 won → 广播 playerLeft，回收检查（在线 0 销毁，BR-S-13 保留）
- 匹配逻辑不变（FR-17 保留）

### ConnectionManager / MessageRouter / ServerEntry（S1/S2/S3，无契约变更）

- S2 `send(playerId, msg)` 天然支持个性化副本下发（Q5=A 的承载点）

## 前端组件方法（Round 5 变更）

### ScoreBoard（新增 F8）

- `update(scores: Record<PlayerId, number>, you: PlayerId): void` — 渲染双方分数（自己/对方两行）；随 opApplied.scores 即时更新；仅线上模式挂载（FR-40）

### OnlineGameController（F2，重大修订）

- `applyServerMessage(msg)`：
  - `opApplied`：更新镜像棋盘 + ScoreBoard；`playerId==you && result=='correct'` 触发本地 VFX（FR-20 保留）；私有字段（notes/clearedNotes）更新**自己的**私有笔记镜像
  - `gameOver`：缓存结算数据（胜负/双方分数/用时）供 GameScene 展示
  - 移除：playerLost 处理、旁观只读逻辑（FR-37）
- 笔记镜像私有化：镜像中仅维护自己的 notes（对方笔记永不存在于客户端）
- `isReadOnly()`：仅连接断开/终局时为 true（不再有旁观态）

### GameScene（F5，修订）

- 新增终局结算覆盖层：`gameOver` → 展示双方最终分数、胜/负/平局、用时（FR-39）；移除旁观覆盖层
- `playerLeft`（won 房间）→ 状态栏提示
- 挂载 ScoreBoard（F8）

### BoardView（F7，修订）

- 笔记渲染数据源改为控制器提供的**自己**的私有笔记镜像；归属着色规则不变（自己蓝/对方黑/错填红，FR-20 保留）

### 其余组件（F1 LocalGameController / F3 WebSocketClient / F4 MenuScene / F6 JoinToast）

- 无变更（本地模式零改动，FR-40）

## 序列化（PBT 往返测试目标）

- `serialize`/`deserialize` 契约同 v1（严格逐字段校验、非法返回 null），version 常量改为 2
- 新增类型（OpApplied 个性化字段、PlayerInfo.score、Snapshot.yourNotes、gameOver）纳入 v2 校验
