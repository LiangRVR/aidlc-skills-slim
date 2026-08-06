# Functional Design Plan - unit: sudoku-game

**单元上下文**：单一工作单元（Units Generation 已跳过），承载 FR-1~FR-12 全部功能；高层组件结构见 `aidlc-docs/inception/application-design/`。

## 执行步骤

- [x] Step 1: 生成 `aidlc-docs/construction/sudoku-game/functional-design/business-logic-model.md`（谜题生成算法流程、求解器流程、游戏状态流转、撤销/重做机制、计时与自动存档流程）
- [x] Step 2: 生成 `aidlc-docs/construction/sudoku-game/functional-design/business-rules.md`（冲突规则、错误计数规则、胜利/失败规则、笔记清除规则、存档规则）
- [x] Step 3: 生成 `aidlc-docs/construction/sudoku-game/functional-design/domain-entities.md`（领域实体、属性、关系）
- [x] Step 4: 生成 `aidlc-docs/construction/sudoku-game/functional-design/frontend-components.md`（UI 组件结构、交互流、状态到渲染的映射）
- [x] Step 5: 一致性校验 — 业务规则与 US-01~US-12 验收标准逐条对齐

## 澄清问题

请回答以下问题（在 `[Answer]:` 后填写选项字母），全部回答后我将生成设计制品。

## Question 1
三档难度如何定义（影响谜题生成器的挖空策略）？

A) 按预填数字数量 — 简单 40-45 个预填、中等 32-39 个、困难 26-31 个（直观，推荐）

B) 按解题技巧难度评分 — 生成后评估所需技巧等级，更精确但实现复杂、生成耗时更长

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
玩家填入**错误**数字时（与正确答案不符），棋盘上如何呈现？

A) 数字保留在格子里并标红，计入错误次数 — 玩家可看到并手动改正（常见数独应用行为，推荐）

B) 拒绝填入，格子保持原状，仅计入错误次数并给出提示

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
游戏计时器在页面不可见（切换标签页/最小化）时如何处理？

A) 自动暂停计时，页面重新可见时继续 — 计时反映真实游玩时间（推荐）

B) 不暂停，计时持续走动直到胜利/失败

C) Other (please describe after [Answer]: tag below)

[Answer]: A
