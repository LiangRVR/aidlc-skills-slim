# Testable Properties（unit: shared-protocol）— PBT-01 分析

按 PBT-01 的 7 类属性类别对本单元逐一识别：

## 已识别属性

### P1: serialize/deserialize 往返（Round-trip 类别 → PBT-02）
- **属性**：对任意合法消息 m（全部 11 种 type × 各种 payload 组合），`deserialize(serialize(m))` 深度等于 m
- **说明**：serialize 注入的 version 在比较时忽略（或期望反序列化结果带 version=1）
- **生成器**：域生成器——随机 Op（5 种变体）、CellEntry（含边界：空/满 notes、given、wrong）、PlayerInfo、Snapshot（1-2 人、随机 81 格）、全部消息 type
- **边界**：notes 空数组/满 9 项；players 恰好 1 人/2 人；index 0 与 80；value 1 与 9

### P2: deserialize 全输入安全性（Invariant 类别 → PBT-03）
- **属性**：对任意字符串输入（含非 JSON、畸形 JSON、合法 JSON 但字段违规），deserialize 不抛异常，且返回 null 或合法消息，不存在第三种结果
- **生成器**：任意字符串 + 结构化畸形消息生成器（合法信封随机破坏某一字段：删字段/错类型/越界值/未知 type/错 version）

### P3: 拒绝正确性（Oracle 类别 → PBT-05）
- **属性**：凡违反 business-rules.md 任一字段规则的消息，deserialize 必返回 null（以规则表为 oracle）
- **生成器**：基于合法消息的单点变异（每次恰破坏一条规则），断言拒绝；未变异的对照组断言接受

## 无属性组件
- **类型定义本身**（TypeScript 类型）：编译期约束，无运行期行为 —— "No PBT properties identified"（纯声明，无函数）
- **serialize 单独**：无独立属性——其正确性完全由 P1 往返覆盖

## 框架与集成（衔接 NFR-9 / PBT-09）
- fast-check + Vitest；种子确定性复现（PBT-08）
- 关键业务路径同时保留 example-based 测试（PBT-10）：每种消息至少一个手工正例 + 一个手工反例
