# Testable Properties（unit: sudoku-server）

PBT 框架：fast-check + Vitest（NFR-9）。生成器集中放 `tests/server-generators.ts`（PBT-07），复用 `tests/generators.ts` 的协议生成器。fc 默认 seed 输出（PBT-08）。与 example-based 互补（PBT-10）。

## SP-1 匹配算法不变量（BR-S-01/02，NFR-9 点名）

**性质**：对任意房间集合（随机 difficulty/status/players 数量/startedAt）与任意请求难度 d，`matchRoom(d)` 的返回值满足：
1. 返回 null ⟺ 不存在可加入房间（status=playing 且 players.length===1）；
2. 返回房间 r 必然可加入；
3. 若存在同难度可加入房间，r 必为其中 startedAt 最早者；
4. 否则 r 必属于"档位距离最近、同距离更难档优先"的非空难度档，且为该档可加入房间中 startedAt 最早者。
**类型**：Oracle（自实现优先级链参考实现比对）。
**生成器**：`arbRoomPool`（0-6 个房间，随机四元组）、`arbDifficulty`。

## SP-2 房间状态机不变量（BR-S-05/06/07/08/14/16）

**性质**：对任意合法消息序列（join×1-2 + op×n + leave×m，由 `arbOpScript` 生成，含故意越权操作如观战者 op、given 格 fill）驱动 GameRoom 后，每一步都满足：
1. 每格满足 CellEntry 一致性（BR-P-06/07/08 的服务端对应：given 格无 owner、空格不 wrong、非空非 given 格必有 owner 且在 players 或已离开者中）；
2. 每玩家 `0 ≤ mistakes ≤ 3`；`spectating === (mistakes ≥ 3)`；
3. 观战者的 op 必产生 opRejected 且棋盘无变化（拒绝无副作用，BR-S-05）；
4. `status` 只可能 playing→won 单向迁移；won 之后一切 op 必 opRejected('game-over')；
5. 棋盘非空非 given 格中 wrong=true 的数量 ≤ 所有玩家（含已离开）累计错误次数。
**类型**：Invariant。

## SP-3 广播完整性（BR-S-16/19/20）

**性质**：被接受的 op 恰好产生一条面向房间全体成员的 opApplied 广播，且先于由它触发的 playerLost/gameWon；被拒绝的 op 恰好产生一条仅面向发起者的 opRejected，无其他广播。
**类型**：Oracle（录制发送记录比对计数、目标集合与顺序）。
**说明**：不依赖真实 ws——以内存 Connection 桩捕获发送（Functional Design 层即可测）。

## SP-4 undo 隔离性（BR-S-10）

**性质**：双人各执行随机操作脚本后，玩家 A 连续 undo 至栈空，则：棋盘上 owner=B 的格子集合（值与归属）与 A 开始 undo 前完全一致。
**类型**：Invariant（差分比对）。
**生成器**：`arbTwoPlayerScript`（交错 fill/erase/note，保证双方均有可撤销记录）。

## SP-5 断线补位与回收（BR-S-12/13/18）

**性质**：任意房间状态下 removePlayer：
1. 剩余 1 人且 status=playing → matchRoom（同难度）必命中该房间；
2. 剩余 0 人 → RoomManager.rooms 不再含该 roomId；
3. 补位加入的新玩家 mistakes=0、spectating=false，且收到的 Snapshot 棋盘与断线前一致（离开者 owner 格保留）。
**类型**：Oracle/Invariant。

## Example-based 互补场景（PBT-10）

| 场景 | 断言 |
|---|---|
| 单人完整对局：按 solution 顺序填满 | 每步 result='correct'；末步后收到 gameWon，elapsedSeconds ≥ 0 |
| 双人协作：A、B 交错填对 | 双方均收到对方 opApplied；gameWon 仅广播一次 |
| 3 错旁观：A 故意填错 3 次 | 第 3 次后 A 收到 playerLost；A 后续 op 全部 opRejected('spectating')；B 可继续并最终获胜 |
| 错填互擦：A 填错，B 擦除该格 | B 收到 opApplied(result:'erased')；该格复位为空 |
| 擦对方正确格 | opRejected('not-erasable')，棋盘无变化 |
| 补位：B 断线后 C join 同难度 | C 收到 joined，you=C，棋盘含 A 与已离开 B 的格子；C mistakes=0 |
| 空房回收：唯一玩家 leave | matchRoom 不再命中；rooms 为空 |
| won 后操作 | 一切 op → opRejected('game-over') |
| 非法帧 | 收到 error，连接保持 |
| undo 空栈 / redo 空栈 | opRejected('nothing-to-undo' / 'nothing-to-redo') |
| fill 预填格 | opRejected('given-cell') |
| 笔记联动清除（双人） | A 填对后 B 先前在同单元格的同名笔记出现在 clearedNotes |

## 与 PBT 规则对照
| 规则 | 落实 |
|---|---|
| PBT-02 往返 | shared-protocol 单元已覆盖（本单元复用其生成器） |
| PBT-03 全输入安全 | deserialize 层已覆盖；本单元 Router 层补"任意消息序列不抛异常"（并入 SP-2 驱动器） |
| PBT-05 Oracle | SP-1/3/5 |
| PBT-06 Invariant | SP-2/4 |
| PBT-07 集中生成器 | tests/server-generators.ts |
| PBT-08 seed 输出 | fast-check 默认 |
| PBT-09 框架 | fast-check（已在 devDependencies） |
| PBT-10 互补 | 上表 12 个场景 |
