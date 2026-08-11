# Code Summary — unit: sudoku-server（Round 5，竞速对抗模式）

## 变更文件
| 文件 | 状态 | 行数 | 变更 |
|---|---|---|---|
| `server/score-engine.ts` | 新建 | 35 | S6 纯模块：ScoreState + applyFillCorrect/applyFillWrong/applyUndoFill/applyRedoFill/applyErase（BR-S-24~28），score 下限 0 |
| `server/game-room.ts` | 就地重写 | 493 → 607 | v2：去 mistakes/spectating/playerLost/gameWon/互擦；scores/notesByPlayer/hadTwoPlayers；fill 覆盖归属转移；erase 仅归属者；note 私有仅回发发起者；undo/redo scoreDelta 结算 + 过期记录语义；个性化 opApplied 装配（clearedNotes 归属者副本）；finalize('completed'/'forfeit') + gameOver 广播；removePlayer forfeit 判胜 |
| `server/room-manager.ts` / `message-router.ts` / `connection-manager.ts` / `index.ts` | 未改动 | — | v2 类型兼容，零逻辑变更（验证属实） |
| `tests/server-generators.ts` | 修改 | 82 → 84 | 新增导出 opsOf 录制辅助；生成器语义保留 |
| `tests/score-engine.test.ts` | 新建 | 115 | SP-6 四属性 + 4 example |
| `tests/game-room.test.ts` | 就地重写 | 193 → 313 | 18 个 v2 场景；v1 旁观/补位用例移除 |
| `tests/game-room.pbt.test.ts` | 就地重写 | 150 → 359 | SP-1~5 v2 |

## 测试结果
```
npx vitest run tests/score-engine.test.ts tests/game-room.test.ts tests/game-room.pbt.test.ts tests/protocol.test.ts tests/protocol.pbt.test.ts
Test Files  5 passed (5)   Tests  99 passed (99)
```
（含 unit 1 协议测试 63 例回归全绿）

## 实施期决策与 DOC-01 文档同步
executor 实施时发现 FD 文档与冻结契约（component-methods-round5.md）两处不一致，按**冻结契约为准**实现，并已回写 FD 文档：
1. **undo 笔记恢复仅发起者自己**（契约"联动笔记恢复仅作用于发起者自己的笔记"；FD game-logic §8 与 domain-entities MoveRecord.clearedNotes 原写"双方"，已修正）——对方被清笔记不入栈，仅广播时按归属者分发
2. **erase 扣分 undo/redo 不返还不重扣**（契约无 applyUndoErase 入口；BR-S-27/28 原写"erase 对称恢复"，已修正为 recordedDelta ≤ 0 一律 delta=0）

其他实施期决策（规范内）：
- 主格笔记在任何 fill 成功时双方静默清除（保证 BR-P-11"yourNotes 仅含空格"），不出现在 clearedNotes
- fill 判定顺序：given → 同值 no-op → 覆盖权限（对方正确格同值填回 'no-op'）
- 过期 undo/redo 记录丢弃不入对面栈（BR-S-10"丢弃该记录"）
- forfeit 的 gameOver 广播含离开者（移除前发送；断线场景发送自然失败无副作用）
- score=50 下限截断用例在 score-engine 层覆盖（对局流中 score 恒为 20 的倍数，无法构造 50）
- 测试层修复：SP-6 undo 对称断言 `-Math.min(0)` 产生 -0 与 toBe(Object.is) 冲突，改 `0 - Math.min(...)` 归一化

## 备注
- 全量 `tsc` 与 client 侧测试（online-game-controller*）在 unit 3 完成前存在预期报错
- executor 子智能体（variant: high）本轮仍出现一次"推理预算耗尽截断"（最后一轮 32k reasoning 上限、finish=length、0 输出、task_result 空），经 task_id 恢复 + 明确"立即写文件"指令后完成；方案 A（委派后验证）再次发挥兜底作用
