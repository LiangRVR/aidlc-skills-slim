# 扫雷（Minesweeper）

类似 Windows 经典扫雷的桌面小游戏，基于 Python + PyQt6 + uv。

## 运行

```cmd
uv sync
uv run python -m minesweeper
```

## 测试

```cmd
uv run pytest
```

## 打包 exe

```cmd
uv run python scripts/make_icon.py
uv run python build_exe.py
```

产物位于 `dist/minesweeper.exe`，双击即可游玩。

详细设计见 [docs/产品设计文档.md](docs/产品设计文档.md)。
