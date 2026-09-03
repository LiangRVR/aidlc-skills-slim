"""使用 PyInstaller 打包单文件 exe（根 .gitignore 忽略 *.spec，故用脚本代替 spec 文件）。

用法: uv run python build_exe.py
"""

import PyInstaller.__main__

PyInstaller.__main__.run(
    [
        "launcher.py",
        "--onefile",
        "--windowed",
        "--name",
        "minesweeper",
        "--icon",
        "assets/icon.ico",
        "--noconfirm",
        "--clean",
    ]
)
print("打包完成: dist/minesweeper.exe")
