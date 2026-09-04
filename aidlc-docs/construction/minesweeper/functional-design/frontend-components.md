# 前端组件 - minesweeper

**UI 框架**: PySide6 + PyQt-Fluent-Widgets（QFluentWidgets）

## 组件层次

```text
MainWindow (FluentWindow 或 QWidget + Fluent 控件)
├── HeaderBar (QHBoxLayout)
│   ├── MineCounter (QLCDNumber 风格 Label, 3 位, 可为负)
│   ├── FaceButton (QPushButton, 😊/😮/😎/😵)
│   └── TimerLabel (3 位秒数, 上限 999)
├── BoardWidget (QGridLayout, 间距 0)
│   └── CellButton[rows][cols] (自定义 QPushButton)
└── 菜单/对话框
    ├── 难度菜单：初级 / 中级 / 高级 / 自定义...
    ├── CustomDifficultyDialog (行/列/雷数输入 + 校验)
    └── WinDialog (MessageBox, WON 时弹出：恭喜 + 用时, 再来一局/关闭, 一局仅一次)
```

## 状态与数据流

- UI 不保存游戏状态，仅持有 `Game` 实例引用
- 用户操作 → 调用 Game API → 按返回的变化格子集合增量刷新 CellButton
- 计时器：`QTimer` 每秒触发，仅 `PLAYING` 时累加；`WON/LOST` 停止

## 交互映射

| 用户操作 | CellButton 事件 | Game API |
|---|---|---|
| 左键点击（隐藏格） | leftClicked | `reveal(r, c)` |
| 右键点击（隐藏格） | rightClicked | `toggle_mark(r, c)` |
| 左右键同按（数字格） | bothClicked（按下 😮，松开执行） | `chord(r, c)` |
| 笑脸点击 | clicked | 新建 Game 重开 |
| 难度菜单 | triggered | 新建 Game（对应参数） |

## CellButton 渲染规则

| 状态 | 显示 |
|---|---|
| HIDDEN + NONE | 凸起空白按钮 |
| HIDDEN + FLAG | 旗帜 🚩 |
| HIDDEN + QUESTION | 问号 ? |
| REVEALED + 空白 | 凹陷无字 |
| REVEALED + 数字 | 1-8，经典配色（1蓝 2绿 3红 4深蓝 5棕 6青 7黑 8灰） |
| REVEALED + 雷（失败时） | 💣；触发雷红底；错误旗帜显示 ❌ |

## 校验规则

- 自定义难度对话框按 BR-7 边界即时校验，非法输入禁用确定按钮
