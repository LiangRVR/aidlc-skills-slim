# Business Rules（unit: sudoku-server）

## 匹配与房间管理
| 规则 | 内容 | 来源 |
|---|---|---|
| BR-S-01 | 匹配优先级链：① 同难度可加入房中 startedAt 最早；② 按档位距离升序、同距离更难档优先的可加入房中 startedAt 最早（中等→困难→简单→专家；困难→专家→中等→简单；简单→中等→困难→专家；专家→困难→中等→简单）；③ 均无则创建新房间 | FR-17 / US-17 |
| BR-S-02 | "可加入" = `status === 'playing'` 且 `players.length === 1`（players 含观战者） | FR-17 |
| BR-S-03 | 免登录：ws 连接接入即分配 playerId，无注册/登录流程 | FR-16 / US-16 |
| BR-S-04 | 新房间创建时 `startedAt = now`，共享计时从房间创建起算 | FR-24 / US-24 |
| BR-S-12 | 玩家 leave/断线后房间保留；`players.length === 1` 且 playing 的房间自动回到可加入池（无显式状态变更，匹配谓词自然命中） | FR-28 / US-28 |
| BR-S-13 | 在线玩家数降为 0（playing/won 均可）→ RoomManager 立即回收销毁，内存状态全部丢弃；无定时清理任务 | FR-28 / application-design-round4 |
| BR-S-14 | `won` 为房间终态：不可加入、一切 op 拒绝（`opRejected('game-over')`）、继续为在局成员同步直至其离开 | FR-22 / application-design-round4 |
| BR-S-18 | 补位玩家：个人错误计数从 0 起（不继承离开者），从当前棋盘状态继续；离开者的 owner 格保留在棋盘 | FR-28 / US-28 |

## 操作裁决
| 规则 | 内容 | 来源 |
|---|---|---|
| BR-S-05 | op 裁决顺序固定：房间存在 → status=playing → 玩家非观战 → 规则校验 → 执行；任一前置失败即拒绝，不产生副作用 | FR-18 |
| BR-S-06 | fill 判定以服务端持有的 solution 为唯一权威（solution 永不下发）；填对：owner=playerId、wrong=false、清空该格笔记、联动清除同行/列/宫笔记中的该值、收集新完成单元；填错：wrong=true、owner=playerId、该玩家 mistakes+1 | FR-18 / FR-21 |
| BR-S-07 | 错误各自独立计数（上限 3）；错满 3 次仅该玩家判负转旁观（`playerLost` 广播），其余玩家继续；观战者可看棋盘不可操作 | FR-23 / US-23 |
| BR-S-08 | 观战玩家的任何 op → `opRejected('spectating')`，无棋盘副作用 | FR-23 |
| BR-S-09 | erase 权限：非 given 且非空格，且（该格 wrong=true 或 owner=发起者）——任何人可擦任何错填格；正确格仅归属者可擦 | FR-26 / US-26 |
| BR-S-10 | undo/redo 仅回退/重做自己的操作记录（每玩家独立栈）；空栈拒绝（'nothing-to-undo'/'nothing-to-redo'）；不得触及对方 owner 格。**过期记录语义（2026-08-07 PBT SP-4 修正）**：undo 时若主格当前状态与记录 after 快照不一致（此后被他人改动），跳过恢复、丢弃该记录、照常广播 'undone'（携带当前格状态），不计数变更；redo 对称（对比 before 快照）；联动笔记的恢复/清除仅作用于仍为空格的格子 | FR-25 / US-25 |
| BR-S-11 | 笔记共享无归属：双方互见互改，toggle 语义；填对联动清除作用于双方笔记 | FR-21 / US-21 |
| BR-S-16 | 服务端为状态权威：客户端操作经服务端确认（opApplied 广播含发起者）后才在镜像生效 | FR-18 |
| BR-S-17 | 提示、重开、新游戏在线上模式无服务端入口（协议无对应消息类型，收到即属非法/未知 type） | FR-25 / FR-27 / US-27 |

## 通信与错误
| 规则 | 内容 | 来源 |
|---|---|---|
| BR-S-15 | 入站帧 deserialize 为 null（非法/版本不兼容，BR-P-04）→ 回复 `error('消息格式非法或版本不兼容')`，连接不主动断开 | shared-protocol 设计 |
| BR-S-19 | 广播目标：joined 仅加入者；opRejected/error 仅发起者；opApplied/playerJoined/playerLeft/playerLost/gameWon 房间全体成员 | services-round4 |
| BR-S-20 | 同一 op 的事件顺序：opApplied 先于由该 op 触发的 playerLost/gameWon 广播（先确认操作，再宣告结果） | 设计决策 |

## 实施期补充规则（2026-08-07 Code Generation 细化）
| 规则 | 内容 | 来源 |
|---|---|---|
| BR-S-21 | fill 覆盖权限：目标格须为空格、owner=发起者的格子、或 wrong=true 的错填格（与 BR-S-09 擦除权限同构）；覆盖对方**正确**格 → `opRejected('not-overwritable')`；填入与现值相同且无笔记变化 → `opRejected('no-op')`；**重复提交与现值相同的错填（自己的 wrong 格同值）同样 → `opRejected('no-op')`**——幂等语义，防止重复帧/客户端重试导致同一错误被重复计数（PBT SP-2 发现，2026-08-07 修正） | 实施期决策（单机 fill 覆盖语义的双人扩展） |
| BR-S-22 | undo 撤销自己的错填时返还该次错误计数（mistakes-1），与单机模式 Move.mistakesDelta 语义一致；观战者无法 undo（BR-S-08 先行拦截），故返还不会导致观战恢复 | 实施期决策（对齐单机语义） |

## 需求映射校验
| 需求 | 规则 | 状态 |
|---|---|---|
| FR-16 后端服务/免登录 | BR-S-03 | 对齐 |
| FR-17 匹配 | BR-S-01/02 | 对齐 |
| FR-18 权威状态/确认广播 | BR-S-05/06/16 | 对齐 |
| FR-21 笔记共享/清除 | BR-S-06/11 | 对齐 |
| FR-22 合作胜利 | BR-S-14 + game-logic §9 | 对齐 |
| FR-23 独立错误/旁观 | BR-S-07/08 | 对齐 |
| FR-24 共享计时 | BR-S-04 + game-logic §12 | 对齐 |
| FR-25 撤销仅自己/提示禁用 | BR-S-10/17 | 对齐 |
| FR-26 错填互擦 | BR-S-09 | 对齐 |
| FR-27 重开/新游戏禁用 | BR-S-17 | 对齐 |
| FR-28 断线补位 | BR-S-12/13/18 | 对齐 |

服务端覆盖的 11 个 FR 全部有规则落点，无遗漏。
