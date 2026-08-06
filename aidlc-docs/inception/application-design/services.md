# Services - 数独 Web 游戏

## GameController（core 层编排服务）

**Responsibilities**: 作为表现层与核心逻辑之间的唯一入口，编排单局游戏全流程。

**Orchestration Patterns**:
- **开局编排**：`newGame(difficulty)` → SudokuGenerator.generate → 创建 GameState → SaveManager.clear 旧存档 → emit `state:changed`
- **续玩编排**：`continueGame(save)` → GameState.fromSave → emit `state:changed`
- **输入编排**：接收 GameScene 转发的用户操作（填数/笔记/撤销/重做/提示/重开）→ 调用 GameState 对应方法 → GameState 内部经 EventBus 发布事件
- **计时与自动保存编排**：GameScene 的 Phaser 计时器每秒调用 `tick(1)` → GameState 累计用时 → 每 N 秒（或每次有效操作后）调用 SaveManager.save 自动存档
- **终局编排**：GameState 判定 won/lost → emit `game:won` / `game:lost` → GameScene 展示结算覆盖层；SaveManager 在终局时清除存档

## SaveManager（persistence 层服务）

**Responsibilities**: 持久化边界的唯一入口。

**Orchestration Patterns**:
- **写路径**：仅接受 GameController 传入的 GameSave（由 GameState.toSave 生成），JSON 序列化写入 localStorage 固定 key
- **读路径**：应用启动时 MenuScene 查询 `hasSave()`；`load()` 解析 JSON 并校验版本与结构，任何异常返回 null（优雅降级为新游戏，见 US-11）
- **清除路径**：新游戏开局、终局（胜利/失败）时清除存档

## 场景层编排（GameScene，非独立服务）

- **UI 组装**：创建 BoardView/NumberPad/ControlBar 并注入回调（onInput/onAction → GameController）
- **事件订阅**：订阅 EventBus 全部领域事件 → 调用各 UI 组件 render 方法刷新
- **输入路由**：物理键盘（1-9/Delete/Backspace）与 NumberPad 输入统一转发 GameController；格子点击转发 selectCell
