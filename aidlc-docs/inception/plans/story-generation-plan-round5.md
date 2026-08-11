# Story Generation Plan（Round 5 - 竞速对抗模式）

## 目标
将 Round 5 需求（FR-31~FR-40，竞速对抗模式）转化为用户故事，沿用既有编号体系（US-31 起）与 INVEST 标准，每条故事附验收标准并映射 persona。

## 执行步骤

- [x] Step 1: 加载输入——requirements.md 第五轮章节（FR-31~FR-40、NFR-10、决策表）、既有 stories.md（编号到 US-30）、personas.md
- [x] Step 2: 按批准的拆分方法生成故事草稿（US-31 起），覆盖全部 10 个 FR 及 Q2/Q3 自定义条款
- [x] Step 3: 为每条故事编写验收标准（格式按 Q3 答案），标注可追溯的 FR 编号
- [x] Step 4: 更新 personas.md（方式按 Q2 答案），并将 persona 映射到各故事
- [x] Step 5: INVEST 校验——每条故事 Independent / Valuable / Estimable / Small / Testable，输出校验结论
- [x] Step 6: 一致性自检——故事集与 FR-31~40 一一可追溯，无遗漏无矛盾

## 澄清问题

## Question 1
故事拆分方法？

A) Feature-Based：按功能域拆分（计分 / 连击 / 笔记私有化 / 权限 / 胜负结算 / 房间生命周期），与 FR 结构对齐，推荐

B) User Journey-Based：按对局流程拆分（开局匹配 → 局中抢分 → 终局结算）

C) 混合：主体 Feature-Based，终局结算用 Journey 串联

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
personas.md 如何处理？

A) 增补一个竞技向玩家画像（如"求胜型玩家"），既有画像不动，推荐

B) 改写既有画像以覆盖竞技动机

C) 不更新 personas（复用 Round 4 画像直接映射）

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
验收标准格式？

A) Given/When/Then 场景式（适合计分边界与权限矩阵场景，推荐）

B) 要点清单式（bullet checklist，同 Round 4 既有故事风格）

C) 混合：规则密集故事用 Given/When/Then，简单故事用清单

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
故事粒度？

A) 每个 FR 一条故事（FR-31~40 → US-31~40，共 10 条，推荐）

B) 细粒度拆分：FR-33 分数结算、FR-35 权限矩阵等规则密集处拆为多条（预计 12~14 条）

C) 粗粒度合并：相关 FR 合并（计分+连击+回退并为 1 条等，约 6~7 条）

D) Other (please describe after [Answer]: tag below)

[Answer]: A
