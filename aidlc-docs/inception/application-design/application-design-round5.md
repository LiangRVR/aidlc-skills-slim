# Application Design（Round 5 - 竞速对抗模式，合并稿）

## 架构总览

Round 4 架构（单 package：`src/` + `server/` + `shared/`）不变。本轮将线上模式由合作制重构为**竞速对抗制**：协议升 v2（breaking），服务端新增纯函数计分模块，前端新增计分板与结算覆盖层，本地模式零改动。

**关键决策**（application-design-plan-round5.md 问答）：
1. **Q1=A 协议 v2**：version 升 2，旧版本走既有拒绝路径（BR-S-15 语义）
2. **Q2=A 分数随 opApplied 同步**：公共负载含双方总分；**补充：连击计数不下发、界面不显示**（服务端内部状态）
3. **Q3=A 独立 ScoreEngine**：纯函数结算模块（S6），GameRoom 持状态调用，PBT 友好
4. **Q4=A 私有笔记外挂**：GameRoom 持 `notesByPlayer`，src/core 零改动
5. **Q5=A 个性化消息**：同一 op 向不同玩家发不同负载（公共部分 + 各自 clearedNotes/notes 私有部分；note op 仅回发发起者）

## 组件清单（Round 5）

**新增**：S6 ScoreEngine（server/ 纯模块）、F8 ScoreBoard（src/ui/ 计分板）
**重大修订**：H1 Protocol（v2）、S5 GameRoom（计分/权限/私有笔记/终局）、F2 OnlineGameController（分数与私有笔记镜像、结算）
**中等修订**：S4 RoomManager（forfeit 编排）、F5 GameScene（结算覆盖层、去旁观）
**小幅修订**：F7 BoardView（笔记渲染数据源私有化）
**无变更**：S1/S2/S3、F1/F3/F4/F6、src/core 全部

详细：components-round5.md / component-methods-round5.md（协议冻结）/ services-round5.md / component-dependency-round5.md

## FR 覆盖校验（Round 5）

| 需求 | 设计落点 | 状态 |
|---|---|---|
| FR-31 计分系统 | S6 + S5.scores + H1 scores + F8 | 覆盖 |
| FR-32 连击计分 | S6（4 种清零路径：填错/erase/undo/redo；**【变更】对方操作不清零**） | 覆盖 |
| FR-33 undo/erase 分数结算 | S6 apply 系列 + S5 undoStacks.scoreDelta | 覆盖 |
| FR-34 笔记私有化 | S5.notesByPlayer + H1 yourNotes/个性化负载 + F2 私有镜像 | 覆盖 |
| FR-35 操作权限 | S5.applyOp 权限矩阵 | 覆盖 |
| FR-36 竞速胜负判定 | S5.finalize + H1 gameOver（completed/forfeit、平局 null） | 覆盖 |
| FR-37 废除判负旁观 | S5/S4 移除 mistakes/playerLost/旁观；F2/F5 移除旁观 UI | 覆盖 |
| FR-38 断线与房间生命周期 | S4.removePlayer 分支（hadTwoPlayers -> forfeit） | 覆盖 |
| FR-39 终局结算展示 | F5 结算覆盖层（双方分数+胜负+用时） | 覆盖 |
| FR-40 本地模式回归 | F1/src/core 零改动 | 覆盖 |

覆盖率 100%（FR-31~FR-40），无超出需求范围的组件。

## 对 Round 4 设计的取代关系

| Round 4 设计点 | Round 5 取代 |
|---|---|
| CellEntry.notes 共享笔记（FR-21） | CellEntry 去 notes；notesByPlayer 私有 + yourNotes（FR-34） |
| gameWon 合作胜利（FR-22） | gameOver 竞速结算（FR-36） |
| PlayerInfo.mistakes/spectating + playerLost（FR-23） | 移除；PlayerInfo.score（FR-31/FR-37） |
| erase 不限填写者（FR-26） | erase 仅归属者；wrong 格任何人可 fill 覆盖（FR-35） |
| 断线补位（FR-28） | 成局后离开即 forfeit 终局（FR-38） |

## 一致性

- 与 requirements.md 第五轮（FR-31~40、决策表）、stories.md（US-31~40）对齐
- 与 Round 4 设计延续：组件边界、匹配逻辑（FR-17）、共享计时（FR-24）、操作-确认-广播模型、VFX 隔离（FR-20）、归属着色全部保留
- 依赖无环；`src` 与 `server` 仅经 `shared/`；S6 为纯函数叶子模块
- 遗留定稿项（Functional Design）：权限矩阵的 opRejected reason 全集、ScoreEngine 边界用例（clamp/recordedDelta 精度）、个性化副本的字段级裁剪实现方式
