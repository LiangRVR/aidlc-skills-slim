# 扫雷（Minesweeper）

复刻经典 Windows 扫雷的桌面小游戏：PySide6 + QFluentWidgets 界面，uv 管理依赖。

## 玩法

- **左键**：打开格子；空白格自动级联展开
- **右键**：标记循环 旗帜 🚩 → 问号 ? → 空白
- **左右键同按**（已打开的数字格）：chord 快速开格——周围旗数等于数字时自动展开其余格子
- **首次点击必安全**：首点及其周围 8 格不会是雷
- 顶部：剩余雷数计数器、笑脸按钮（点击重开）、计时器（上限 999 秒）

## 难度

| 难度 | 行 x 列 | 雷数 |
|---|---|---|
| 初级 | 9 x 9 | 10 |
| 中级 | 16 x 16 | 40 |
| 高级 | 16 x 30 | 99 |
| 自定义 | 9~24 行、9~30 列 | 10 ~ 行x列-9 |

## 运行（源码）

```cmd
uv sync
uv run python launcher.py
```

## 测试

```cmd
uv run pytest -q
```

包含 pytest 示例单元测试与 Hypothesis 属性测试（布雷/邻雷计数/级联展开/胜负不变量）。

## 打包 exe

```cmd
uv run pyinstaller minesweeper.spec
```

产物：`dist\minesweeper.exe`（单文件、无控制台窗口）。

## 项目结构

```text
minesweeper/
├── launcher.py            # 入口
├── minesweeper/
│   ├── game.py            # 纯逻辑层（无 Qt 依赖）
│   └── ui/                # PySide6 + QFluentWidgets 界面
│       ├── cell_button.py
│       ├── board_widget.py
│       ├── custom_dialog.py
│       └── main_window.py
├── tests/
│   ├── test_game.py           # 示例单元测试
│   └── test_game_properties.py # Hypothesis 属性测试
├── pyproject.toml
└── minesweeper.spec       # PyInstaller 配置
```
