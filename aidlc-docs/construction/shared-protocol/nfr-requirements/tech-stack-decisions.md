# Tech Stack Decisions（unit: shared-protocol）

| 技术 | 版本 | 决策理由 |
|---|---|---|
| TypeScript | ^5.5.4（沿用根 package.json） | 前后端共享类型必需；strict 模式保证信封校验类型完备 |
| Vitest | ^2.1.8（沿用） | 既有测试框架，统一测试入口 |
| **fast-check** | ^3.x（新增 devDependency） | **PBT-09 强制选型**：自定义域生成器（Op/CellEntry/Snapshot）、自动 shrink、种子确定性复现、官方 Vitest 集成（@fast-check/vitest 或 fc.assert 直用） |

## PBT-09 合规声明
- [x] 框架已选定并记录于技术栈决策（本文件）
- [x] 框架支持自定义生成器 / shrink / 种子复现 / Vitest 集成
- [x] 框架列入 package.json devDependencies（fast-check ^3.x，Code Generation 已落实）
- 项目单一语言（TypeScript），无需多语言框架

## 不引入的技术（记录排除理由）
- **ajv / zod 等 schema 库**：消息类型仅 10 种（v2：Client 3 + Server 7）且字段浅，手写校验器更轻、零依赖，PBT 生成器直接复用域类型
- **JSON Schema / Protobuf**：Q5=A 决策 JSON 文本协议，二进制与外部 schema 均不需要
