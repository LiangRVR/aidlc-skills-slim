# Business Rules（unit: sudoku-server）— Round 5 v2（竞速对抗模式）

## 匹配与房间管理（沿用 v1，标注变化）
| 规则 | 内容 | 来源 | v2 状态 |
|---|---|---|---|
| BR-S-01 | 匹配优先级链：① 同难度可加入房中 startedAt 最早；② 按档位距离升序、同距离更难档优先的可加入房中 startedAt 最早（中等→困难→简单→专家；困难→专家→中等→简单；简单→中等→困难→专家；专家→困难→中等→简单）；③ 均无则创建新房间 | FR-17 / US-17 | 沿用 |
| BR-S-02 | "可加入" = `status === 'playing'` 且 `players.length === 1` | FR-17 | 沿用（players 不再含观战者，观战概念已废除） |
| BR-S-03 | 免登录：ws 连接接入即分配 playerId，无注册/登录流程 | FR-16 / US-16 | 沿用 |
| BR-S-04 | 新房间创建时 `startedAt = now`，共享计时从房间创建起算 | FR-24 / US-24 | 沿用 |
| BR-S-13 | 在线玩家数降为 0（playing/won 均可）→ RoomManager 立即回收销毁；无定时清理任务 | FR-28 | 沿用 |
| BR-S-14 | `won` 为房间终态：不可加入、一切 op 拒绝（`opRejected('game-over')`）、继续为在局成员同步直至其离开 | FR-36/39 | 沿用（won 的触发从"填满全对 gameWon"改为 finalize completed/forfeit，见 BR-S-29/30） |
| ~~BR-S-12~~ | ~~leave 后房间回到可加入池（补位）~~ | — | **v2 废除**（FR-38：playing 中离开直接终局，不再补位） |
| ~~BR-S-18~~ | ~~补位玩家语义~~ | — | **v2 废除**（FR-38） |
| BR-S-23 | **离开判胜（forfeit）**：房间 playing 且 hadTwoPlayers=true 时玩家 leave/断线 → `finalize('forfeit')`，在局者直接获胜；不广播 playerLeft、不进入补位。playing 且仅 1 人离开 → 房间空置走回收检查（BR-S-13）。won 房间成员离开 → 广播 playerLeft + 回收检查 | FR-38 / US-38 | **v2 新增** |

## 操作裁决（v2 修订）
| 规则 | 内容 | 来源 | v2 状态 |
|---|---|---|---|
| BR-S-05 | op 裁决顺序固定：房间存在 → status=playing → 规则校验 → 执行；任一前置失败即拒绝，不产生副作用（~~玩家非观战~~前置已随旁观废除移除） | FR-18 | 修订（去观战前置） |
| BR-S-06 | fill 判定以服务端持有的 solution 为唯一权威（solution 永不下发）；填对：owner=playerId、wrong=false、联动清除**双方**私有笔记中同行/列/宫的该值（BR-S-11 v2）、收集新完成单元、经 ScoreEngine 计分（BR-S-24）；填错：wrong=true、owner=playerId、经 ScoreEngine 扣分（BR-S-25） | FR-18 / FR-31 | 修订（笔记清除改私有双方、加计分） |
| BR-S-16 | 服务端为状态权威：客户端操作经服务端确认（opApplied 含发起者）后才在镜像生效 | FR-18 | 沿用 |
| BR-S-17 | 提示、重开、新游戏在线上模式无服务端入口（协议无对应消息类型） | FR-25 / FR-27 / US-27 | 沿用 |
| BR-S-09 | erase 权限（v2 修订）：**仅归属者本人**可擦自己的格子（非 given、非空、owner=发起者）；错填格不再可被对方擦除——对方通过 fill 覆盖（BR-S-21）实现防占位 | FR-35 / US-35 | **修订**（v1"任何人可擦错填格"废除） |
| BR-S-10 | undo/redo 仅回退/重做自己的操作记录（每玩家独立栈）；空栈拒绝（'nothing-to-undo'/'nothing-to-redo'）；不得触及对方 owner 格。**过期记录语义保留**：undo 时若主格当前状态与记录 after 快照不一致（此后被他人改动），跳过恢复、丢弃该记录、照常广播 'undone'（携带当前格状态），不计分变更；redo 对称（对比 before 快照）。联动笔记恢复/清除仅作用于发起者自己的 notesByPlayer 且仍为空格的格子。undo/redo 均清零发起者 combo（BR-S-26） | FR-25 / FR-33 / US-25 | 修订（笔记恢复改私有 + 计分结算 + combo 清零） |
| BR-S-21 | fill 覆盖权限：目标格须为空格、owner=发起者的格子、或 **wrong=true 的错填格（任何归属）**——覆盖错填格成功时**归属转移**给发起者（防占位）；覆盖对方**正确**格 → `opRejected('not-overwritable')`；填入与现值相同 → `opRejected('no-op')`（幂等语义保留） | FR-35 / US-35 | 修订（v1 错填格互擦路径改为 fill 覆盖+归属转移） |
| ~~BR-S-07/08~~ | ~~独立错误计数/错 3 次判负旁观~~ | — | **v2 废除**（FR-37） |
| ~~BR-S-22~~ | ~~undo 错填返还错误计数~~ | — | **v2 废除**（错误计数已废；且 v2 明确规定 undo 错填**不返还 -100**，见 BR-S-27，防穷举刷分） |

## 计分规则（v2 新增，ScoreEngine 实现）
| 规则 | 内容 | 来源 |
|---|---|---|
| BR-S-24 | fill 正确：`combo' = combo+1`；`delta = 100 + (combo' >= 3 ? 20 : 0)`（连击第 3 次连续填对起每次 +20，**不递增**）；score 累加无上限 | FR-31 / FR-32 |
| BR-S-25 | fill 错误：`delta = -min(100, score)`（分数下限 0，Q5-B 修订）；combo 清零 | FR-31 |
| BR-S-26 | combo 清零触发：自己 fill wrong / erase / undo / redo；**不被对手任何操作打断**（applyOpponentCorrect 已删除）；note op 不影响分数与连击（不经 ScoreEngine） | FR-32 修订 |
| BR-S-27 | undo 结算（对称于 MoveRecord.scoreDelta）：undo 正确填入 → `delta = -min(recordedDelta, score)`（返还全部得分，下限 0）；**recordedDelta ≤ 0（错填或 erase 扣分记录）→ delta = 0：错填 -100 永久不返还（防穷举）；erase 扣分同样不返还（冻结契约无 applyUndoErase 入口）**；combo 清零 | FR-33 |
| BR-S-28 | redo 结算：redo 正确填入 → `delta = +recordedDelta`（原样恢复，不重新算连击）；recordedDelta ≤ 0 → delta = 0（错填不再扣分、erase 扣分不重扣）；combo 清零。erase 自己正确格 → `delta = -min(100, score)`；erase 自己错填格 → delta = 0 | FR-33 / FR-32 ③ |

## 笔记规则（v2 新增/修订）
| 规则 | 内容 | 来源 |
|---|---|---|
| BR-S-11 | **笔记私有化**：每玩家独立 notesByPlayer，互不可见、互不可改；note op toggle 语义仅作用于自己的笔记；确认（opApplied result='note' 含 notes 全集）**仅回发发起者**，对方收不到任何事件。fill 正确时服务端代清**双方**私有笔记中同行/列/宫的该值（**仅该值条目级移除**，同格其余笔记保留——v2.1 修正，2026-08-12），各自的 clearedNotes（{index,value} 条目）仅出现在各自个性化副本 | FR-34 / US-34 |

## 终局规则（v2 新增）
| 规则 | 内容 | 来源 |
|---|---|---|
| BR-S-29 | **completed 终局**：棋盘 81 格全部非空且全部 wrong=false（填满且全对）→ `finalize('completed')`：比分数，分高者胜；平分判和（winnerId=null） | FR-36 / US-36 |
| BR-S-30 | **forfeit 终局**：`finalize('forfeit')` 时在局者直接获胜（winnerId 非 null，BR-P-15） | FR-38 |
| BR-S-31 | `finalize(reason)`：计算胜负 → 向房间全体成员广播 `gameOver{winnerId, reason, scores, elapsedSeconds}` → status='won'。终局仅承载双方分数+胜负+用时（无其他结算信息） | FR-39 / US-39 |

## 通信与错误（v2 修订）
| 规则 | 内容 | 来源 | v2 状态 |
|---|---|---|---|
| BR-S-15 | 入站帧 deserialize 为 null（非法/版本不兼容，BR-P-04）→ 回复 `error('消息格式非法或版本不兼容')`，连接不主动断开 | shared-protocol 设计 | 沿用（version=2） |
| BR-S-19 | 广播目标（v2）：joined 仅加入者；opRejected/error 仅发起者；**note op 的 opApplied 仅发起者**；其余 opApplied 为**个性化副本**——公共部分全房相同，clearedNotes 仅出现在各自副本（Q5=A）；playerJoined 房间其余成员；playerLeft 仅 won 房间；gameOver 房间全体成员 | services-round5 / FR-34 | 修订 |
| BR-S-20 | 同一 op 的事件顺序：opApplied 先于由该 op 触发的 gameOver（先确认操作，再宣告结果） | 设计决策 | 沿用（playerLost/gameWon → gameOver） |

## 需求映射校验（v2）
| 需求 | 规则 | 状态 |
|---|---|---|
| FR-16 后端服务/免登录 | BR-S-03 | 对齐 |
| FR-17 匹配 | BR-S-01/02 | 对齐 |
| FR-18 权威状态/确认广播 | BR-S-05/06/16 | 对齐 |
| FR-24 共享计时 | BR-S-04 + finalize elapsedSeconds | 对齐 |
| FR-25 撤销仅自己/提示禁用 | BR-S-10/17 | 对齐 |
| FR-27 重开/新游戏禁用 | BR-S-17 | 对齐 |
| FR-31 计分（+100/-100 下限 0） | BR-S-24/25 | 对齐 |
| FR-32 连击（不被打断/服务端内部） | BR-S-24/26 | 对齐 |
| FR-33 undo/redo 结算（错填不返还） | BR-S-27/28 | 对齐 |
| FR-34 笔记私有化 | BR-S-11/19 | 对齐 |
| FR-35 归属（fill 覆盖错填格/erase 仅归属者） | BR-S-06/09/21 | 对齐 |
| FR-36 completed 终局（平分判和） | BR-S-29/31 | 对齐 |
| FR-37 废除判负旁观 | BR-S-05/07/08/22 废除标注 | 对齐 |
| FR-38 离开判胜（forfeit） | BR-S-23/30 | 对齐 |
| FR-39 终局展示内容 | BR-S-31 | 对齐 |

服务端覆盖的 15 个 FR 全部有规则落点（FR-40 本地零改动为前端约束，不在本单元），无遗漏。
