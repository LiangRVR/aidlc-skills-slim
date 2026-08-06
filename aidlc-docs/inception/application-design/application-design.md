# Application Design - 数独 Web 游戏（汇总）

## 架构总览

**分层**：纯 TypeScript 核心（引擎无关、可单测）→ Phaser 表现层 → localStorage 持久化层；表现层与核心间事件驱动解耦。

```text
ui/ (BoardView, NumberPad, ControlBar)
        |  回调/快照
scenes/ (MenuScene, GameScene)
        |  直接调用           ^ 事件订阅 (EventBus)
        v                    |
core/ GameController -> GameState, SudokuGenerator, SudokuSolver, RuleValidator, EventBus
        |
persistence/ SaveManager (localStorage)
```

## 文档索引

- 组件定义与职责：`components.md`（11 个组件，4 层）
- 方法签名与类型：`component-methods.md`（共享类型 Puzzle/GameSave/Difficulty 等）
- 服务编排：`services.md`（GameController 开局/输入/计时/终局编排，SaveManager 读写/清除路径）
- 依赖与通信：`component-dependency.md`（依赖矩阵、数据流、循环依赖约束）

## 需求覆盖映射

| 需求 | 承载组件 |
|---|---|
| FR-1 谜题生成 | SudokuGenerator + SudokuSolver（唯一性） |
| FR-2 难度选择 | MenuScene → SudokuGenerator |
| FR-3 数字填写 | GameScene（键盘/NumberPad）→ GameController → GameState；BoardView 区分预填格 |
| FR-4 冲突提示 | RuleValidator.conflictsAt → conflict:updated → BoardView 高亮 |
| FR-5 完成判定 | RuleValidator.isComplete → GameState → game:won |
| FR-6 候选数笔记 | GameState（笔记模式、自动清除）→ BoardView 渲染 |
| FR-7 计时器 | GameScene 计时器 → GameController.tick → ControlBar 显示 |
| FR-8 提示功能 | SudokuSolver.findHint → GameState.applyHint |
| FR-9 错误限制 | GameState（3 次上限）→ game:lost；ControlBar 计数显示 |
| FR-10 撤销/重做 | GameState 历史栈 → ControlBar 按钮可用态 |
| FR-11 本地存档 | GameController 自动保存 → SaveManager → MenuScene 续玩入口；损坏降级 |
| FR-12 新游戏/重开 | GameController.newGame / GameState.reset → MenuScene/ControlBar |

FR-1~FR-12 全部有承载组件，无遗漏。

## 一致性校验

- 无循环依赖（依赖方向 `ui/scenes → GameController → core/persistence`）
- core 层无 Phaser import，可独立单元测试（满足架构决策 Q1）
- 组件边界与 `core/ scenes/ ui/ persistence/` 分包一致（满足 Q2）
- 核心 → 表现层仅事件通信（满足 Q3）
