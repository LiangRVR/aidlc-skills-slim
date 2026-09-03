"""Minefield grid widget bridging the pure Board logic and the cell buttons."""

from PyQt6.QtCore import pyqtSignal
from PyQt6.QtWidgets import QGridLayout, QWidget

from minesweeper.game import Board, CellState, GameStatus
from minesweeper.resources import FLAG, MINE, NUMBER_COLORS, QUESTION, WRONG
from minesweeper.ui.cell import CellButton

_REVEALED_STYLE = "background-color: #BDBDBD; border: 1px solid #808080;"
_EXPLODED_STYLE = "background-color: #FF0000; border: 1px solid #808080;"


class BoardWidget(QWidget):
    mines_left_changed = pyqtSignal(int)
    game_started = pyqtSignal()
    game_won = pyqtSignal()
    game_lost = pyqtSignal()
    cell_pressed = pyqtSignal()
    cell_released = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._grid = QGridLayout(self)
        self._grid.setSpacing(0)
        self._grid.setContentsMargins(0, 0, 0, 0)
        self.board: Board | None = None
        self.buttons: list[list[CellButton]] = []
        self._started = False

    def new_game(self, rows: int, cols: int, mines: int) -> None:
        for row in self.buttons:
            for button in row:
                self._grid.removeWidget(button)
                button.deleteLater()
        self.buttons = []

        self.board = Board(rows, cols, mines)
        self._started = False
        for r in range(rows):
            row = []
            for c in range(cols):
                button = CellButton(r, c)
                button.left_clicked.connect(self._on_left_clicked)
                button.right_clicked.connect(self._on_right_clicked)
                button.chord_requested.connect(self._on_chord)
                button.mouse_pressed.connect(self.cell_pressed)
                button.mouse_released.connect(self.cell_released)
                self._grid.addWidget(button, r, c)
                row.append(button)
            self.buttons.append(row)
        self.mines_left_changed.emit(self.board.mines_left)
        self.refresh()

    def refresh(self) -> None:
        board = self.board
        if board is None:
            return
        for r in range(board.rows):
            for c in range(board.cols):
                cell = board.cell(r, c)
                button = self.buttons[r][c]
                if cell.state is CellState.REVEALED:
                    button.setFlat(True)
                    if cell.is_mine:
                        style = _EXPLODED_STYLE if board.exploded == (r, c) else _REVEALED_STYLE
                        button.setStyleSheet(style)
                        button.setText(MINE)
                    elif cell.neighbor_mines > 0:
                        color = NUMBER_COLORS[cell.neighbor_mines]
                        button.setStyleSheet(_REVEALED_STYLE + f" color: {color};")
                        button.setText(str(cell.neighbor_mines))
                    else:
                        button.setStyleSheet(_REVEALED_STYLE)
                        button.setText("")
                else:
                    button.setFlat(False)
                    button.setStyleSheet("")
                    if cell.state is CellState.FLAGGED:
                        lost = board.status is GameStatus.LOST
                        button.setText(WRONG if lost and not cell.is_mine else FLAG)
                    elif cell.state is CellState.QUESTION:
                        button.setText(QUESTION)
                    else:
                        button.setText("")

    def _playing(self) -> bool:
        return self.board is not None and self.board.status in (
            GameStatus.READY,
            GameStatus.PLAYING,
        )

    def _on_left_clicked(self, row: int, col: int) -> None:
        if not self._playing():
            return
        self.board.reveal(row, col)
        self._after_action()

    def _on_right_clicked(self, row: int, col: int) -> None:
        if not self._playing():
            return
        self.board.toggle_flag(row, col)
        self.mines_left_changed.emit(self.board.mines_left)
        self.refresh()

    def _on_chord(self, row: int, col: int) -> None:
        if not self._playing():
            return
        self.board.chord(row, col)
        self._after_action()

    def _after_action(self) -> None:
        board = self.board
        if not self._started and board.status is GameStatus.PLAYING:
            self._started = True
            self.game_started.emit()
        self.mines_left_changed.emit(board.mines_left)
        self.refresh()
        if board.status is GameStatus.WON:
            self.game_won.emit()
        elif board.status is GameStatus.LOST:
            self.game_lost.emit()
