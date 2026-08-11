# Round 5 需求澄清问题（竞速对抗模式）

已锁定的设计决策（来自讨论，无需再答）：
- 竞速对抗模式**替换**现有合作模式
- 笔记私有化；一方填对时服务端代清双方笔记中该值（内容互不可见）
- 计分：填对 +100、填错 -100；连击从连续第 3 次填对起每次 +20（不递增）
- 正确格仅归属者可操作；错填格任何人都可 fill 覆盖（防占位）；erase 仅归属者
- 废除错 3 次判负旁观（BR-S-07）与 playerLost 广播，双方始终在局

请回答以下问题，在每题 [Answer]: 后填写字母选项。如无匹配选项，选 Other 并描述。

## Question 1
对局中对手离开/断线（非补位）时，如何处理在局玩家？

A) 在局玩家直接判胜，房间进入终局（竞速模式节奏优先，推荐）

B) 沿用现有 BR-S-12 语义：房间回到可加入池等待补位，补位者比分从 0 起、从当前棋盘继续

C) 房间保留等待对手重连一段时间，超时再判胜

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
连击（combo）计数的清零条件是什么？（连击：连续填对第 3 次起每次 +20）

A) 仅填错清零；erase/undo 不影响连击计数（最简单，推荐）

B) 填错或 undo 自己的正确填入都会清零

C) 任何非"填对"的操作（填错/erase/undo/redo）都清零

D) Other (please describe after [Answer]: tag below)

[Answer]: C 而且对方玩家填对时会清零本玩家的连击计数。

## Question 3
undo/erase 时分数如何结算？（防止"填对 +100 → undo → 再填 +100"无限刷分）

A) 完全回退：undo 正确填入 -100、undo 错填 +100、erase 自己正确格 -100（与得分严格对称，推荐）

B) 分数一旦结算不回退，但同一格子的正确填入只对"首次填对"计分，重填不再得分

C) Other (please describe after [Answer]: tag below)

[Answer]: A 但是undo填错不应该+100，防止玩家采用穷举法猜数字。

## Question 4
棋盘填满时双方平分，如何结算？

A) 判平局（推荐，最简单）

B) 平分时填满最后一格的玩家胜（手速奖励）

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
分数允许为负吗？

A) 允许负分（扣分可降到 0 以下，精确反映表现差距，推荐）

B) 分数下限为 0，扣分到底为止

C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 6
终局结算时除了分数，还需要展示/记录哪些信息？

A) 仅双方最终分数与胜负（最简单）

B) 分数 + 各自填对/填错次数 + 最高连击（对局统计，推荐）

C) B + 对局用时排名/历史战绩持久化（需要新增存储，工作量明显增大）

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7: Property-Based Testing Extension
本轮变更是否继续强制执行 property-based testing (PBT) 规则？（Round 4 为 full enforcement）

A) Yes — 继续完整强制执行所有 PBT 规则（计分/连击/权限裁决属业务逻辑密集，推荐）

B) Partial — 仅对纯函数与序列化 round-trip 执行 PBT

C) No — 本轮跳过 PBT 规则

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 8: Security Extensions
本轮变更是否强制执行 security baseline 规则？（Round 4 选择 No）

A) Yes — 强制执行所有 SECURITY 规则（生产级应用推荐）

B) No — 跳过所有 SECURITY 规则（PoC/原型/局域网形态适用，沿用 Round 4 决定）

C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 9: Resiliency Extensions
本轮变更是否应用 resiliency baseline？（Round 4 选择 No）

A) Yes — 应用韧性基线作为设计期指导（业务关键负载推荐）

B) No — 跳过韧性基线（PoC/原型/快速迭代适用，沿用 Round 4 决定）

C) Other (please describe after [Answer]: tag below)

[Answer]: B
