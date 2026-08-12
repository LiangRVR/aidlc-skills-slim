# Code Generation Plan（unit: sudoku-online-client，Round 5 竞速对抗模式）

> 本计划是 unit 3 代码生成的唯一事实源（single source of truth）。严格按步骤顺序执行，每步完成立即勾选。
> 深度：standard。故事追溯：US-31~US-40（联机对抗全部）；FR-31~FR-40；契约：component-methods-round5.md（冻结）；FD v2：business-rules BR-C-01~15 / business-logic-model / frontend-components F1~F8 / testable-properties CP-1~CP-5。
> 前置：unit 1 shared/protocol v2（63 测试绿）、unit 2 sudoku-server v2（99 测试绿）均已完成。

## 单元上下文
- **代码位置**：工作区根 `src/`（客户端既有结构，brownfield 就地修改，禁建 `*_new.*`）
- **依赖**：shared/protocol v2（types + serialize/deserialize，unit 1）；server v2 运行契约（unit 2）
- **修复用户已知缺陷**：v1 客户端对 v2 无 notes 的 CellEntry 做 `[...c.notes]` 抛 TypeError → 联机棋盘空白（src/net/online-game-controller.ts:184 区域）——Step 1 重写即修复
- **FR-40 门禁**：本地模式路径零行为变更；既有本地测试保持绿色

## Steps

- [x] Step 1：重写 `src/net/online-game-controller.ts` 为 v2（~274 行全量改写）
  - MirrorState v2：cells（无 notes）、ownNotes: Map<number,Set<number>>、players 含 score、startedAt、status、you、gameOverData；移除 myMistakes/spectating
  - applyServerMessage 按 business-logic-model §3 v2 表：joined 初始化（ownNotes←yourNotes）/ opApplied 公共部分 + scores → players 与 VFX 派发（仅自己 correct，completedUnits 透传，BR-C-03）/ opApplied 私有部分 → ownNotes 整格替换与移除（BR-C-15）/ playerLeft 仅 won 房间 / gameOver → 缓存 GameOverData + status='won' + 停表 / 移除 playerLost·gameWon 分支
  - isReadOnly() = disconnected || status==='won'（BR-C-06）；capabilities 联机恒 {hint:false,reset:false,newGame:false}（BR-C-12）
  - snapshot()：owners 着色不变（BR-C-09）；notes 投影自 ownNotes（F7 数据源变更）
  - getGameOverData(): GameOverData | null
  - WebSocketClient（src/net/ws-client.ts）仅核对 v2 类型适配，预期零改动

- [x] Step 2：新建 `src/ui/score-board.ts`（F8，FR-31/BR-C-13）
  - 两行文本"自己: n 分"/"对方: m 分"；update(scores, you)；事件驱动刷新，非交互；data-testid: score-board / score-board-self / score-board-opponent

- [x] Step 3：新建 `src/ui/game-over-overlay.ts`（FR-36~39/BR-C-14）
  - 胜/负/平局标题（winnerId===you→"你赢了"；null→"平局"；否则"你输了"）+ 双方最终分 + 用时 mm:ss + forfeit 副标题"对方已离开" + "返回主菜单"按钮
  - 复用 ResultOverlay 样式体系；ui-text.ts 按需补中文文案；data-testid: game-over-overlay / game-over-title / game-over-scores / game-over-time / game-over-back-button

- [x] Step 4：修改 `src/scenes/game-scene.ts`（仅联机路径）
  - online：挂载 ScoreBoard + GameOverOverlay；订阅改为 v2（playerJoined→toast / playerLeft(won)→toast / gameOver→终局层 / error→提示条 / 非主动 close→DisconnectOverlay）；joined 与每条 opApplied 后 ScoreBoard.update
  - 移除：playerLost 订阅、SpectatorOverlay 全部渲染、"错误 x/3"数据来源
  - local 路径一行不动（FR-40）；MenuScene 零改动

- [x] Step 5：修改 `src/ui/control-bar.ts`：移除"错误 x/3"计数显示（FR-37）；capabilities 驱动禁用不变
  - 核对 board-view.ts：BoardSnapshot.notes 类型不变（number[][81]），仅生产者改 ownNotes——预期 board-view.ts 零改动

- [x] Step 6：更新 `tests/client-generators.ts` 为 v2（PBT-07）
  - Snapshot v2 生成器（含 yourNotes 整数键、players 含 score）；**个性化 opApplied 生成器**（按接收方视角：公共部分 + 可选 notes/clearedNotes）；gameOver 生成器；复用 tests/generators.ts v2

- [x] Step 7：重写 `tests/online-game-controller.test.ts`（example-based，PBT-10）
  - 覆盖 testable-properties §Example-based 13 场景全表：joined 初始化渲染 / 自己填对 / 对方填对 / 笔记私有 / 笔记代清 / 错填覆盖归属转移 / gameOver completed 胜 / completed 平局 / forfeit 文案 / 断线只读 / opRejected 空栈 / 非法帧忽略 / 本地回归（由既有测试承担）

- [x] Step 8：重写 `tests/online-game-controller.pbt.test.ts`（CP-1~CP-5）
  - CP-1 镜像一致性（cells 参考重放 + ownNotes 独立重放，Invariant）
  - CP-2 VFX 隔离派发（Oracle）
  - CP-3 capabilities/只读纯函数性（Invariant）
  - CP-4 人数徽标驱动（Oracle，沿用）
  - CP-5 分数镜像与笔记私有（Oracle+Invariant：ScoreBoard spy 断言最近 update===最近 scores；cells 无 notes 结构性断言；note 整格替换语义）

- [x] Step 9：全量验证 + 总结制品
  - 运行 `npx vitest run`：unit 3 新测试 + unit 1/2 回归（63+99）+ 既有本地测试（FR-40 门禁）全绿
  - 运行 `npx tsc --noEmit` 全仓库类型检查
  - 生成 `aidlc-docs/construction/sudoku-online-client/code/code-summary-round5.md`（修改/新建文件清单、契约对照、测试统计）
