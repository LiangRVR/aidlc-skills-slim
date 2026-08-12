# Code Summary（unit: sudoku-online-client，Round 5 竞速对抗模式）

> 计划：`aidlc-docs/construction/plans/sudoku-online-client-code-generation-plan-round5.md`（9/9 [x]）
> 契约：`component-methods-round5.md`（冻结）；FD v2：BR-C-01~15 / CP-1~CP-5

## 修改文件（brownfield 就地修改）
| 文件 | 变更 |
|---|---|
| `src/net/online-game-controller.ts` | **全量重写 v2**：MirrorState v2（cells 无 notes、ownNotes 私有镜像、players 含 score、gameOverData）；applyServerMessage v2 消息表（BLM §3）；isReadOnly=disconnected‖won（BR-C-06）；snapshot() notes 投影自 ownNotes；导出 GameOverData 与 ONLINE_SCORES_EVENT；移除 myMistakes/spectating/playerLost/gameWon——**修复 v1 `[...c.notes]` 崩溃（联机棋盘空白 bug）** |
| `src/scenes/game-scene.ts` | 仅联机路径：挂载 ScoreBoard/GameOverOverlay；订阅 v2（gameOver→终局层、ONLINE_SCORES_EVENT→ScoreBoard.update）；移除 SpectatorOverlay/playerLost 全部渲染；**local 路径零改动（FR-40）** |
| `src/ui/control-bar.ts` | 移除"错误 x/3"计数显示（FR-37）；capabilities 驱动禁用不变 |
| `src/ui/ui-text.ts` | 补 formatScoreLine 等 v2 中文文案 |
| `scripts/e2e-smoke.ts` | v2 场景重写：note 私有（对方零感知）/ fill 广播带 cellIndex+scores / forfeit 终局 / 无补位（C 进新房间）/ yourNotes 私有断言 |

## 新建文件
| 文件 | 说明 |
|---|---|
| `src/ui/score-board.ts` | F8 分数板（FR-31/BR-C-13）：两行"自己/对方"分数，事件驱动刷新，data-testid×3 |
| `src/ui/game-over-overlay.ts` | 终局结算层（FR-36~39/BR-C-14）：胜/负/平局+双方分数+用时 mm:ss+forfeit 副标题，复用 ResultOverlay 样式，data-testid×5 |
| `tests/client-generators.ts`（重写） | v2 生成器：Snapshot v2、个性化 opApplied（按接收方视角）、arbGameOver（PBT-07） |
| `tests/online-game-controller.test.ts`（重写） | 13 个 example 场景全表（PBT-10） |
| `tests/online-game-controller.pbt.test.ts`（重写） | CP-1~CP-5（镜像一致性/VFX 隔离/capabilities 只读/人数徽标/分数镜像与笔记私有） |

## 未改动（核对）
`src/net/ws-client.ts`、`src/ui/board-view.ts`（BoardSnapshot.notes 类型不变，仅生产者换 ownNotes）、`src/core/` 全部、MenuScene、PlayerCountBadge、JoinToast、`server/`、`shared/`

## 测试修复（类型收窄）
`tests/game-room.test.ts`、`tests/game-room.pbt.test.ts`：v2 判别联合访问加 result 收窄（无行为变更）

## 验证结果
- `npx vitest run`：**13 文件 180/180 全绿**（unit 3 新增 18：13 example + 5 PBT；unit 1 协议 63、unit 2 服务端 99 回归全绿；FR-40 本地回归门禁通过）
- `npx tsc --noEmit`：**全仓库 0 错误**（含 src/shared/server/tests/scripts）
- `npx tsx scripts/e2e-smoke.ts`：**17/17 PASS**（真实服务端进程 + 3 客户端）

## 实施假设记录（无设计偏离）
1. GameOverData 接口定义并导出自 online-game-controller.ts（冻结文档未指定文件归属）
2. ScoreBoard 更新走自定义事件 ONLINE_SCORES_EVENT（EVENTS 不增键以保 FR-40）
3. gameOver 复用既有 EVENTS.GAME_WON 触发终局层
4. 公共 cell 填入（value≠0）时同步 ownNotes.delete(cellIndex)——落实 CP-1 不变量（服务端 clearedNotes 不含被填格本身）

## v2.1 协议修正案适配（2026-08-12）
- clearedNotes 条目化（{index,value}）：correct/redone 移除该格该数字（同格其余保留）；undone 恢复该格该数字（仅镜像中 value===0 的格生效，与 CP-1 不变量互证）
- 新增测试：场景 5 重写（{5,6} 填 6 保留 5 回归）+ 场景 5b（undone 恢复）；CP-1 参考重放器同步条目语义
- 另：ScoreBoard 布局修正（单行顶部中央，联调反馈）；ControlBar 图标按钮试行后同日回滚（保留文字按钮）

## NumberPad 完成计数修正（2026-08-12，用户回归发现）
- **缺陷**：renderOnline 的 completedDigits 判定 `placed===9 && !hasWrong`（placed 含错填格）——某数字 9 个正确 + 1 个错填时 placed=10≠9，按钮永不禁用
- **修正**：只计非错填格 `board[i]===d && !wrongCells.has(i)`，达 9 即禁用（联机模式非 wrong 即服务端验证过的正确填入）；本地模式判定（solution 比对）不变
- 验证：tsc 0、182/182 绿
5. ControlBarInfo 保留可选 mistakes/maxMistakes 字段（不再渲染），保证 local 调用编译零改动
6. CP-1.4 players[].score 断言经 mirrorOf 白盒（控制器无 players 公开 getter）
7. 非法帧场景用 FakeWebSocket 注入测试 deserialize 守卫，未启真实 ws
