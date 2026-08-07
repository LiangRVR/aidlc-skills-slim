# Unit of Work（Round 4 - 多人版）

**分解策略**：三单元（unit-of-work-plan-round4.md Q1=B），协议先行（Q2=A），跨端故事按主要逻辑落点单标（Q3=A）。
**代码组织**：单 package（Application Design Q1=A）——`shared/`、`server/`、`src/` 同 package.json，直接 import 共享 TS 类型。

## Unit 1: shared-protocol（共享消息协议）

- **类型**：共享库（Module，不独立部署）
- **目录**：`shared/`
- **职责**：前后端消息契约——ClientMessage/ServerMessage 全量类型、Op/CellEntry/PlayerInfo/Snapshot 传输模型、serialize/deserialize（Application Design 已冻结，见 component-methods-round4.md）
- **交付物**：`shared/protocol.ts` 类型与序列化函数；fast-check PBT 往返测试（序列化/反序列化 = identity，PBT-02）
- **依赖**：仅 `src/core/types`（Difficulty 等纯类型）
- **规模**：小（1-2 个源文件 + 1 个测试文件）

## Unit 2: sudoku-server（后端对局服务）

- **类型**：独立可运行进程（Service，Node.js）
- **目录**：`server/`（复用 `src/core` 纯 TS 核心）
- **职责**：ws 服务接入（ServerEntry）、连接会话（ConnectionManager）、协议路由（MessageRouter）、房间管理与四级匹配（RoomManager）、权威对局与双人规则（GameRoom：对错判定/独立错误/旁观/undo 仅自己/笔记清除/共享计时/gameWon/补位）
- **交付物**：S1-S5 全部组件 + Vitest 单测（含匹配算法 PBT 不变量、房间状态机 PBT，PBT-01 分析见 Functional Design）
- **依赖**：Unit 1（shared-protocol）、`src/core`（GameState/Generator/Solver/RuleValidator）
- **规模**：中（~6 个源文件 + ~3 个测试文件）

## Unit 3: sudoku-online-client（前端联机能力）

- **类型**：前端应用扩展（在既有 sudoku-game 单元代码基础上增量开发，同 `src/`）
- **目录**：`src/`（新增 `src/net/`、`src/ui/join-toast.ts` 等；改动 scenes/ui/core）
- **职责**：IGameController 接口抽取与 LocalGameController 改名（零行为变化）、OnlineGameController、WebSocketClient、MenuScene 模式选择、GameScene 联机适配（旁观/离开/连接失败）、JoinToast、BoardView 归属蓝色
- **交付物**：F1-F7 组件 + 前端逻辑单测（镜像状态应用、VFX 隔离派发等）
- **依赖**：Unit 1（shared-protocol）；既有单元 `sudoku-game`（FR-29 回归约束：本地模式行为不变）
- **规模**：中（~4 新文件 + ~5 改动文件 + 测试）

## 既有单元（本轮不变）
- **sudoku-game**（第一~三轮）：本地模式全部功能，US-01~US-14。Unit 3 在其基础上增量开发，禁止破坏既有行为。
