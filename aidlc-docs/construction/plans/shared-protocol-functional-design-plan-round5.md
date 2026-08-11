# Functional Design Plan（unit: shared-protocol，Round 5 - 协议 v2）

## 目标
将 shared-protocol 单元的 Functional Design 从 v1 升级为 v2：CellEntry 去 notes、PlayerInfo 计分化、Snapshot.yourNotes、opApplied 个性化负载、gameOver 取代 gameWon/playerLost、version 升 2。契约已冻结于 component-methods-round5.md。

## 执行步骤

- [x] Step 1: 加载输入——Round 4 FD 四份制品、component-methods-round5.md（冻结契约）、requirements.md FR-31~40
- [x] Step 2: 澄清问题评估——**全部可从文档解决，无需提问**：协议契约已在 Application Design 冻结（5 题全部作答含补充）；opRejected reason 集、字段可选性矩阵、gameOver 约束均可从冻结契约与 FR 直接推导（沿用 Round 4 sudoku-server "Questions Resolved from Docs" 先例）
- [x] Step 3: 重写 domain-entities.md（v2 实体）
- [x] Step 4: 重写 business-rules.md（BR-P 规则集 v2）
- [x] Step 5: 重写 business-logic-model.md（version=2 信封与流程）
- [x] Step 6: 重写 testable-properties.md（PBT-01：生成器与往返目标 v2 化）
- [x] Step 7: 一致性校验——与 component-methods-round5.md 逐字段对齐；v1 被取代元素（notes/mistakes/spectating/playerLost/gameWon）无残留

## 变更请求记录
（暂无）
