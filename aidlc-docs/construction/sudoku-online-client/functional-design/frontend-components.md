# Frontend Components（unit: sudoku-online-client）

## 组件层级（联机模式 GameScene）

```
MenuScene（改动）
  └─ 模式选择 → GameScene（改动）
        ├─ BoardView（改动：归属着色）
        ├─ ControlBar（改动：capabilities 驱动禁用）
        ├─ PlayerCountBadge（新增，FR-30）
        ├─ JoinToast（新增，FR-19）
        ├─ SpectatorOverlay（旁观覆盖层，复用 ResultOverlay 样式体系）
        └─ DisconnectOverlay（断线覆盖层）
```

## MenuScene（改动）

- **页面结构**：双页滑动导航（实施期修订）——page1 标题 + "继续上次游戏"（有存档时）+ "本地游戏"/"线上游戏"；点击模式后 page1 向左滑出、page2 从右侧滑入（tween ~280ms）。
- **新增 state**：模式选择阶段（模式 → 难度 → 开局/连接），page2 含"选择难度"标题 + 四档难度按钮 + "返回"按钮（滑回 page1）+ 连接状态提示文本。
- **交互流**：`线上游戏` → 滑至 page2 选难度 → `ws://<location.hostname>:8081` 连接 → 成功进 GameScene(online)；失败中文提示并停留 page2，可点"返回"。`本地游戏` → 滑至 page2 选难度 → 既有开局流程，**零变化**。
- **data-testid**：`menu-mode-online`、`menu-mode-local`、`menu-difficulty-{easy|medium|hard|expert}`。

## GameScene（改动）

- **构造参数**：`{ mode: 'local' | 'online', difficulty: Difficulty }`。
- **local**：完全走既有路径（SaveManager、提示/重开/新游戏、暂停计时），唯一差异是控制器类型为 IGameController 接口。
- **online**：
  - 创建 WebSocketClient + OnlineGameController + PlayerCountBadge + JoinToast；不实例化 SaveManager。
  - 订阅控制器转发的界面意图（经 EventBus/直接回调）：playerJoined→JoinToast('有玩家加入')；playerLeft→JoinToast('对方已离开')；playerLost(自己)→SpectatorOverlay + isReadOnly 阻断；playerLost(对方)→JoinToast('对方已旁观')；gameWon→胜利覆盖层（elapsedSeconds）；error→非阻塞提示条；ws close（非主动）→DisconnectOverlay + 阻断输入。
  - 返回主菜单：send leave → close() → scene 切换（BR-C-07）。
- **data-testid**：`game-leave-button`、`game-spectator-overlay`、`game-disconnect-overlay`。

## BoardView（改动，F7）

- **props/state**：BoardSnapshot 增加 `owners` 与 `you`（见 domain-entities）。
- **渲染规则**：`value!==0 && !given` 时——`wrong` → 红（最高优先）；否则 `owner===you` → 蓝，`owner!==you` → 黑（实施期修订，原"自己黑/对方蓝"作废）；given 与空格笔记渲染不变。
- **本地模式**：owners 全 null、you=null → 走既有着色分支（零变化，FR-29）。
- **笔记加粗**（实施期变更）：选中格含数字 N 时，全盘笔记中所有 N 加粗显示；本地与联机模式同效（共用 BoardView.render）。

## ControlBar（改动）

- **改动点**：按钮启用态改由 `controller.capabilities()` 驱动（本地全 true 与现况一致）；联机时提示/重开/新游戏禁用（置灰不可点）。
- **错误计数显示**：联机显示自己的错误计数（"错误 x/3"），数据源为 MirrorState.myMistakes；本地不变。
- **data-testid**：`control-hint-button`、`control-reset-button`、`control-newgame-button`（禁用态断言用）。

## PlayerCountBadge（新增，FR-30/BR-C-10）

- **位置**：界面右上角（与 JoinToast 同区不同行，徽章在上）。
- **渲染**：Phaser Text，"在线 n/2"；非交互（不监听 pointer 事件，不遮挡棋盘）。
- **state**：`count: 1 | 2`；setCount 由 GameScene 在 joined/playerJoined/playerLeft 时调用。
- **data-testid**：`player-count-badge`。

## JoinToast（新增，FR-19/BR-C-11）

- **行为**：`show(text)` 在徽章下方显示文本，~3 秒淡出销毁；多次触发时新 toast 替换旧 toast（单实例，不堆叠）。
- **data-testid**：`join-toast`。

## 交互流时序（关键路径）

```
自己填数：点击格 → selectCell → 数字键/按钮 → controller.inputDigit
  → 发 fill op（界面不变）→ 服务端 opApplied(correct) → 镜像更新 + 重渲染 + VFX（completedUnits）
  → 或 opApplied(wrong) → 镜像红字 + 错误计数 +1
对方填数：服务端 opApplied → 镜像更新 + 重渲染（黑字）→ 无 VFX、无提示音
补位：对方离开 → JoinToast('对方已离开') + 徽章 1/2 → 新玩家加入 → JoinToast('有玩家加入') + 徽章 2/2
```

## API 集成点（组件 → 服务端消息）

| 组件 | 发送 | 接收 |
|---|---|---|
| MenuScene | — | — |
| GameScene（经 OnlineGameController） | join / leave | joined / playerJoined / playerLeft / playerLost / gameWon / error |
| OnlineGameController | op(fill/erase/note/undo/redo) | opApplied / opRejected |
| PlayerCountBadge | — | joined / playerJoined / playerLeft（经 GameScene 转发） |
| JoinToast | — | playerJoined / playerLeft / playerLost(对方) |
