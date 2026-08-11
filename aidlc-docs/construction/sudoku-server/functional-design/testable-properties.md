# Testable Properties（unit: sudoku-server）— Round 5 v2（竞速对抗模式）

PBT 框架：fast-check + Vitest（NFR-9/NFR-10）。生成器集中放 `tests/server-generators.ts`（PBT-07），复用 `tests/generators.ts` 的 v2 协议生成器。fc 默认 seed 输出（PBT-08）。与 example-based 互补（PBT-10）。

## SP-1 匹配算法不变量（BR-S-01/02）——沿用 v1

**性质**：对任意房间集合与请求难度 d，`matchRoom(d)`：① 返回 null ⟺ 无可加入房间；② 返回房间必可加入（playing 且 1 人）；③ 同难度可加入房间存在时必为 startedAt 最早者；④ 否则属"档位距离最近、同距离更难档优先"档位的 startedAt 最早者。
**类型**：Oracle。**生成器**：`arbRoomPool`、`arbDifficulty`（沿用）。

## SP-2 房间状态机不变量（BR-S-05/06/09/10/14/16/21，v2 修订）

**性质**：对任意合法消息序列（join×1-2 + op×n + leave×m，`arbOpScript` 生成，含越权操作如对方正确格 fill、非归属格 erase、given 格 fill）驱动 GameRoom 后，每一步：
1. 每格满足 CellEntry 一致性（given 格无 owner、空格不 wrong、非空非 given 格必有 owner）；
2. 每玩家 `score ≥ 0`（FR-31 下限恒成立，任意操作序列不破坏）；
3. 拒绝的 op 棋盘/分数/笔记无任何变化（BR-S-05 拒绝无副作用）；
4. `status` 仅 playing→won 单向；won 后一切 op 必 opRejected('game-over')；
5. 棋盘 wrong=true 格数 ≤ 累计错填次数；错填格 owner 为最近填入者。
**类型**：Invariant。

## SP-3 广播完整性与个性化（BR-S-11/16/19/20，v2 修订）

**性质**：
1. 被接受的非 note op：房间**每个成员**恰好收到 1 条 opApplied（个性化副本），公共部分（playerId/op/result/cell/completedUnits/scores）各副本逐字段相同；`clearedNotes` 仅出现在对应归属者副本且仅含自己的笔记格索引；
2. 被接受的 note op：**仅发起者**收到 1 条 opApplied（含 notes 全集），对方收到 0 条任何消息；
3. 被拒绝的 op：恰好 1 条仅面向发起者的 opRejected，无其他广播；
4. 触发终局的 op：opApplied 先于 gameOver；gameOver 全房各 1 条。
**类型**：Oracle（内存 Connection 桩录制比对计数、目标集合、顺序与副本差异）。

## SP-4 undo 隔离性（BR-S-10，v2 扩展）

**性质**：双人各执行随机操作脚本后，A 连续 undo 至栈空：
1. 棋盘上 owner=B 的格子集合（值与归属）与 A 开始 undo 前完全一致；
2. B 的 notesByPlayer 与 A 开始 undo 前一致（v2 新增：笔记私有隔离）；
3. B 的 ScoreState（score 与 combo）与 A 开始 undo 前一致（v2 新增：对方操作不影响，FR-32）。
**类型**：Invariant（差分比对）。**生成器**：`arbTwoPlayerScript`（沿用，保证双方均有可撤销记录）。

## SP-5 forfeit 与回收（BR-S-13/23/30，v2 重写，取代断线补位）

**性质**：任意房间状态下 removePlayer：
1. playing 且 hadTwoPlayers → 房间转为 won、在局者收到 gameOver(reason:'forfeit', winnerId=在局者)（BR-P-15）、**不广播 playerLeft**；
2. playing 且 hadTwoPlayers=false（单人房）→ 房间回收，rooms 不再含该 roomId；
3. won 房间 → 其余成员收到 playerLeft；在线 0 → 回收；
4. 终局后 matchRoom（任意难度）永不命中该房间（won 不可加入）。
**类型**：Oracle/Invariant。

## SP-6 ScoreEngine 计分属性（BR-S-24~28，v2 新增，NFR-10 点名）

**性质**（纯函数，生成任意 ScoreState{score:0..10000, combo:0..50} 与 recordedDelta）：
1. **下限**：任意操作后 `next.score ≥ 0`；且 score=0 时 applyFillWrong/applyErase(correct) 的 delta=0（无负分）；
2. **fill correct**：`next.combo = combo+1`；`delta = 100 + (combo+1 >= 3 ? 20 : 0)`；`next.score = score + delta`；
3. **combo 清零**：applyFillWrong/applyErase/applyUndoFill/applyRedoFill 后 `next.combo === 0`；
4. **undo/redo 对称**：对任意 s 与 recordedDelta>0，`applyRedoFill(applyUndoFill(s, d).next, d).next.score` 与 s.score 的差仅为下限截断造成的差额（无下限截断时严格相等，往返恒等）；recordedDelta<0 时 undo 与 redo 的 delta 均为 0（错填扣分永久不返还、也不重复扣）；
5. **note 无影响**：note op 不经 ScoreEngine（契约层保证，无可测属性——"No PBT properties identified"，由 SP-3 ②间接覆盖）。
**类型**：Oracle（参考实现比对）+ Invariant（下限/清零）。

## Example-based 互补场景（PBT-10，v2 修订）

| 场景 | 断言 |
|---|---|
| 单人完整对局：按 solution 顺序填满 | 每步 result='correct'；末步后收到 gameOver(reason:'completed', winnerId=自己, scores 含自己)；elapsedSeconds ≥ 0 |
| 双人竞速：A、B 交错填对 | 双方均收到对方 opApplied 公共部分；scores 随每次正确填入更新；completed 终局 winnerId=分高者 |
| 平分判和 | 双方各填对相同次数 → gameOver.winnerId === null |
| 连击加成 | 连续第 3 次填对起 delta=120；中间填错后重新计数；**对方填对后自己连击不清零**（FR-32 修订点） |
| 错填扣分下限 | score=50 时填错 → score=0（delta=-50 截断）；score=0 时填错 → score 仍 0 |
| 错填覆盖转移 | A 填错格 i；B 以正确值 fill 格 i → result='correct'、cell.owner=B、B 得分 |
| 擦对方格（正确/错填） | 均 opRejected('not-erasable')，棋盘无变化（v1 互擦已废） |
| 覆盖对方正确格 | opRejected('not-overwritable') |
| 笔记私有 | A note(i,v) → 仅 A 收到 opApplied(result:'note')；B 收 0 条消息；B 的 snapshotFor 不含该笔记 |
| 笔记代清双方 | A、B 均在格 j 有笔记 v；A 在同行填对 v → A、B 各自副本的 clearedNotes 均含 j（各自视角） |
| undo 错填不返还 | A 填错（-100）后 undo → score 不变（不返还），combo 清零 |
| undo 正确返还 | A 填对（+100）后 undo → score 回到原值（下限截断）；redo → 恢复 +100 |
| 离开判胜 | 双人 playing 中 B leave → A 收到 gameOver(reason:'forfeit', winnerId=A)；无 playerLeft |
| won 后操作 | 一切 op → opRejected('game-over') |
| 单人房离开回收 | 唯一玩家 leave → rooms 为空 |
| 非法帧 | 收到 error，连接保持 |
| undo/redo 空栈 | opRejected('nothing-to-undo' / 'nothing-to-redo') |
| fill 预填格 | opRejected('given-cell') |

## 与 PBT 规则对照
| 规则 | 落实 |
|---|---|
| PBT-02 往返 | shared-protocol 单元已覆盖（复用其 v2 生成器） |
| PBT-03 全输入安全 | deserialize 层已覆盖；Router 层"任意消息序列不抛异常"并入 SP-2 驱动器 |
| PBT-05 Oracle | SP-1/3/5/6 |
| PBT-06 Invariant | SP-2/4/6 |
| PBT-07 集中生成器 | tests/server-generators.ts |
| PBT-08 seed 输出 | fast-check 默认 |
| PBT-09 框架 | fast-check（已在 devDependencies） |
| PBT-10 互补 | 上表 18 个场景 |
