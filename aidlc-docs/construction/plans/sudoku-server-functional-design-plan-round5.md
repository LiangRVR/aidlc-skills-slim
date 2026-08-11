# Functional Design Plan（unit: sudoku-server，Round 5，竞速对抗模式）

## 执行步骤

- [x] Step 1: 加载输入——Round 4 FD 四份制品（BR-S-01~22、SP-1~5）、component-methods-round5.md（冻结契约：S6 ScoreEngine、S5 GameRoom 修订、S4 RoomManager 修订）、requirements.md FR-31~40
- [x] Step 2: 澄清问题评估——**全部可从文档解决，无需提问**（沿用 Round 4 "Questions Resolved from Docs" 先例）：
  - 计分/连击/undo-redo 结算规则已在 Application Design 5 题 + component-methods-round5.md ScoreEngine 契约冻结
  - 权限矩阵（fill 覆盖错填格归属转移 / erase 仅归属者 / note 私有）已在 FR-35 + 冻结契约明确
  - 离开判胜、废除旁观、gameOver 内容已在 FR-36~39 + 冻结契约明确
- [x] Step 3: 重写 domain-entities.md（ScoreState/ScoreEngine、RoomPlayer v2、GameRoom v2、MoveRecord v2）
- [x] Step 4: 重写 business-rules.md（BR-S 规则集 v2：保留/修订/废除/新增分类）
- [x] Step 5: 重写 business-logic-model.md（计分裁决流、个性化 opApplied 装配、finalize 流、note 私有流）
- [x] Step 6: 重写 testable-properties.md（SP-1~6 v2 + example 场景表 v2）
- [x] Step 7: 一致性校验——与 component-methods-round5.md 逐项对齐；v1 被取代元素（mistakes/spectating/playerLost/gameWon/补位）无残留
