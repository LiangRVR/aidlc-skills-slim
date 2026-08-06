# Story Generation Plan - 数独 Web 游戏

**方法论**：以产品负责人视角，将 `aidlc-docs/inception/requirements/requirements.md` 中的 FR-1~FR-12 转化为符合 INVEST 标准的用户故事，每个故事附带验收标准，并建立玩家画像与故事的映射。

## 执行步骤

- [x] Step 1: 生成 `aidlc-docs/inception/user-stories/personas.md`（玩家画像：特征、目标、动机）
- [x] Step 2: 生成 `aidlc-docs/inception/user-stories/stories.md`（用户故事，遵循 INVEST：Independent, Negotiable, Valuable, Estimable, Small, Testable）
- [x] Step 3: 为每个用户故事编写验收标准（Given/When/Then 或要点式，依下方问题 3 的选择）
- [x] Step 4: 建立画像与故事的映射（在 stories.md 中标注每个故事对应的画像）
- [x] Step 5: 校验完整性 — 确认 FR-1~FR-12 全部被故事覆盖，无遗漏、无超出需求范围的故事

## 故事拆分方式选项

- **Feature-Based（按功能拆分）**：每个功能需求（谜题生成、填写、笔记、计时、提示、撤销、存档等）对应独立故事。优点：与 FR 一一对应、易于追踪覆盖；缺点：不体现玩家操作流程。
- **User Journey-Based（按用户旅程拆分）**：按"开始新游戏 → 游玩 → 卡关求助 → 完成/失败 → 续玩"流程组织。优点：体现体验流；缺点：单个故事可能跨多个 FR，粒度偏大。
- **Epic-Based（史诗分层）**：先定义"开局 / 游玩 / 辅助功能 / 存档"等 Epic，再拆子故事。优点：层次清晰；缺点：对本规模项目偏重。

**推荐**：Feature-Based — 与需求文档直接映射，粒度适中，便于覆盖校验。

## 澄清问题

请回答以下问题（在 `[Answer]:` 后填写选项字母），全部回答后我将开始生成故事。

## Question 1
玩家画像如何划分？

A) 单一画像 — 一个"休闲数独玩家"即可覆盖所有场景（简单直接，推荐）

B) 双画像 — "新手玩家"（依赖提示、笔记、低难度）与"资深玩家"（高难度、计时挑战、撤销/重做）

C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 2
故事拆分方式？

A) Feature-Based — 与 FR-1~FR-12 一一映射（推荐）

B) User Journey-Based — 按游玩流程组织

C) Epic-Based — 先 Epic 后子故事

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
验收标准的格式与详细程度？

A) 要点式，每个故事 3-5 条关键验收点（简洁，推荐）

B) Given/When/Then 场景式，覆盖主要正常流程与关键异常流程（更详细，可直接用于测试用例）

C) Other (please describe after [Answer]: tag below)

[Answer]: B
