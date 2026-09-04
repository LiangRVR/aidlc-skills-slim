"""格子按钮：区分左键 / 右键 / 左右键同按（chord）三种点击。"""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QMouseEvent
from PySide6.QtWidgets import QPushButton

CELL_SIZE = 28


class CellButton(QPushButton):
    """单个格子按钮。

    信号均携带 (row, col)；`sig_pressed` 用于主窗口切换笑脸 😮 状态。
    """

    sig_left = Signal(int, int)
    sig_right = Signal(int, int)
    sig_both = Signal(int, int)
    sig_pressed = Signal(bool)

    def __init__(self, row: int, col: int, parent=None) -> None:
        super().__init__(parent)
        self.row = row
        self.col = col
        self._pressed: set[Qt.MouseButton] = set()
        self.setFixedSize(CELL_SIZE, CELL_SIZE)
        self.setObjectName(f"cell-{row}-{col}")
        self.setFocusPolicy(Qt.FocusPolicy.NoFocus)

    def mousePressEvent(self, event: QMouseEvent) -> None:  # noqa: N802
        if event.button() in (Qt.MouseButton.LeftButton, Qt.MouseButton.RightButton):
            self._pressed.add(event.button())
            self.setDown(True)
            self.sig_pressed.emit(True)
        event.accept()

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:  # noqa: N802
        if not self._pressed:
            return
        combo = set(self._pressed)
        self._pressed.clear()
        self.setDown(False)
        self.sig_pressed.emit(False)
        if not self.rect().contains(event.pos()):
            return
        if {Qt.MouseButton.LeftButton, Qt.MouseButton.RightButton} <= combo:
            self.sig_both.emit(self.row, self.col)
        elif event.button() is Qt.MouseButton.LeftButton:
            self.sig_left.emit(self.row, self.col)
        elif event.button() is Qt.MouseButton.RightButton:
            self.sig_right.emit(self.row, self.col)
