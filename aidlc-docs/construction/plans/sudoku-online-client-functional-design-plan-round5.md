# Functional Design Plan（unit: sudoku-online-client，Round 5，竞速对抗模式）

## 执行步骤

- [x] Step 1: 加载输入——Round 4 client FD 五份制品（BR-C-01~12、CP-1~4）、component-methods-round5.md 前端段（F8 ScoreBoard、F2 重大修订、F5/F7 修订）、协议 v2 已实现类型、unit 2 服务端行为（个性化 opApplied）
- [x] Step 2: 澄清问题评估——**全部可从文档解决，无需提问**（沿用先例）：笔记私有镜像、ScoreBoard、gameOver 展示、isReadOnly 重定义均在冻结契约明确
- [x] Step 3: 重写 domain-entities.md（MirrorState v2 + ownNotes 私有镜像、ScoreBoard F8 实体、BoardSnapshot 扩展 v2）
- [x] Step 4: 重写 business-rules.md（BR-C 规则集 v2 + FR-31~40 前端映射）
- [x] Step 5: 重写 business-logic-model.md（消息应用流 v2、gameOver 结算流、笔记私有镜像模型）
- [x] Step 6: 重写 frontend-components.md（F8 ScoreBoard 新增、F2/F5/F7 修订、终局覆盖层取代旁观层）
- [x] Step 7: 重写 testable-properties.md（CP-1~5 v2 + example 场景 v2 + FR-40 回归门禁）
- [x] Step 8: 一致性校验——v1 元素（spectating/playerLost/gameWon/myMistakes/共享笔记镜像/旁观覆盖层）无残留；与 component-methods-round5.md 前端段逐项对齐
