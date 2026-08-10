# Business Logic Model（unit: sudoku-online-client）

## 1. 控制器双实现模型（F1/F2，FR-29 结构性保障）

```
GameScene ──依赖──> IGameController（接口，src/core/game-controller.ts）
                      ├── LocalGameController（既有 GameController 改名，行为零变化）
                      └── OnlineGameController（新增 src/net/online-game-controller.ts，Q2 定稿）
```

- `IGameController` 方法集以 component-methods-round4 为准：`newGame / inputDigit / erase / undo / redo / hint / reset / toggleNoteMode / selectCell / tick / isReadOnly / capabilities`。
- `capabilities()`：联机返回 `{ hint: false, reset: false, newGame: false }`（FR-25/27）；本地保持现状全 true。
- `isReadOnly()`：联机旁观（自己 playerLost）或连接断开时为 true，GameScene 据此阻断输入（BR-C-06）。

## 2. 联机会话生命周期

```
MenuScene: page1(模式选择) -> 点击模式滑动至 page2(难度选择+返回) -> 选难度
  -> 本地: GameScene(local)；线上: WebSocketClient.connect(ws://<页面host>:8081)（Q1）
     ├─ 失败 -> 中文提示"无法连接到服务器，请确认服务已启动"，停留 page2 可返回（BR-C-08）
     └─ 成功 -> send join{difficulty}
        -> joined(Snapshot) -> OnlineGameController 初始化镜像（BR-C-02）-> 渲染
对局中：
  本地输入 -> IGameController 方法 -> 转为 op 消息 send（本地不改棋盘，BR-C-01）
  服务端广播 -> applyServerMessage -> 更新镜像 -> EventBus 事件 -> GameScene 重渲染
返回主菜单 / 页面关闭 -> send leave -> ws.close()（BR-C-07）
ws 断开（非主动）-> isReadOnly()=true -> "连接已断开"覆盖层 -> 返回主菜单
```

## 3. 消息应用流（applyServerMessage，BR-C-03）

| 消息 | 镜像/界面动作 |
|---|---|
| joined | 初始化镜像（cells/players/startedAt/you）；启动计时显示（now-startedAt）；更新 PlayerCountBadge |
| opApplied | 应用 cell 到镜像；`clearedNotes` 索引格移除对应笔记；`playerId===自己 && result==='correct'` → 派发本地 VFX 事件（含 completedUnits，FR-20）；`playerId===自己 && result==='wrong'` → 自己错误计数 +1 显示；对方 op → 仅镜像更新渲染（owner 黑色，无 VFX） |
| opRejected | 忽略棋盘（镜像未变）；可 console 记录（reason 供调试） |
| playerJoined | JoinToast.show('有玩家加入')（FR-19）；players 镜像 +1；PlayerCountBadge 更新 |
| playerLeft | players 镜像 -1；PlayerCountBadge 更新；JoinToast.show('对方已离开')（US-28 配合） |
| playerLost | `playerId===自己` → 旁观覆盖层 + isReadOnly()=true；`对方` → 状态提示"对方已旁观" |
| gameWon | 停止计时；胜利覆盖层显示 elapsedSeconds（FR-22） |
| error | 中文提示条（非阻塞）显示 message |

## 4. 镜像状态模型

- 镜像 = 服务端 Snapshot 的客户端投影：`cells: CellEntry[81]`（含 owner/wrong/notes）、`players: PlayerInfo[]`、`startedAt`、`status`、`you`。
- **单一事实源**：镜像只被 applyServerMessage 修改；本地输入永远不改镜像（BR-C-01，权威确认语义 BR-S-16）。
- 渲染快照（BoardSnapshot 扩展）：在既有字段上增加 `owners: (PlayerId | null)[]`，BoardView 据此区分自己（蓝）/对方（黑）/预填（默认样式），错填仍红（FR-20，F7）。
- 计时：本地 `setInterval` 每秒渲染 `now - startedAt`（US-24；页面可见性暂停规则不适用线上）。
- 撤销/重做：undo/redo 按钮可用性无法本地预知（栈在服务端）——始终可点，空栈由服务端 opRejected 兜底（BR-C-05）。
- 笔记模式：本地 UI 状态（noteMode flag），切换不发送消息；输入数字时按模式决定发 fill 还是 note op（BR-C-04）。

## 5. 本地模式路径（FR-29）

- LocalGameController 仅改名 + implements IGameController，**禁止任何行为变更**；GameScene 对 Local 路径的所有既有行为（存档、提示、重开、VFX、暂停计时）不变。
- 本地模式不出现任何联机 UI（PlayerCountBadge/JoinToast/旁观层，US-29）。
