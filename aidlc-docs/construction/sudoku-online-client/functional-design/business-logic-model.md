# Business Logic Model（unit: sudoku-online-client）— Round 5 v2（竞速对抗模式）

## 1. 控制器双实现模型（F1/F2，FR-40 结构性保障）

```
GameScene ──依赖──> IGameController
                      ├── LocalGameController（既有，行为零变化）
                      └── OnlineGameController（v2 重大修订）
```

- `capabilities()`：联机 `{hint:false, reset:false, newGame:false}`；本地全 true（不变）。
- `isReadOnly()`：联机 = `disconnected || mirror.status==='won'`（v2：旁观态废除）；本地恒 false。

## 2. 联机会话生命周期（沿用 v1，协议升 v2）

```
MenuScene: page1(模式) -> page2(难度) -> 线上: connect(ws://<host>:8081)
  ├─ 失败 -> 中文提示，停留 page2（BR-C-08）
  └─ 成功 -> send join{difficulty}
     -> joined(Snapshot v2) -> 初始化镜像（cells/players含score/startedAt/you + ownNotes←yourNotes）-> 渲染 + ScoreBoard 初始分数
对局中：
  本地输入 -> op 消息 send（本地不改镜像，BR-C-01）
  服务端消息 -> applyServerMessage -> 镜像增量 -> EventBus -> 重渲染（ScoreBoard 随 scores 更新）
终局：
  gameOver -> 缓存 GameOverData -> status='won' -> isReadOnly()=true -> 终局覆盖层（BR-C-14）
返回主菜单/页面关闭 -> send leave -> ws.close()（BR-C-07）
ws 断开（非主动）-> disconnected=true -> "连接已断开"覆盖层（BR-C-08）
```

## 3. 消息应用流（applyServerMessage，v2 表，BR-C-03/13/15）

| 消息 | 镜像/界面动作 |
|---|---|
| joined | 初始化镜像（含 ownNotes←yourNotes）；启动计时显示；PlayerCountBadge；ScoreBoard 初始分数 |
| opApplied（公共部分） | 应用 cell/cellIndex 到镜像 cells；`scores` → 更新 players 镜像 + ScoreBoard.update；`playerId===自己 && result==='correct'` → 本地 VFX（含 completedUnits，FR-20）；对方 op → 仅镜像渲染（owner 黑色，无 VFX） |
| opApplied（私有部分，仅自己副本携带） | `notes`（result='note'）→ ownNotes[cellIndex] 整格替换；`clearedNotes`（{index,value} 条目，v2.1）→ correct/redone 移除该格该数字（同格其余保留）；undone 恢复该格该数字（仅空格生效）（BR-C-15） |
| opRejected | 镜像无变化；console 记录 reason |
| playerJoined | JoinToast.show('有玩家加入')；players +1（score:0）；Badge 更新 |
| playerLeft（仅 won 房间） | players -1；Badge 更新；JoinToast.show('对方已离开') |
| gameOver | 缓存 GameOverData；status='won'；停止计时；终局覆盖层（双方分数、胜/负/平局、用时；forfeit 区分"对方离开"文案，BR-C-14） |
| error | 中文提示条（非阻塞）显示 message |
| ~~playerLost~~ | **v2 移除**（FR-37） |
| ~~gameWon~~ | **v2 移除**（由 gameOver 取代） |

## 4. 镜像状态模型（v2）

- 镜像 = 服务端状态投影：`cells: CellEntry[81]`（无 notes）、`ownNotes: Map<number, Set<number>>`（**仅自己的私有笔记**）、`players: PlayerInfo[]`（含 score）、`startedAt`、`status`、`you`。
- **单一事实源**：镜像只被 applyServerMessage 修改；本地输入永远不改镜像（BR-C-01）。
- **笔记私有不变量**：ownNotes 只含自己的笔记；对方笔记在客户端不存在（FR-34）。
- **分数即时性**：ScoreBoard 与 players[].score 严格由 opApplied.scores / gameOver.scores 驱动，本地不计算（Q2=A）。
- 渲染快照（BoardSnapshot）：owners 归属着色（BR-C-09）+ notes 来自 ownNotes 投影（F7 数据源变更）。
- 计时：本地每秒渲染 `now - startedAt`；gameOver 后停止（定格 elapsedSeconds）。
- undo/redo 按钮始终可点，空栈 opRejected 兜底（BR-C-05）；结果经 opApplied 镜像更新（含 scores 变化）。

## 5. 本地模式路径（FR-40）

- LocalGameController **零行为变更**；GameScene 本地路径一切既有行为不变（存档、提示、重开、VFX、暂停计时）。
- 本地模式不实例化任何联机 UI（PlayerCountBadge/JoinToast/**ScoreBoard**/终局覆盖层）。
