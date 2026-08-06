# Component Dependencies - 数独 Web 游戏

## 依赖矩阵

| 组件 | 依赖 | 依赖方式 |
|---|---|---|
| SudokuGenerator | SudokuSolver（唯一性校验） | 直接调用（core 内部） |
| GameState | RuleValidator、SudokuSolver（提示）、EventBus | 构造注入 EventBus；直接调用 core 模块 |
| GameController | SudokuGenerator、GameState、SaveManager、EventBus | 直接调用（core/persistence 边界唯一入口） |
| SaveManager | 无（仅 Web Storage API） | — |
| MenuScene | GameController、SaveManager | 直接调用 |
| GameScene | GameController、BoardView、NumberPad、ControlBar、EventBus | 输入直接调用；状态变更仅经事件订阅 |
| BoardView / NumberPad / ControlBar | 无 core 依赖（渲染快照/回调注入） | 回调与快照数据 |

## 通信模式

- **表现层 → 核心**：直接方法调用（GameScene/MenuScene → GameController），输入单向流入
- **核心 → 表现层**：仅事件驱动（EventBus），核心不 import 任何 Phaser/UI 模块，无反向依赖
- **核心内部**：直接调用（Generator→Solver、State→Validator）
- **持久化**：仅 GameController 访问 SaveManager，UI 不直接触碰 localStorage

## 数据流（文字描述）

1. 用户在 BoardView/NumberPad/键盘产生输入 → GameScene 转发 GameController
2. GameController 调用 GameState 变更状态（填数/笔记/撤销等）
3. GameState 通过 EventBus 发布领域事件（state:changed 等）
4. GameScene 订阅事件 → 从 GameState 取快照 → 调用 BoardView/ControlBar render
5. GameController 在 tick/有效操作时调用 SaveManager 自动存档

## 依赖约束（防止循环依赖）

- `core/` 不得依赖 `scenes/`、`ui/`、`persistence/`（persistence 仅 GameController 单向使用）
- `ui/` 组件不得依赖 `core/` 具体实现，仅接收快照数据与回调
- 无循环依赖：依赖方向为 `ui/scenes → GameController → core/persistence`
