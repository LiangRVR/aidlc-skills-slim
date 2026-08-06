# Application Design Plan - 数独 Web 游戏

**Depth**: Minimal（单一前端应用，低风险）
**目标**：识别主要组件、职责、接口与依赖关系；详细业务规则留待 CONSTRUCTION 阶段的 Functional Design。

## 执行步骤

- [x] Step 1: 生成 `aidlc-docs/inception/application-design/components.md`（组件定义与高层职责）
- [x] Step 2: 生成 `aidlc-docs/inception/application-design/component-methods.md`（方法签名与输入/输出，不含详细业务规则）
- [x] Step 3: 生成 `aidlc-docs/inception/application-design/services.md`（服务定义与编排模式）
- [x] Step 4: 生成 `aidlc-docs/inception/application-design/component-dependency.md`（依赖关系与通信模式）
- [x] Step 5: 生成 `aidlc-docs/inception/application-design/application-design.md`（汇总以上设计文档）
- [x] Step 6: 校验设计完整性与一致性（组件覆盖 FR-1~FR-12，无循环依赖）

## 候选组件（初判，将依回答细化）

- 数独核心逻辑（谜题生成器、求解器、规则校验）
- 游戏状态管理（棋盘状态、笔记、操作历史、计时、错误计数）
- Phaser 场景层（主菜单/难度选择、游戏场景、结算反馈）
- 棋盘 UI 控件（9x9 网格渲染、高亮、数字键盘）
- 存档服务（localStorage 读写与降级）

## 澄清问题

请回答以下问题（在 `[Answer]:` 后填写选项字母），全部回答后我将生成设计制品。

## Question 1
核心游戏逻辑（谜题生成、规则校验、状态）与 Phaser 引擎的耦合方式？

A) 纯 TypeScript 核心 + Phaser 表现层分离 — 核心逻辑不依赖引擎，可独立单元测试（推荐）

B) 逻辑内聚于 Phaser Scene — 结构更简单，但核心逻辑难以脱离引擎测试

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
代码模块组织方式？

A) 按职责分包 — `core/`（算法与状态）、`scenes/`（Phaser 场景）、`ui/`（棋盘与控件）、`persistence/`（存档）（推荐）

B) 扁平结构 — 少量文件平铺，适合极简项目

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
表现层与核心逻辑之间的通信方式？

A) 事件驱动 — 状态变更通过事件通知 UI 更新，降低耦合（推荐）

B) 直接方法调用 — UI 直接读写核心状态对象，简单直观

C) Other (please describe after [Answer]: tag below)

[Answer]: A
