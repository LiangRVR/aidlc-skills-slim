# Code Generation Plan（unit: shared-protocol）

## 单元上下文
- **交付**：`shared/protocol.ts`（类型 + 信封 + serialize/deserialize + 逐字段校验器）
- **支撑故事**：US-16/17/18/21（使能单元，无直接故事）
- **依赖**：`src/core/types`（Difficulty）；devDependency 新增 fast-check（NFR tech-stack-decisions）
- **契约**：component-methods-round4.md（已冻结，含 functional-design 信封变更 `{version, type, payload}`）
- **测试要求**：PBT-02/03/05（往返 P1、永不抛异常 P2、单点变异拒绝 P3）+ PBT-07 域生成器复用 + PBT-08 种子复现 + PBT-10 example-based 互补

## 执行步骤
- [x] Step 1: `npm i -D fast-check`（落实 tech-stack-decisions.md 决策）
- [x] Step 2: 更新 `tsconfig.json` include 增加 `shared`（保持 strict；server 目录在 Unit 2 再加入）
- [x] Step 3: 创建 `shared/protocol.ts`——PROTOCOL_VERSION=1；Difficulty 复用 `src/core/types`；Op/CellEntry/PlayerInfo/Snapshot/CompletedUnit/ClientMessage/ServerMessage 类型；serialize（自动注入 version）；deserialize（五步管线：parse→信封→type 白名单→逐字段校验→返回，全程不抛异常返回 null）——严格按 business-rules.md BR-P-01~BR-P-10
- [x] Step 4: 创建 `tests/protocol.test.ts`（example-based，PBT-10）：每种消息 ≥1 正例往返 + ≥1 反例（缺字段/越界/错类型/未知 type/错 version）；CellEntry 一致性规则（BR-P-06/07/08）正反对照
- [x] Step 5: 创建 `tests/generators.ts`（PBT-07 集中式域生成器：Op/CellEntry/PlayerInfo/Snapshot/全消息 + 单点变异生成器）与 `tests/protocol.pbt.test.ts`（P1 全类型往返、P2 任意字符串不抛异常、P3 单点变异必拒）；fc 默认 seed 输出开启（PBT-08）
- [x] Step 6: 验证——`npx tsc --noEmit` 0 错误；`npx vitest run` 全过（102/102：既有 60 + 39 example + 3 PBT）；`npm run build` 成功
- [x] Step 7: 生成 `aidlc-docs/construction/shared-protocol/code/protocol-summary.md`（文件清单、公共 API、测试覆盖统计、PBT 属性落实对照表）

## 验证基线
- 既有 60 个 Vitest 用例不得破坏（FR-29 回归的代码层保障）
- 新增 example-based + PBT 全部通过；tsc strict 0 错误
