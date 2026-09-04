# UI 层代码摘要 - minesweeper

## 文件
- `minesweeper/ui/cell_button.py` — `CellButton`：区分左键/右键/左右同按三种点击，信号携带 (row,col)；objectName 为 `cell-{row}-{col}`
- `minesweeper/ui/board_widget.py` — `BoardWidget`：网格渲染、调用 Game API、增量刷新；chord 旗数不足时 150ms 高亮闪烁；失败时全量渲染（💣/触发红底/错误旗 ❌）；数字使用经典 1-8 配色
- `minesweeper/ui/custom_dialog.py` — `CustomDifficultyDialog(MessageBoxBase)`：行/列/雷 SpinBox + 实时校验（雷数 > 行x列-9 时禁用确定按钮）
- `minesweeper/ui/main_window.py` — `MainWindow`：LCD 风格计数器/计时器（上限 999 秒）、笑脸按钮（😊/😮/😎/😵）、DropDownPushButton+RoundMenu 难度菜单、QTimer 计时
- `launcher.py` — QApplication + setTheme(Theme.AUTO) + MainWindow

## 自动化友好标识
`main-window` / `mine-counter` / `face-button` / `timer-label` / `menu-button` / `menu-custom` / `board-widget` / `cell-{r}-{c}` / `custom-difficulty-dialog` / `custom-rows` / `custom-cols` / `custom-mines` / `custom-hint`

## 验证
- offscreen 冒烟测试通过：窗口构建、首点级联、难度切换、标记渲染、失败渲染路径、自定义对话框校验
- 修复记录：`RoundMenu(parent=...)` 参数位置；`MessageBoxBase` 无 `titleLabel` 改用 `SubtitleLabel`
