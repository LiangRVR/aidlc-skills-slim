# Testable Properties（unit: sudoku-online-client）

PBT 框架：fast-check + Vitest（NFR-9）。前端单测不启动真实 ws——WebSocketClient 以内存桩替代，直接驱动 OnlineGameController.applyServerMessage。生成器复用 `tests/generators.ts`（协议消息生成器），新增 `tests/client-generators.ts`（PBT-07）。

## CP-1 镜像一致性（BR-C-01/02，Invariant）

**性质**：以 `joined(Snapshot)` 初始化后，对任意合法 `opApplied` 序列（由 fc 生成，含 clearedNotes/completedUnits）逐步应用，镜像满足：
1. 镜像 cells 与"Snapshot + 逐条 opApplied 简单重放的参考实现"逐格相等（owner/value/wrong/notes）；
2. 镜像永不含非法 CellEntry（BR-P-06/07/08 的客户端对应）；
3. players 与 player* 消息流一致（joined 后 ±playerJoined/playerLeft，playerLost 只改标志）。
**参考实现**：测试内独立重放器（apply = 覆盖 cell + clearedNotes 移除笔记）。

## CP-2 VFX 隔离派发（BR-C-03，Oracle）

**性质**：对任意 opApplied 消息：本地 VFX 事件被派发 ⟺ `result==='correct' 且 playerId===you`；派发的 completedUnits 与消息载荷一致。对方 correct、自己 wrong/note/erased/undone/redone 均不派发。
**说明**：VFX 事件以 EventBus spy 断言。

## CP-3 capabilities 与只读纯函数性（BR-C-06/12）

**性质**：
1. 任意联机状态下 `capabilities()` 恒为 `{hint:false, reset:false, newGame:false}`（任意消息序列后调用）；
2. `isReadOnly()` ⟺（自己在 players 中 spectating）或（disconnected）；收到自己 playerLost 后恒 true，收到对方 playerLost 不变。
**类型**：Invariant。

## CP-4 人数徽标驱动（BR-C-10，Oracle）

**性质**：任意 joined/playerJoined/playerLeft 序列后，PlayerCountBadge 显示"在线 n/2"，n === 镜像 players.length；playerLost/opApplied 不改变 n；n ∈ {1,2}。
**说明**：Badge 以渲染文本 spy/桩断言，不启动 Phaser（组件逻辑与渲染分离：setCount 纯逻辑可测）。

## Example-based 互补场景（PBT-10）

| 场景 | 断言 |
|---|---|
| joined 初始化渲染 | snapshot() 含 81 格 owners；you 正确；Badge "在线 1/2" 或 "在线 2/2" |
| 自己填对 | VFX 事件 1 次，completedUnits 透传；镜像 cell owner=you |
| 对方填对 | 无 VFX；渲染快照中该格 owner=对方 id |
| 自己错满旁观 | 自己 playerLost → isReadOnly()=true；后续 inputDigit 不发消息 |
| 对方离开/补位 | Badge 2/2→1/2→2/2；JoinToast 两次文本正确 |
| gameWon | 覆盖层数据 elapsedSeconds 与消息一致；status='won' |
| 连接失败 | connect reject → 中文提示文案；不进入 GameScene |
| 断线 | onClose → isReadOnly()=true + DisconnectOverlay |
| opRejected（空栈 undo） | 镜像无变化，无异常 |
| 非法帧 | ws onMessage 不回调，console 警告 |
| FR-29 回归门禁 | **既有 121 个测试全部保持绿色**（LocalGameController 改名后仅 import 路径调整允许触动既有测试的 import 行） |

## 与 PBT 规则对照
| 规则 | 落实 |
|---|---|
| PBT-02 往返 | shared-protocol 已覆盖 |
| PBT-05 Oracle | CP-2/CP-4 |
| PBT-06 Invariant | CP-1/CP-3 |
| PBT-07 集中生成器 | tests/client-generators.ts（复用 tests/generators.ts） |
| PBT-08 seed 输出 | fast-check 默认 |
| PBT-09 框架 | fast-check（已在 devDependencies） |
| PBT-10 互补 | 上表 10 个场景 + FR-29 回归门禁 |
