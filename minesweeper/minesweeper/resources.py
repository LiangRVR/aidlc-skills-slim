"""Shared UI resources: sizes, colors, and icon glyphs."""

CELL_SIZE = 32

# Classic Windows Minesweeper number colors (1-8)
NUMBER_COLORS = {
    1: "#0000FF",
    2: "#007B00",
    3: "#FF0000",
    4: "#00007B",
    5: "#7B0000",
    6: "#007B7B",
    7: "#000000",
    8: "#7B7B7B",
}

MINE = "\U0001f4a3"     # 💣
FLAG = "\U0001f6a9"     # 🚩
QUESTION = "❓"
WRONG = "❌"

FACE_NORMAL = "\U0001f600"  # 😀
FACE_PRESS = "\U0001f62e"   # 😮
FACE_WIN = "\U0001f60e"     # 😎
FACE_LOST = "\U0001f635"    # 😵
