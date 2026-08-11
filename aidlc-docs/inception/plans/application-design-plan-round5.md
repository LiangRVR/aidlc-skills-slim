# Application Design Plan（Round 5 - 竞速对抗模式，minimal depth）

## 目标
在 Round 4 组件结构不变的前提下，完成竞速对抗模式的应用设计：协议契约变更（v2）、GameRoom 计分/连击/私有笔记状态、组件方法签名修订、FR-31~40 覆盖落点。

## 执行步骤

- [x] Step 1: 加载输入——application-design-round4.md 等 5 份 Round 4 设计制品、requirements.md 第五轮章节、stories.md US-31~40
- [x] Step 2: 生成 components-round5.md——变更组件清单（S5 GameRoom 重构 / H1 Protocol v2 / F2 OnlineGameController 适配 / 新增计分相关组件与否按 Q3 答案）与职责修订
- [x] Step 3: 生成 component-methods-round5.md——方法签名变更（GameRoom 计分结算、权限裁决矩阵、私有笔记 API、RoomManager 离开判胜、Protocol v2 消息类型）
- [x] Step 4: 生成 services-round5.md——广播编排修订：公开/私有消息路由（按 Q2/Q5 答案）、终局结算编排
- [x] Step 5: 生成 component-dependency-round5.md——依赖矩阵确认无环、src 与 server 仍仅经 shared/ 通信
- [x] Step 6: 生成 application-design-round5.md 合并稿 + FR-31~40 覆盖校验表
- [x] Step 7: 一致性校验——与 Round 4 设计延续性、requirements/stories 对齐、被取代规则的标注
- [x] Step 8（变更请求 2026-08-10T20:40:00Z）: 连击不被对手打断——删除 FR-32 ⑤/US-32 AC/ScoreEngine.applyOpponentCorrect 及相关编排；同步 requirements.md（决策表/FR-32/关键摘要）、stories.md（US-32）、application-design 五份制品、execution-plan-round5.md（DOC-01 扫描无残留）

## 澄清问题

## Question 1
协议版本策略？（本轮为 breaking change：playerLost 移除、gameWon 负载扩展、opApplied 可见性拆分）

A) version 升至 2，服务端拒绝 v1 连接/消息（BR-S-15 已有非法版本处理路径，演进语义清晰，推荐）

B) 保持 version=1（前后端同仓库同发布，局域网演示无需兼容旧端）

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
分数与连击数的同步载体？

A) 复用 opApplied：负载附带双方最新分数与连击计数（时序与操作确认天然一致，消息类型最少；连击数对双方公开，推荐）

B) 独立 scoreUpdate 消息：每次分数变化单独广播（与 opApplied 解耦，但多一类消息且需保证顺序）

C) Other (please describe after [Answer]: tag below)

[Answer]: A 连击数不用公开，界面上不显示

## Question 3
计分/连击结算逻辑的组件归属？

A) 独立纯模块 ScoreEngine（无状态计算：输入操作类型+当前状态，输出分数/连击增量；GameRoom 持有状态并调用；PBT 友好，推荐）

B) GameRoom 内聚字段直接结算（少一个组件，但状态机与结算逻辑耦合，PBT 需构造完整房间）

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
私有笔记的服务端存储模型？

A) GameRoom 外挂：notesByPlayer: Map<playerId, Map<cellIndex, Set<digit>>>，core GameState 零改动（服务端包裹层管理，本地模式完全不受影响，推荐）

B) 改造 src/core CellEntry：notes 改为按玩家存储（core 语义变更，本地/线上共用一套，但本地模式代码路径受影响）

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
私有负载（笔记操作确认、填对后各自的笔记清除结果）的下发模式？

A) 每玩家个性化消息：同一 op 服务端向不同玩家发送不同负载（fill 广播公共部分 + 各自 clearedNotes 私有部分；note op 仅回发发起者；一步到位支撑 FR-34，推荐）

B) 公共广播 + 独立私有消息类型：opApplied 永远公共，另设 notesCleared 私有消息仅发归属者（消息类型更多，但广播语义保持简单）

C) Other (please describe after [Answer]: tag below)

[Answer]: A
