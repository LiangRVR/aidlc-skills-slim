# Tech Stack Decisions（unit: sudoku-server）

**【Round 5 复核】技术栈零变更**（Node+ws+tsx+Vitest+fast-check 沿用）；仅引用修正：SP-1~SP-5 → **SP-1~SP-6**（新增 ScoreEngine 属性）；Socket.IO 排除理由中的"断线补位"引用由 FR-28 修正为 FR-38（forfeit 由应用层实现）。

| 技术 | 版本 | 决策理由 |
|---|---|---|
| Node.js | ≥ 18（LTS） | NFR-7 指定运行时；ws 库与 TS 执行器均要求 18+ |
| TypeScript | ^5.5.4（沿用根 package.json） | 复用 src/core 与 shared/protocol 的前提；单 package 统一编译 |
| **ws** | ^8.x（Round 4 已引入 dependency） | NFR-7 指定"原生 ws 库"：轻量、无框架绑定、事件模型与 ConnectionManager 设计直接对应 |
| @types/ws | ^8.x（Round 4 已引入 devDependency） | ws 无内置类型 |
| **tsx** | ^4.x（Round 4 已引入 devDependency） | 直接运行 TS 源码（`tsx server/index.ts`），开发期零构建步骤；生产亦可用（LAN 形态无独立构建管线需求） |
| Vitest | ^2.1.8（沿用） | 既有统一测试入口 |
| fast-check | ^3.x（沿用，单元 1 已引入） | SP-1~SP-6 属性测试（PBT-09） |

## 单 package 说明
Round 4 Q1=A 决策：`shared/`、`server/`、`src/` 同属根 package.json。Round 5 本单元**无新增依赖**（ScoreEngine 为纯 TS 模块）。

## 不引入的技术（记录排除理由）
- **Express / Fastify / Socket.IO**：需求仅 ws 消息收发，无 HTTP 路由、无房间命名空间/自动重连等 Socket.IO 特性需求（离开判胜 forfeit 由应用层自行实现，FR-38）；NFR-7 明确"原生 ws 库"
- **express.static 静态托管**：Q3 答案——前端静态托管不在后端职责（FR-16 独立后端），前端由 vite 提供
- **Redis / 任何外部存储**：Q2=A 纯内存决策
- **pino/winston 日志框架**：LAN 小规模，console 输出足够；不引入额外依赖
- **node:test / jest**：与既有 Vitest 统一（PBT-09 单一框架）

## PBT-09 合规声明
- [x] fast-check 已在 devDependencies（单元 1 落实），本单元直接复用
- [x] 自定义生成器集中 tests/server-generators.ts（复用 tests/generators.ts v2 协议生成器）
