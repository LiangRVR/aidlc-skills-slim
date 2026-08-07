# Story Generation Plan（Round 4 - 多人版）

## 目标
将 FR-15~FR-29 转化为用户故事，扩展 personas.md 与 stories.md（追加 US-15 起的故事，保持第一轮格式：GWT 验收标准、persona 映射、FR 覆盖表）。

## 执行步骤
- [x] Step 1: 更新 personas.md —— 按 Q1 答案处理联机玩家画像
- [x] Step 2: 生成 stories.md 第四轮故事（US-15 起），按 Q2 选定的拆分方式组织，覆盖 FR-15~FR-29
- [x] Step 3: 每个故事按 Q3 格式编写验收标准，显式区分"自己视角"与"对方视角"
- [x] Step 4: 校验 INVEST 原则、persona 映射完整性、FR-15~FR-29 覆盖率 100%，更新需求-故事覆盖表
- [x] Step 5: 呈现完成消息，等待用户批准

## 拆分方式备选（供 Q2 参考）
- **User Journey-Based（用户旅程）**：按 选模式→匹配→对局→结束/断线 的旅程组织，适合流程性强的联机场景
- **Feature-Based（功能特性）**：按系统能力组织（匹配、同步、对局规则、视觉呈现），与第一~三轮一致
- **混合**：主线用旅程组织，规则类细节（旁观/补位/视觉）用特性补充

## 问题

### Question 1
联机玩家画像如何处理？

A) 沿用现有双画像（新手小林 + 资深老周），在故事中标注"联机场景"即可，不新增画像

B) 新增 1 个联机玩家画像（如"联机玩家·阿杰"），与现有画像并列

C) Other (please describe after [Answer]: tag below)

[Answer]: B 新增一个联机玩家画像。 联机模式后续会体现出对抗性，及双方玩家会尽力让自己的积分更高从而从游戏中胜出。但是当前这个版本没有对抗性设置。玩家画像先设置着。

### Question 2
第四轮故事采用哪种拆分方式？

A) Feature-Based（与前三轮一致，便于维护统一的 FR 覆盖表）

B) User Journey-Based（按联机旅程组织，更贴合双人交互流程）

C) 混合（主线旅程 + 规则特性补充）

D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 3
验收标准格式？

A) Given/When/Then（与前三轮一致）

B) Other (please describe after [Answer]: tag below)

[Answer]: A
