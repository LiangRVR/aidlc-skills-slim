# Application Design Plan（Round 4 - 多人版）

## 目标
为多人版（FR-15~FR-29）完成高层组件识别与服务层设计，**冻结前后端 WebSocket 消息协议契约**（后续单元的协调点）。产出 5 个强制制品（第四轮版本，不覆盖第一轮文档）。

## 执行步骤
- [x] Step 1: 生成 `components-round4.md`（新增/改动组件定义与职责，含后端全部组件与前端联机组件）
- [x] Step 2: 生成 `component-methods-round4.md`（组件方法签名 + WebSocket 消息协议类型定义：客户端→服务端、服务端→客户端全量消息）
- [x] Step 3: 生成 `services-round4.md`（服务端编排：连接生命周期、匹配、操作确认广播；前端编排：联机控制器与本地控制器的选择）
- [x] Step 4: 生成 `component-dependency-round4.md`（依赖矩阵、前后端通信模式、数据流图，验证无循环依赖且不破坏既有 core 边界）
- [x] Step 5: 生成 `application-design-round4.md`（合并以上制品，FR-15~FR-29 覆盖校验 100%）
- [x] Step 6: 一致性校验（与 RE 制品、requirements.md、stories.md 对齐）并呈现完成消息
- [x] Step 7（变更请求）: 匹配算法精确化（最相近难度中取最早开始，同距离并列才随机）+ 补充 GameRoom 生命周期（创建/状态机/销毁），同步 components/services/component-methods/application-design 及 requirements.md FR-17、stories.md US-17
- [x] Step 8（变更请求 2）: 匹配算法改为四级优先级链（同难度最早 > 更难最近档最早 > 更简单最近档最早 > 创建），同步全部 6 个制品
- [x] Step 9（变更请求 3）: 匹配算法改为距离升序+同距离更难优先（中等：困难→简单→专家；困难：专家→中等→简单；简单：中等→困难→专家），同步全部 6 个制品

## 问题

### Question 1
前后端共享代码（消息协议类型、数独核心逻辑）如何组织？

A) 单一 package：在现有 package.json 下新增 `server/` 与 `shared/` 目录，前后端直接 import 共享 TS 类型与 core 逻辑（最简单，无包管理开销）

B) npm workspaces：拆成 client / server / shared 三个子包（边界清晰，但引入 workspace 配置与构建复杂度）

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 2
服务端的数独逻辑（谜题、正解校验、笔记清除规则）如何实现？

A) 直接复用现有 `src/core`（GameState/SudokuGenerator/SudokuSolver/RuleValidator 均为纯 TS、不依赖 Phaser，可被 Node 直接 import）——服务端用同一套 GameState 作为权威状态

B) 服务端独立实现轻量版（只存棋盘数组，对照 solution 判对错）——core 保持前端专属

C) Other (please describe after [Answer]: tag below)

[Answer]: A 但是我想知道在线模式的数独逻辑取的是本地端还是服务端，如果是本地端是不是会有作弊的可能？

### Question 3
前端联机模式与本地模式的架构关系？

A) 双控制器：抽出 GameController 接口，`LocalGameController`（现有实现）与 `OnlineGameController`（操作发给服务端、订阅广播）实现同一接口，GameScene 基本无感知

B) 单控制器内嵌分支：现有 GameController 增加 online 模式判断，内部按模式走本地/网络路径

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 4
状态同步策略？

A) 操作-确认-广播：客户端发操作消息，服务端应用到权威状态后广播增量事件；新玩家加入时下发一次全量快照

B) 全量快照广播：每次状态变化都向双方发送完整棋盘状态（实现简单，流量大）

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 5
WebSocket 消息格式？

A) JSON 文本消息（`{ type, payload }` 结构，便于调试与 PBT 序列化往返测试）

B) 二进制编码（体积小，调试与测试成本高）

C) Other (please describe after [Answer]: tag below)

[Answer]: A
