# Testable Properties（unit: shared-protocol）— PBT-01 分析（Round 5 v2 重写）

按 PBT-01 的 7 类属性类别对本单元逐一识别：

## 已识别属性

### P1: serialize/deserialize 往返（Round-trip 类别 → PBT-02）
- **属性**：对任意合法 v2 消息 m（ClientMessage 3 种 + ServerMessage 7 种 × 各种 payload 组合），`deserialize(serialize(m))` 深度等于 m
- **生成器（v2 更新）**：
  - Op（5 种变体，index/value 边界 0/80、1/9）
  - CellEntry（**无 notes**；边界：空/given/wrong/各 owner 形态）
  - PlayerInfo v2（score 边界 0/大值）
  - Snapshot v2（players 1-2 人、随机 81 格、**yourNotes**：空对象/单格/多格/满 9 候选）
  - OpApplied 全变体：**按 BR-P-12 出席矩阵生成**——note 变体（含 notes）、correct 变体（含 completedUnits 空/非空）、wrong/erased/undone/redone 变体、clearedNotes 出席/缺席
  - gameOver（completed+winner / completed+平局 null / forfeit）
- **边界**：scores 1 人/2 人；winnerId null/非 null；elapsedSeconds 0

### P2: deserialize 全输入安全性（Invariant 类别 → PBT-03）
- **属性**：对任意字符串输入（含非 JSON、畸形 JSON、合法 JSON 但字段违规），deserialize 不抛异常，且返回 null 或合法消息，不存在第三种结果
- **生成器**：任意字符串 + 结构化畸形消息生成器（合法信封随机破坏某一字段）

### P3: 拒绝正确性（Oracle 类别 → PBT-05）
- **属性**：凡违反 business-rules.md 任一字段规则的消息，deserialize 必返回 null（以规则表为 oracle）
- **v2 重点变异点**：
  - version=1（v1 帧）→ 拒绝（BR-P-02）
  - CellEntry 携带 notes（v1 残留字段）→ 拒绝（BR-P-05 白名单）
  - opApplied 违反出席矩阵（note 结果带 cell / correct 缺 completedUnits）→ 拒绝（BR-P-12）
  - yourNotes 键越界/值含重复/含非空格键 → 拒绝（BR-P-11）
  - scores 空对象/负分 → 拒绝（BR-P-13）
  - gameOver forfeit 且 winnerId=null → 拒绝（BR-P-15）
  - playerLost/gameWon type（v1 残留）→ 拒绝（BR-P-03 白名单）
- **方法**：基于合法消息的单点变异（每次恰破坏一条规则），断言拒绝；未变异对照组断言接受

## 无属性组件
- **类型定义本身**（TypeScript 类型）：编译期约束 —— "No PBT properties identified"
- **serialize 单独**：其正确性完全由 P1 往返覆盖

## 框架与集成（衔接 NFR-9/NFR-10 / PBT-09）
- fast-check + Vitest；种子确定性复现（PBT-08）
- 关键业务路径同时保留 example-based 测试（PBT-10）：每种消息至少一个手工正例 + 一个手工反例；v1 帧拒绝、note op 私有变体、gameOver 三形态各至少一个手工用例
