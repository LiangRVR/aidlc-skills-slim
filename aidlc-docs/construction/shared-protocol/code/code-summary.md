# Code Summary — unit: shared-protocol（Round 5，协议 v2）

## 修改文件（全部就地修改，无副本）
| 文件 | 变更 |
|---|---|
| `shared/protocol.ts`（235 → 322 行） | v2 重写：PROTOCOL_VERSION=2；CellEntry 去 notes（严格四键白名单，含 notes 或任何未知键即拒，BR-P-05）；PlayerInfo={id, score 非负整数}；Snapshot 加 yourNotes（规范化整数键 "0"-"80"、值为合法笔记数组、仅限空格键，BR-P-11）；opApplied 按 BR-P-12 出席矩阵实现为 TS 判别联合（note / correct / wrong-erased-undone-redone 三变体）+ scores（BR-P-13）+ 可选 clearedNotes；ServerMessage 7 种，gameOver{winnerId\|null, reason:'completed'\|'forfeit', scores, elapsedSeconds}（forfeit 必非 null，BR-P-15）；移除 playerLost/gameWon；deserialize 全输入安全返回 null（BR-P-04） |
| `tests/generators.ts`（191 → 429 行） | v2 生成器：arbCellEntry（无 notes）/ arbPlayerInfo v2 / arbSnapshot（yourNotes 键仅取空格）/ arbOpApplied（出席矩阵全变体）/ arbGameOver 三形态 / arbServerMessage 7 种 / arbMessage；变异器覆盖 7 个 v2 变异点；arbOp/arbIndex/arbCompletedUnit 等导出签名保持兼容 |
| `tests/protocol.test.ts`（156 → 228 行，60 例） | example-based：每消息 1 正例 + 1 反例；v1 帧（version=1）拒绝、note 私有变体、gameOver 三形态、yourNotes 正/反例、CellEntry 携 notes 拒绝、scores 空对象拒绝、BR-P-05~08 一致性 6 例 |
| `tests/protocol.pbt.test.ts`（45 → 57 行，3 属性） | P1 往返深等 / P2 任意字符串+fc.anything+结构化畸形不抛异常、二值结果 / P3 单点变异必拒 + 未变异对照必收 |

## v2 关键决策落点
- CellEntry 白名单强度：仅允许 value/given/owner/wrong 四键（比"仅拒 notes"更严格，与 BR-P-05 一致）
- yourNotes 键规范化：拒绝 "00"/"+1"/"1e0" 等非规范数字串
- 非负整数收紧：startedAt/elapsedSeconds/score 按 isInt 校验（v1 仅查 ≥0）
- opApplied 出席矩阵在编译期由判别联合强制、运行期逐字段校验双重保障
- P3 变异器在极端快照（无空格/无填格）时回退为越界键变异，消除概率性失败

## 测试结果
```
npx vitest run tests/protocol.test.ts tests/protocol.pbt.test.ts
Test Files  2 passed (2)
Tests       63 passed (63)
```

## 备注
- 全仓 `tsc` 在 unit 2/3 完成前存在预期报错（server/src 仍引用 v1 类型），属 unit 2 (sudoku-server) 与 unit 3 (sudoku-online-client) 范围
