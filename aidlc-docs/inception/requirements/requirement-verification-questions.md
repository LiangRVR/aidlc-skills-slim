# Requirements Verification Questions

请回答以下问题以明确需求。在每题的 `[Answer]:` 后填写选项字母。如果没有合适的选项，请选择 "Other" 并在 `[Answer]:` 后描述你的需求。完成后请告知我。

## Question 1
你希望使用哪个游戏引擎/渲染方案？

A) Phaser 3 — 功能丰富的 HTML5 2D 游戏引擎（场景管理、输入、动画开箱即用）

B) PixiJS — 高性能 2D WebGL 渲染引擎（更轻量，专注渲染）

C) Cocos Creator — 国产游戏引擎，组件化开发

D) 原生 Canvas API — 无第三方引擎依赖

E) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
使用什么开发语言？

A) TypeScript（类型安全，推荐）

B) JavaScript

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
使用什么构建/运行方式？

A) Vite + npm（现代构建工具，含本地开发服务器，推荐）

B) 无构建工具 — 单 HTML 文件 + CDN 引入引擎，浏览器直接打开

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
游戏功能范围希望做到什么程度？

A) 基础版 — 随机生成谜题、填数字、冲突提示、完成判定

B) 标准版 — 基础版 + 难度选择（简单/中等/困难）、候选数笔记、计时器

C) 完整版 — 标准版 + 提示功能、错误次数限制、撤销/重做、localStorage 本地存档

D) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 5
游戏界面语言？

A) 中文

B) 英文

C) 中英双语可切换

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6: Property-Based Testing Extension
是否为本项目启用基于属性的测试（PBT）规则？

A) Yes — 强制执行所有 PBT 规则作为阻塞性约束（推荐用于含业务逻辑、数据转换、序列化或有状态组件的项目）

B) Partial — 仅对纯函数和序列化往返强制执行 PBT 规则（适合算法复杂度有限的项目）

C) No — 跳过所有 PBT 规则（适合简单 CRUD 应用、纯 UI 项目或无显著业务逻辑的薄集成层）

D) Other (please describe after [Answer]: tag below)

[Answer]:C

## Question 7: Security Extensions
是否为本项目启用安全扩展规则？

A) Yes — 强制执行所有 SECURITY 规则作为阻塞性约束（推荐用于生产级应用）

B) No — 跳过所有 SECURITY 规则（适合 PoC、原型和实验性项目）

C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 8: Resiliency Extensions
是否为本项目应用弹性基线（resiliency baseline）？

**该扩展是什么**：启用后会应用一组**方向性的设计期最佳实践**，用于构建弹性系统（源自 AWS Well-Architected Framework 可靠性支柱），引导需求、设计和代码走向容错、高可用、可观测和可恢复。

**该扩展不是什么**：启用它**不会**让工作负载达到生产就绪，也不认证或保证任何可用性、RTO 或 RPO 目标。它只是一个**起点**，不能替代正式的 AWS Well-Architected Review。

A) Yes — 将弹性基线作为方向性最佳实践和设计期指导应用（推荐用于业务关键型工作负载）

B) No — 跳过弹性基线（适合快速迭代优先于可靠性的 PoC、原型和实验性项目）

C) Other (please describe after [Answer]: tag below)

[Answer]: B
