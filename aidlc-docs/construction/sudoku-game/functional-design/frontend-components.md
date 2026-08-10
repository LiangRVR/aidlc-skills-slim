# Frontend Components - unit: sudoku-game

## 组件结构

```text
MenuScene (Phaser Scene)
  - 继续上次游戏按钮（hasSave 时显示）
  - 新游戏按钮 + 难度选择（简单/中等/困难/专家，第三轮扩展）

GameScene (Phaser Scene)
  - BoardView        9x9 棋盘
  - NumberPad        棋盘下方一行横向数字按钮（1-9 + 清除）
  - ControlBar       撤销/重做/提示/笔记/新游戏/重开 + 计时 + 错误计数
  - ResultOverlay    胜利/失败覆盖层（GameScene 内实现）
  - VfxManager       连击特效（第二轮新增）：streak 4 档分层、格子粒子爆发、行/列/宫扫光、氛围特效（边框脉冲/上升粒子/屏幕边缘粒子框）、填错破碎+震屏清零
```

## BoardView

- **渲染输入**：`BoardSnapshot`（cells、selectedIndex、冲突格集合、noteMode）
- **渲染规则**：
  - 3x3 宫边界粗线，宫内线细线
  - 预填格：深色实心样式；用户填写：普通样式；错误值：红色（BR-06）
  - 选中格高亮；同行/列/宫关联格弱高亮；同数字格弱高亮；冲突格强高亮（BR-05）
  - 笔记：格内 3x3 小字布局渲染候选数；选中格含数字 N 时，全盘笔记中的 N 加粗显示（实施期变更，与同数字格弱高亮联动）
- **交互**：点击格子 → `onCellClick(index)` 回调 → GameController.selectCell

## NumberPad（一行横向布局）

- **布局**：棋盘正下方单行横向排列 1-9 数字按钮 + 清除键（不使用九宫格）
- **笔记模式视觉区分**：noteMode 开启时整行按钮着色 + 高亮边框（如蓝色描边）+ 按钮区显示"笔记"标识，明确提示当前模式
- **交互**：点击数字 → `onInput(value)`；清除键 → `onInput('erase')`

## ControlBar

- **按钮**：撤销 / 重做 / 提示 / 笔记切换 / 新游戏 / 重开
- **状态显示**：计时（mm:ss）、错误计数（"错误 x/3"）
- **可用态**：undoStack 空 → 撤销禁用；redoStack 空 → 重做禁用（BR-20）；笔记按钮高亮反映 noteMode
- **交互**：`onAction(action)` → GameController 对应方法；新游戏返回 MenuScene 难度选择

## 交互流

### 开局流
1. MenuScene：`SaveManager.hasSave()` 为 true → 显示"继续上次游戏"
2. 选"新游戏" → 难度选择 → `GameController.newGame(difficulty)` → 切换 GameScene
3. 选"继续" → `SaveManager.load()` 成功 → `GameController.continueGame(save)` → GameScene；失败 → 降级为新游戏入口（BR-23）

### 填数流
1. 点击格子选中 → 点 NumberPad 数字或按键盘 1-9 → `GameController.inputDigit(value)` 返回 `{index, result}`
2. noteMode=false → fill；noteMode=true → toggleNote
3. 事件 `state:changed`/`conflict:updated` → BoardView 重绘；`mistakes:changed` → ControlBar 更新
4. result=correct → `VfxManager.playCorrect`（含行/列/宫完成检测）；result=wrong → `VfxManager.playWrong`（连击清零）

### 键盘映射
- 1-9：输入数字（依 noteMode 分发）
- Delete/Backspace：清除
- N：切换笔记模式；Z：撤销；Y：重做；H：提示

### 终局流
- `game:won` → ResultOverlay 显示胜利 + 用时 + "再来一局"
- `game:lost` → ResultOverlay 显示失败 + "重新开始"

## 状态到渲染映射

| EventBus 事件 | UI 响应 |
|---|---|
| state:changed | BoardView 全量重绘；ControlBar 可用态更新 |
| conflict:updated | BoardView 冲突高亮更新 |
| mistakes:changed | ControlBar 错误计数更新 |
| timer:tick | ControlBar 计时显示更新 |
| note-mode:changed | NumberPad/ControlBar 笔记视觉切换 |
| game:won / game:lost | ResultOverlay 展示；存档清除 |

## API 集成点

无（纯前端，无后端端点）。
