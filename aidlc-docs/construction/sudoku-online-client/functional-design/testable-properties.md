# Testable Properties（unit: sudoku-online-client）— Round 5 v2（竞速对抗模式）

PBT 框架：fast-check + Vitest（NFR-9/10）。不启动真实 ws——WebSocketClient 内存桩，直接驱动 applyServerMessage。生成器复用 `tests/generators.ts`（v2 协议生成器），更新 `tests/client-generators.ts`（PBT-07）。

## CP-1 镜像一致性（BR-C-01/02/15，Invariant，v2 修订）

**性质**：以 `joined(Snapshot v2)` 初始化后，对任意**个性化 opApplied 流**（生成器按接收方视角生成：公共部分 + 可选 notes/clearedNotes）逐步应用：
1. 镜像 cells 与"Snapshot + 逐条 opApplied 公共部分简单重放的参考实现"逐格相等（owner/value/wrong）；
2. 镜像 ownNotes 与"yourNotes + notes 整格替换 + clearedNotes 移除的参考实现"逐格相等；
3. 镜像永不含非法 CellEntry；**ownNotes 键只出现在 value===0 的格子上**（BR-P-11 客户端对应）；
4. players 与 player* 消息流一致；players[].score 与最近一条 opApplied.scores 一致。
**参考实现**：测试内独立重放器（公共字段重放 + ownNotes 独立重放）。

## CP-2 VFX 隔离派发（BR-C-03，Oracle，沿用）

**性质**：本地 VFX 事件被派发 ⟺ `result==='correct' 且 playerId===you`；completedUnits 透传一致。对方 correct、自己 wrong/note/erased/undone/redone 均不派发。

## CP-3 capabilities 与只读纯函数性（BR-C-06/12，v2 修订）

**性质**：
1. 任意联机状态下 `capabilities()` 恒为 `{hint:false, reset:false, newGame:false}`；
2. `isReadOnly()` ⟺ `disconnected || status==='won'`（v2：gameOver 后恒 true；**任何消息序列中不存在旁观路径**）。
**类型**：Invariant。

## CP-4 人数徽标驱动（BR-C-10，Oracle，沿用）

**性质**：任意 joined/playerJoined/playerLeft 序列后 Badge 显示"在线 n/2"，n === 镜像 players.length；gameOver/opApplied 不改变 n；n ∈ {1,2}。

## CP-5 分数镜像与笔记私有（BR-C-13/15，v2 新增，NFR-10 点名）

**性质**：
1. 任意 opApplied 流后，ScoreBoard 收到的最近 update 载荷 === 最近一条 opApplied.scores（Oracle，update 调用 spy 断言）；
2. 镜像 ownNotes 只含自己的笔记——生成器构造的流中混入"对方笔记"信息不存在于任何 v2 消息字段，断言镜像中无除 ownNotes 外的笔记载体（结构性：cells 无 notes 字段）；
3. result='note' 的 opApplied 携带 notes 时，ownNotes[cellIndex] 与 notes 全集严格相等（整格替换语义）。
**类型**：Oracle + Invariant。

## Example-based 互补场景（PBT-10，v2 修订）

| 场景 | 断言 |
|---|---|
| joined 初始化渲染 | snapshot() 含 81 格 owners；you 正确；ownNotes=yourNotes；Badge 正确；ScoreBoard 初始分 |
| 自己填对 | VFX 1 次；镜像 cell owner=you；ScoreBoard 更新为 scores |
| 对方填对 | 无 VFX；该格 owner=对方；ScoreBoard 对方分数变化 |
| 笔记私有 | result='note' 副本 → ownNotes[cellIndex]=notes；渲染快照 notes 同步 |
| 笔记代清 | clearedNotes 格从 ownNotes 移除 |
| 错填覆盖 | 对方 wrong 格经自己 correct opApplied 后 owner=you、wrong=false |
| gameOver completed 胜 | 覆盖层数据：winnerId=you→"你赢了"；scores/elapsedSeconds 透传；isReadOnly()=true |
| gameOver completed 平局 | winnerId=null→"平局" |
| gameOver forfeit | reason='forfeit'→文案含"对方已离开" |
| 断线 | onClose → isReadOnly()=true + DisconnectOverlay |
| opRejected（空栈 undo） | 镜像无变化，无异常 |
| 非法帧 | ws onMessage 不回调 |
| FR-40 回归门禁 | **既有本地测试全部保持绿色**（LocalGameController 零行为变更） |

## 与 PBT 规则对照
| 规则 | 落实 |
|---|---|
| PBT-02 往返 | shared-protocol 已覆盖（v2） |
| PBT-05 Oracle | CP-2/CP-4/CP-5 |
| PBT-06 Invariant | CP-1/CP-3/CP-5 |
| PBT-07 集中生成器 | tests/client-generators.ts（复用 tests/generators.ts v2） |
| PBT-08 seed 输出 | fast-check 默认 |
| PBT-09 框架 | fast-check（已在 devDependencies） |
| PBT-10 互补 | 上表 13 个场景 + FR-40 回归门禁 |
