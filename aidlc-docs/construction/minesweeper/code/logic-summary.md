# 逻辑层代码摘要 - minesweeper

## 文件
- `minesweeper/game.py`（约 256 行，纯 Python，零 Qt 依赖）
- `minesweeper/__init__.py`（重导出公共符号）

## 公开 API
- 难度常量：`BEGINNER=(9,9,10)`、`INTERMEDIATE=(16,16,40)`、`EXPERT=(16,30,99)`
- 枚举：`CellState`(HIDDEN/REVEALED)、`Mark`(NONE/FLAG/QUESTION)、`GameStatus`(READY/PLAYING/WON/LOST)
- 数据类：`Cell`、`Board`、`RevealResult(changed,status)`、`ChordResult(changed,highlight,status)`
- `Game(rows, cols, mine_count, rng=None)`：参数校验（行 9-24、列 9-30、雷 10~行列积-9，否则 ValueError）
  - `reveal(r,c)` / `toggle_mark(r,c)` / `chord(r,c)`（越界抛 IndexError）
  - 只读属性：`board`、`remaining_mines`、`revealed_count`、`flag_count`、`status`

## 关键实现
- 懒布雷 `_place_mines`：首次 reveal 时执行，首点 3x3 邻域安全区排除后 `rng.sample` 布雷（BR-1）
- 级联展开：迭代式栈 flood fill，绝不进入雷格（BR-3.4/3.5）
- chord：旗数匹配时逐个 reveal 周围未标记格；不足时返回 highlight 集合（BR-5）
- 胜利 `_win`：revealed_count 达标后雷格自动标旗（BR-6.1）
