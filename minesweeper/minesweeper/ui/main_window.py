"""Main window: menus, difficulty selection, face button, counters and timer."""

from PyQt6.QtCore import QTimer
from PyQt6.QtGui import QAction, QKeySequence
from PyQt6.QtWidgets import (
    QDialog,
    QDialogButtonBox,
    QFormLayout,
    QHBoxLayout,
    QLCDNumber,
    QMainWindow,
    QPushButton,
    QSpinBox,
    QVBoxLayout,
    QWidget,
)

from minesweeper.game import GameStatus
from minesweeper.resources import FACE_LOST, FACE_NORMAL, FACE_PRESS, FACE_WIN
from minesweeper.ui.board_widget import BoardWidget

DIFFICULTIES = {
    "初级": (9, 9, 10),
    "中级": (16, 16, 40),
    "高级": (16, 30, 99),
}


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("扫雷")
        self._rows, self._cols, self._mines = DIFFICULTIES["初级"]
        self._seconds = 0

        self._timer = QTimer(self)
        self._timer.setInterval(1000)
        self._timer.timeout.connect(self._tick)

        self.mines_lcd = self._make_lcd()
        self.time_lcd = self._make_lcd()
        self.face_button = QPushButton(FACE_NORMAL)
        self.face_button.setFixedSize(48, 48)
        self.face_button.setStyleSheet("font-size: 24px;")
        self.face_button.clicked.connect(self.new_game)

        header = QHBoxLayout()
        header.addWidget(self.mines_lcd)
        header.addStretch(1)
        header.addWidget(self.face_button)
        header.addStretch(1)
        header.addWidget(self.time_lcd)

        self.board_widget = BoardWidget()
        self.board_widget.mines_left_changed.connect(self.mines_lcd.display)
        self.board_widget.game_started.connect(self._timer.start)
        self.board_widget.game_won.connect(self._on_won)
        self.board_widget.game_lost.connect(self._on_lost)
        self.board_widget.cell_pressed.connect(self._on_cell_pressed)
        self.board_widget.cell_released.connect(self._on_cell_released)

        central = QWidget()
        layout = QVBoxLayout(central)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(8)
        layout.addLayout(header)
        layout.addWidget(self.board_widget)
        self.setCentralWidget(central)

        self._build_menu()
        self.new_game()

    @staticmethod
    def _make_lcd() -> QLCDNumber:
        lcd = QLCDNumber(3)
        lcd.setMinimumSize(72, 40)
        lcd.setSegmentStyle(QLCDNumber.SegmentStyle.Flat)
        lcd.setStyleSheet("background-color: #000000; color: #FF0000;")
        return lcd

    def _build_menu(self) -> None:
        menu = self.menuBar().addMenu("游戏(&G)")

        new_action = QAction("新游戏(&N)", self)
        new_action.setShortcut(QKeySequence("F2"))
        new_action.triggered.connect(self.new_game)
        menu.addAction(new_action)
        menu.addSeparator()

        for name, (rows, cols, mines) in DIFFICULTIES.items():
            action = QAction(name, self)
            action.triggered.connect(
                lambda _checked=False, r=rows, c=cols, m=mines: self.set_difficulty(r, c, m)
            )
            menu.addAction(action)

        custom_action = QAction("自定义(&C)...", self)
        custom_action.triggered.connect(self._custom_game)
        menu.addAction(custom_action)
        menu.addSeparator()

        exit_action = QAction("退出(&X)", self)
        exit_action.triggered.connect(self.close)
        menu.addAction(exit_action)

    def set_difficulty(self, rows: int, cols: int, mines: int) -> None:
        self._rows, self._cols, self._mines = rows, cols, mines
        self.new_game()

    def _custom_game(self) -> None:
        dialog = QDialog(self)
        dialog.setWindowTitle("自定义难度")
        form = QFormLayout(dialog)

        rows_box = QSpinBox()
        rows_box.setRange(9, 24)
        rows_box.setValue(self._rows)
        cols_box = QSpinBox()
        cols_box.setRange(9, 30)
        cols_box.setValue(self._cols)
        mines_box = QSpinBox()

        def update_mines_max() -> None:
            # 预留首点 3x3 安全区所需的最少空格
            mines_box.setMaximum(rows_box.value() * cols_box.value() - 9)

        rows_box.valueChanged.connect(update_mines_max)
        cols_box.valueChanged.connect(update_mines_max)
        mines_box.setMinimum(10)
        update_mines_max()
        mines_box.setValue(min(self._mines, mines_box.maximum()))

        form.addRow("行数(&R):", rows_box)
        form.addRow("列数(&C):", cols_box)
        form.addRow("雷数(&M):", mines_box)

        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(dialog.accept)
        buttons.rejected.connect(dialog.reject)
        form.addRow(buttons)

        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.set_difficulty(rows_box.value(), cols_box.value(), mines_box.value())

    def new_game(self) -> None:
        self._timer.stop()
        self._seconds = 0
        self.time_lcd.display(0)
        self.face_button.setText(FACE_NORMAL)
        self.board_widget.new_game(self._rows, self._cols, self._mines)
        self.adjustSize()
        self.setFixedSize(self.size())

    def _tick(self) -> None:
        self._seconds = min(self._seconds + 1, 999)
        self.time_lcd.display(self._seconds)

    def _on_won(self) -> None:
        self._timer.stop()
        self.face_button.setText(FACE_WIN)

    def _on_lost(self) -> None:
        self._timer.stop()
        self.face_button.setText(FACE_LOST)

    def _on_cell_pressed(self) -> None:
        board = self.board_widget.board
        if board is not None and board.status in (GameStatus.READY, GameStatus.PLAYING):
            self.face_button.setText(FACE_PRESS)

    def _on_cell_released(self) -> None:
        board = self.board_widget.board
        if board is None or board.status in (GameStatus.READY, GameStatus.PLAYING):
            self.face_button.setText(FACE_NORMAL)
        elif board.status is GameStatus.WON:
            self.face_button.setText(FACE_WIN)
        else:
            self.face_button.setText(FACE_LOST)
