"""棋盘组件：CellButton 网格，负责调用 Game API 并渲染结果。"""

from __future__ import annotations

from PySide6.QtCore import QTimer, Signal
from PySide6.QtWidgets import QGridLayout, QWidget

from ..game import Cell, CellState, Game, GameStatus, Mark
from .cell_button import CELL_SIZE, CellButton

NUMBER_COLORS = {
    1: "#0000ff",
    2: "#008000",
    3: "#ff0000",
    4: "#000080",
    5: "#800000",
    6: "#008080",
    7: "#000000",
    8: "#808080",
}

_BASE = "QPushButton{font-weight:bold;font-size:14px;%s}"
HIDDEN_STYLE = _BASE % "background:#c6c6c6;border:2px outset #ffffff;"
HIDDEN_HL_STYLE = _BASE % "background:#a0c4ff;border:2px outset #ffffff;"
REVEALED_STYLE = _BASE % "background:#e0e0e0;border:1px solid #b0b0b0;color:%s;"
TRIGGERED_STYLE = _BASE % "background:#ff0000;border:1px solid #b0b0b0;"


class BoardWidget(QWidget):
    """扫雷棋盘。UI 不保存游戏状态，仅渲染 Game 返回的变化。"""

    sig_state_changed = Signal()  # 计数器/笑脸/计时器需要刷新
    sig_pressed = Signal(bool)  # 有格子被按下（笑脸 😮）

    def __init__(self, game: Game, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("board-widget")
        self._grid = QGridLayout(self)
        self._grid.setSpacing(0)
        self._grid.setContentsMargins(0, 0, 0, 0)
        self._buttons: list[list[CellButton]] = []
        self._triggered: tuple[int, int] | None = None
        self.game = game
        self._populate()

    def rebuild(self, game: Game) -> None:
        """以新 Game 重建整个棋盘（复用已有布局）。"""
        self.game = game
        self._triggered = None
        for row in self._buttons:
            for btn in row:
                self._grid.removeWidget(btn)
                btn.deleteLater()
        self._buttons = []
        self._populate()

    def sizeHint(self):  # noqa: N802
        return self._grid.sizeHint()

    # ------------------------------------------------------------------ 构建

    def _populate(self) -> None:
        """向布局填充当前 Game 的格子按钮。"""
        for r in range(self.game.board.rows):
            row_buttons = []
            for c in range(self.game.board.cols):
                btn = CellButton(r, c, self)
                btn.sig_left.connect(self._on_left)
                btn.sig_right.connect(self._on_right)
                btn.sig_both.connect(self._on_both)
                btn.sig_pressed.connect(self.sig_pressed)
                self._render(btn, self.game.board.cells[r][c])
                self._grid.addWidget(btn, r, c)
                row_buttons.append(btn)
            self._buttons.append(row_buttons)
        self.setFixedSize(
            self.game.board.cols * CELL_SIZE,
            self.game.board.rows * CELL_SIZE,
        )

    # ------------------------------------------------------------------ 交互

    def _on_left(self, r: int, c: int) -> None:
        result = self.game.reveal(r, c)
        self._apply_changed(result.changed, mine_hit=(r, c) if result.status is GameStatus.LOST else None)
        self.sig_state_changed.emit()

    def _on_right(self, r: int, c: int) -> None:
        self.game.toggle_mark(r, c)
        self._render(self._buttons[r][c], self.game.board.cells[r][c])
        self.sig_state_changed.emit()

    def _on_both(self, r: int, c: int) -> None:
        result = self.game.chord(r, c)
        if result.highlight:
            self._flash(result.highlight)
            return
        self._apply_changed(result.changed, mine_hit=None)
        if result.status is GameStatus.LOST and result.changed:
            # chord 触发踩雷：changed 中含雷格
            self._triggered = next(
                (pos for pos in result.changed if self.game.board.cells[pos[0]][pos[1]].is_mine),
                None,
            )
        self.sig_state_changed.emit()

    # ------------------------------------------------------------------ 渲染

    def _apply_changed(self, changed: set[tuple[int, int]], mine_hit: tuple[int, int] | None) -> None:
        if mine_hit is not None:
            self._triggered = mine_hit
        if self.game.status is GameStatus.LOST:
            self._render_all()
            return
        for r, c in changed:
            self._render(self._buttons[r][c], self.game.board.cells[r][c])
        if self.game.status is GameStatus.WON:
            self._render_all()  # 雷格自动标旗需全量刷新

    def _render_all(self) -> None:
        for r in range(self.game.board.rows):
            for c in range(self.game.board.cols):
                self._render(self._buttons[r][c], self.game.board.cells[r][c], game_over=True)

    def _render(self, btn: CellButton, cell: Cell, game_over: bool = False) -> None:
        btn.setText("")
        if game_over and self.game.status is GameStatus.LOST:
            self._render_lost(btn, cell)
            return
        if cell.state is CellState.REVEALED:
            n = cell.adjacent_mines
            btn.setText(str(n) if n > 0 else "")
            btn.setStyleSheet(REVEALED_STYLE % NUMBER_COLORS.get(n, "#000000"))
            return
        btn.setStyleSheet(HIDDEN_STYLE)
        if cell.mark is Mark.FLAG:
            btn.setText("🚩")
        elif cell.mark is Mark.QUESTION:
            btn.setText("?")

    def _render_lost(self, btn: CellButton, cell: Cell) -> None:
        pos = (btn.row, btn.col)
        if cell.is_mine and cell.mark is not Mark.FLAG:
            btn.setText("💣")
            btn.setStyleSheet(TRIGGERED_STYLE if pos == self._triggered else REVEALED_STYLE % "#000000")
        elif not cell.is_mine and cell.mark is Mark.FLAG:
            btn.setText("❌")
            btn.setStyleSheet(REVEALED_STYLE % "#000000")
        else:
            self._render(btn, cell)

    def _flash(self, cells: set[tuple[int, int]]) -> None:
        """chord 旗数不足：短暂高亮周围未打开格，不改变状态。"""
        for r, c in cells:
            self._buttons[r][c].setStyleSheet(HIDDEN_HL_STYLE)
        QTimer.singleShot(150, lambda: self._unflash(cells))

    def _unflash(self, cells: set[tuple[int, int]]) -> None:
        for r, c in cells:
            cell = self.game.board.cells[r][c]
            if cell.state is CellState.HIDDEN:
                self._buttons[r][c].setStyleSheet(HIDDEN_STYLE)
