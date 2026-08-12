# Frontend Components（unit: sudoku-online-client）— Round 5 v2（竞速对抗模式）

## 组件层级（联机模式 GameScene，v2）

```
MenuScene（无变更）
  └─ 模式选择 → GameScene（修订）
        ├─ BoardView（修订：笔记数据源=ownNotes 私有镜像；归属着色不变）
        ├─ ControlBar（修订：移除"错误 x/3"计数显示）
        ├─ PlayerCountBadge（无变更）
        ├─ JoinToast（无变更）
        ├─ ScoreBoard（新增 F8，FR-31）
        ├─ GameOverOverlay（新增：终局结算层，取代 v1 胜利层与 SpectatorOverlay）
        └─ DisconnectOverlay（无变更）
```

## MenuScene（无变更）

- 双页滑动导航、模式/难度选择、连接失败中文提示、`data-testid` 约定均沿用（FR-15/16）。

## GameScene（修订）

- **构造参数**：`{ mode: 'local' | 'online', difficulty: Difficulty }`（不变）。
- **local**：完全走既有路径，零变化（FR-40）。
- **online**：
  - 创建 WebSocketClient + OnlineGameController + PlayerCountBadge + JoinToast + **ScoreBoard**；不实例化 SaveManager。
  - 界面意图订阅（v2 修订）：playerJoined→JoinToast('有玩家加入')；playerLeft（won 房间）→JoinToast('对方已离开')；**gameOver→GameOverOverlay**（双方分数、胜/负/平局、用时；reason='forfeit' 时文案区分"对方离开，你获胜/对方获胜"）；error→非阻塞提示条；ws close（非主动）→DisconnectOverlay + 阻断输入。**移除：playerLost/SpectatorOverlay 全部订阅与渲染**。
  - 返回主菜单：send leave → close() → scene 切换（BR-C-07）。
- **data-testid**：`game-leave-button`、`game-disconnect-overlay`、~~`game-spectator-overlay`~~（移除）、**`game-over-overlay`**（新增）。

## ScoreBoard（新增 F8，FR-31/BR-C-13）

- **位置**：**顶部中央单行**（计时左、难度右之间的空区，y=14；自己行右对齐于中线 -8px、对方行左对齐于中线 +8px）；与 PlayerCountBadge（右上）不重叠；非交互（不监听 pointer 事件）。
- **渲染**：单行双段——"自己: n 分"（蓝色加粗）+ "对方: m 分"；~~两行纵向堆叠~~（v2 初版，因与按钮行重叠改为单行，2026-08-12 联调反馈）；自己段加重样式区分。
- **state**：`scores: Record<PlayerId, number>` + `you`；`update(scores, you)` 由 GameScene 在 joined 与每条 opApplied（公共 scores 字段）后调用；gameOver 后定格最终分。
- **data-testid**：`score-board`、`score-board-self`、`score-board-opponent`。

## GameOverOverlay（新增，FR-36~39/BR-C-14）

- **触发**：控制器 gameOverData 非 null 且 status='won'。
- **内容**：胜/负/平局标题（winnerId===you→"你赢了"；null→"平局"；否则"你输了"）+ 双方最终分数两行 + 用时（elapsedSeconds 格式化 mm:ss）+ reason='forfeit' 时副标题"对方已离开" + "返回主菜单"按钮。
- **样式**：复用 ResultOverlay 样式体系（与本地结算层视觉一致）。
- **data-testid**：`game-over-overlay`、`game-over-title`、`game-over-scores`、`game-over-time`、`game-over-back-button`。

## BoardView（修订，F7）

- **归属着色规则不变**（BR-C-09：wrong 红 > given > 自己蓝 > 对方黑）。
- **笔记渲染数据源变更**：BoardSnapshot.notes 来自控制器的 **ownNotes 私有镜像**投影（v1 为共享 CellEntry.notes）；渲染逻辑与笔记加粗（选中格数字 N 联动加粗）不变。
- **本地模式**：数据源不变（GameState.getNotes()），零变化（FR-40）。

## ControlBar（修订）

- capabilities 驱动禁用不变（hint/reset/newGame 联机禁用）。
- **移除**："错误 x/3"计数显示（myMistakes 已废，FR-37）；联机模式错误反馈仅靠错填红字与分数扣减。
- ~~图标按钮化~~（2026-08-12 试行，同日用户目验后回滚为文字按钮）。
- **data-testid**：沿用。

## PlayerCountBadge / JoinToast（无变更）

- 徽章"在线 n/2"；toast ~3 秒淡出单实例替换。playerLeft 仅 won 房间触发（v2 服务端语义），前端处理不变。

## 交互流时序（关键路径，v2）

```
自己填数：点击格 → 数字 → controller.inputDigit → 发 fill op（界面不变）
  → opApplied(correct)：镜像更新 + 蓝字 + VFX + ScoreBoard 自己 +100/+120
  → opApplied(wrong)：镜像红字 + ScoreBoard 自己 -100（下限 0）
对方填数：opApplied → 镜像更新（黑字/红字）+ ScoreBoard 对方分数变化 → 无 VFX
笔记：noteMode 输入 → 发 note op → 仅自己收到 opApplied(notes) → ownNotes 更新渲染；对方无任何感知
错填覆盖：对方 wrong 格 → 自己 fill 正确值 → opApplied(correct) → 该格转自己归属（蓝字）+ 自己得分
终局（completed）：填满全对 → gameOver → GameOverOverlay（分高者胜/平局 + 双方分数 + 用时）
终局（forfeit）：对方离开 → gameOver → GameOverOverlay（"对方已离开，你获胜"）
```

## API 集成点（组件 → 服务端消息，v2）

| 组件 | 发送 | 接收 |
|---|---|---|
| MenuScene | — | — |
| GameScene（经 OnlineGameController） | join / leave | joined / playerJoined / playerLeft / **gameOver** / error |
| OnlineGameController | op(fill/erase/note/undo/redo) | opApplied（个性化副本）/ opRejected |
| ScoreBoard | — | joined / opApplied.scores / gameOver.scores（经 GameScene 转发） |
| PlayerCountBadge | — | joined / playerJoined / playerLeft（经 GameScene 转发） |
| JoinToast | — | playerJoined / playerLeft |
| GameOverOverlay | — | gameOver（经 GameOverData 缓存） |
