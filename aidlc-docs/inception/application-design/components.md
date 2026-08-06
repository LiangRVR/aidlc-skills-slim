# Components - 数独 Web 游戏

**架构决策**：纯 TypeScript 核心（`core/`，不依赖 Phaser）+ Phaser 表现层（`scenes/`、`ui/`）+ 存档层（`persistence/`），层间事件驱动通信。

## core/ — 纯 TypeScript 核心（可独立单元测试）

### 1. SudokuGenerator
- **Purpose**: 生成数独谜题
- **Responsibilities**: 生成完整有效解；按难度挖空；保证谜题唯一解
- **Interfaces**: `generate(difficulty) -> Puzzle`

### 2. SudokuSolver
- **Purpose**: 求解与解分析
- **Responsibilities**: 回溯求解；解数量统计（唯一性校验，供 Generator 使用）；为提示功能定位可填格
- **Interfaces**: `solve / countSolutions / findHint`

### 3. RuleValidator
- **Purpose**: 数独规则校验
- **Responsibilities**: 行/列/宫冲突检测；答案正确性校验；完成判定
- **Interfaces**: `conflictsAt / isCorrect / isComplete`

### 4. GameState
- **Purpose**: 单局游戏状态与规则执行
- **Responsibilities**: 棋盘状态（填数、预填标记、候选数笔记）；笔记模式；错误计数（3 次上限）；状态机（playing/won/lost）；撤销/重做栈；计时累计
- **Interfaces**: `fill / erase / toggleNote / undo / redo / applyHint / reset`

### 5. EventBus
- **Purpose**: 核心与表现层解耦通信
- **Responsibilities**: 定义并分发领域事件（state:changed、conflict:updated、game:won 等）；纯 TS 实现，引擎无关
- **Interfaces**: `on / off / emit`

## scenes/ — Phaser 场景层

### 6. MenuScene
- **Purpose**: 主菜单与开局流程
- **Responsibilities**: 展示"继续上次游戏"（有存档时）与"开始新游戏"；难度选择（简单/中等/困难）
- **Interfaces**: Phaser Scene 生命周期（create 等）

### 7. GameScene
- **Purpose**: 游戏主场景（编排表现层）
- **Responsibilities**: 组装 BoardView/NumberPad/ControlBar；订阅 EventBus 事件刷新 UI；将用户输入转发给 GameController；胜利/失败反馈覆盖层；驱动计时
- **Interfaces**: Phaser Scene 生命周期

## ui/ — Phaser UI 控件

### 8. BoardView
- **Purpose**: 9x9 棋盘渲染
- **Responsibilities**: 网格与宫线绘制；数字/笔记渲染；选中格、关联行列宫、同数字、冲突格高亮；预填格与用户填写视觉区分
- **Interfaces**: `render(state) / setSelected(index)`

### 9. NumberPad
- **Purpose**: 屏幕数字输入区
- **Responsibilities**: 在 9x9 棋盘下方以**一行横向数字按钮**（1-9 依次排开，附清除键）提供输入，不使用九宫格布局；笔记模式下保持同一行布局不变，通过视觉区分（如按钮整体着色/高亮边框/笔记标识）让用户明确感知当前处于笔记模式
- **Interfaces**: `onInput(callback)`

### 10. ControlBar
- **Purpose**: 功能控制区
- **Responsibilities**: 撤销/重做/提示/笔记切换/新游戏/重开按钮；计时与错误计数显示（"错误 x/3"）
- **Interfaces**: `render(status) / onAction(callback)`

## persistence/ — 存档层

### 11. SaveManager
- **Purpose**: localStorage 持久化
- **Responsibilities**: 游戏进度序列化/反序列化；损坏数据降级（返回 null 按新游戏处理）；存档清除
- **Interfaces**: `save / load / hasSave / clear`
