"""Single minefield cell button with classic left/right/chord mouse handling."""

from PyQt6.QtCore import QSize, Qt, pyqtSignal
from PyQt6.QtGui import QFont, QMouseEvent
from PyQt6.QtWidgets import QPushButton

from minesweeper.resources import CELL_SIZE

_BOTH = Qt.MouseButton.LeftButton | Qt.MouseButton.RightButton


class CellButton(QPushButton):
    left_clicked = pyqtSignal(int, int)
    right_clicked = pyqtSignal(int, int)
    chord_requested = pyqtSignal(int, int)
    mouse_pressed = pyqtSignal()
    mouse_released = pyqtSignal()

    def __init__(self, row: int, col: int, parent=None):
        super().__init__(parent)
        self.row = row
        self.col = col
        self._held = Qt.MouseButton.NoButton
        self.setFixedSize(QSize(CELL_SIZE, CELL_SIZE))
        self.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        font = QFont()
        font.setBold(True)
        font.setPointSize(11)
        self.setFont(font)

    def mousePressEvent(self, event: QMouseEvent) -> None:
        button = event.button()
        if button == Qt.MouseButton.MiddleButton:
            button = _BOTH
        self._held |= button
        self.mouse_pressed.emit()
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:
        button = event.button()
        if button == Qt.MouseButton.MiddleButton:
            button = _BOTH
        held_before = self._held
        self._held &= ~button
        inside = self.rect().contains(event.position().toPoint())

        if (held_before & _BOTH) == _BOTH:
            if inside:
                self.chord_requested.emit(self.row, self.col)
        elif button == Qt.MouseButton.LeftButton:
            if inside:
                self.left_clicked.emit(self.row, self.col)
        elif button == Qt.MouseButton.RightButton:
            self.right_clicked.emit(self.row, self.col)

        if self._held == Qt.MouseButton.NoButton:
            self.mouse_released.emit()
        super().mouseReleaseEvent(event)
