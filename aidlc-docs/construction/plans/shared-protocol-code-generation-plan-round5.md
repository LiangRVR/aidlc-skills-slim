# Code Generation Plan — unit: shared-protocol（Round 5，协议 v2）

> 本文件是 unit 1 Code Generation 的**唯一事实来源**；执行时严格按步骤顺序，完成即勾 [x]。

## Unit Context
- **故事追溯**：US-31~US-40 的协议契约载体（协议 v2 不直接实现业务规则，但为 server/client 单元提供类型与校验基础）
- **依赖**：无上游单元（unit 1 是协议契约单元）；下游 unit 2 (sudoku-server) / unit 3 (sudoku-online-client) 依赖本单元类型
- **接口/契约**：`aidlc-docs/inception/application-design/component-methods-round5.md`（冻结）；FD 四份制品 v2
- **拥有实体**：Envelope / Op / CellEntry v2 / PlayerInfo v2 / Snapshot v2（含 yourNotes）/ OpApplied 个性化负载 / ServerMessage 7 种（gameOver 取代 gameWon+playerLost）
- **Brownfield 规则**：所有目标文件均已存在 → **就地修改**，禁止新建 *_v2 / *_new 副本

## 既有文件盘点（修改对象）
| 文件 | 现状 | v2 处置 |
|---|---|---|
| `shared/protocol.ts` | v1 实现（235 行） | 就地重写为 v2 |
| `tests/generators.ts` | v1 生成器 + mutators | 就地更新协议生成器部分（arbCellEntry/arbPlayerInfo/arbSnapshot/arbOpApplied/arbServerMessage/arbMessage/applicableMutators） |
| `tests/protocol.test.ts` | v1 example-based | 就地重写为 v2 |
| `tests/protocol.pbt.test.ts` | v1 PBT | 就地重写为 v2（P1/P2/P3） |

**范围外（属于 unit 2/3）**：`tests/server-generators.ts`、`tests/client-generators.ts`、`tests/game-room*`、`tests/online-game-controller*`、`server/*`、`src/*`——本轮不触碰，随各自单元处理。

## 执行步骤

- [x] **Step 1: 重写 `shared/protocol.ts` 为协议 v2**
  - PROTOCOL_VERSION = 2
  - CellEntry 去 notes（严格白名单：出现 notes 字段即拒绝，BR-P-05）
  - PlayerInfo = { id, score }（score 非负整数）
  - Snapshot 加 yourNotes（键 "0"-"80"、值为合法笔记数组、不得含非空格键，BR-P-11）
  - OpApplied 个性化负载：公共字段 + scores（BR-P-13）+ 条件出席矩阵（BR-P-12）+ 私有 notes/clearedNotes
  - ServerMessage 7 种：移除 playerLost/gameWon，新增 gameOver{winnerId|null, reason:'completed'|'forfeit', scores, elapsedSeconds}（BR-P-15）
  - opRejected reason 仍为开放式非空字符串（BR-P-14，不白名单化）
  - serialize 注入 version=2（BR-P-09）；deserialize 全输入安全返回 null（BR-P-04）
- [x] **Step 2: 更新 `tests/generators.ts` 协议生成器与 mutators**
  - v2 生成器：Op / CellEntry（无 notes）/ PlayerInfo v2 / Snapshot v2（含 yourNotes）/ OpApplied 按 BR-P-12 出席矩阵生成全变体 / gameOver 三形态 / arbMessage
  - applicableMutators v2 变异点：version=1、CellEntry 携 notes、出席矩阵破坏、yourNotes 非法、scores 空对象/负分、gameOver forfeit+winnerId=null、playerLost/gameWon type
- [x] **Step 3: 重写 `tests/protocol.test.ts`（example-based，PBT-10）**
  - 每种消息至少 1 手工正例 + 1 手工反例
  - 必含：v1 帧拒绝（version=1）、note op 私有变体、gameOver 三形态（completed+胜 / completed+平局 / forfeit）、yourNotes 正例/反例
- [x] **Step 4: 重写 `tests/protocol.pbt.test.ts`（P1/P2/P3）**
  - P1 往返：arbMessage 全类型 `deserialize(serialize(m))` 深等
  - P2 安全：任意字符串 + 结构化畸形消息不抛异常、二值结果
  - P3 拒绝正确性：applicableMutators 单点变异必拒、未变异对照必收
- [x] **Step 5: 运行协议测试并修复至全绿**
  - `npx vitest run tests/protocol.test.ts tests/protocol.pbt.test.ts`
  - 失败时定位修复（只允许改 unit 1 范围内文件）
  - 备注：全仓 `tsc` 在 unit 2/3 完成前会有预期报错（下游仍引用 v1 类型），不属于本步验证范围
- [x] **Step 6: 生成代码摘要文档**
  - `aidlc-docs/construction/shared-protocol/code/code-summary.md`（修改文件清单、v2 关键决策落点、测试结果）

## 验证命令
```
npx vitest run tests/protocol.test.ts tests/protocol.pbt.test.ts
```
