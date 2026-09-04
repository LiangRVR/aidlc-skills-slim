"""主窗口：头部面板（计数器/笑脸/计时器）+ 棋盘 + 难度菜单。"""

from __future__ import annotations

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import QHBoxLayout, QLabel, QVBoxLayout, QWidget
from qfluentwidgets import Action, DropDownPushButton, FluentIcon, MessageBox, PushButton, RoundMenu

from ..game import BEGINNER, EXPERT, INTERMEDIATE, Game, GameStatus
from .board_widget import BoardWidget
from .custom_dialog import CustomDifficultyDialog

FACE_NORMAL = "😊"
FACE_PRESSED = "😮"
FACE_WON = "😎"
FACE_LOST = "😵"

LCD_STYLE = (
    "background:#000000;color:#ff0000;font-family:'Consolas';"
    "font-size:20px;font-weight:bold;padding:2px 8px;border:1px solid #888888;"
)

DIFFICULTIES: list[tuple[str, tuple[int, int, int]]] = [
    ("初级 (9x9, 10 雷)", BEGINNER),
    ("中级 (16x16, 40 雷)", INTERMEDIATE),
    ("高级 (16x30, 99 雷)", EXPERT),
]

MAX_SECONDS = 999


class MainWindow(QWidget):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("main-window")
        self.setWindowTitle("扫雷")
        self._difficulty = BEGINNER
        self.game = Game(*BEGINNER)
        self._seconds = 0
        self._win_shown = False

        # 头部面板
        self.counter_label = QLabel(self)
        self.counter_label.setObjectName("mine-counter")
        self.counter_label.setStyleSheet(LCD_STYLE)
        self.counter_label.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.face_button = PushButton(FACE_NORMAL, self)
        self.face_button.setObjectName("face-button")
        self.face_button.setFixedSize(40, 40)
        self.face_button.setStyleSheet("font-size:22px;")
        self.face_button.clicked.connect(lambda: self.new_game(self._difficulty))

        self.timer_label = QLabel(self)
        self.timer_label.setObjectName("timer-label")
        self.timer_label.setStyleSheet(LCD_STYLE)
        self.timer_label.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.menu_button = DropDownPushButton(FluentIcon.GAME, "游戏", self)
        self.menu_button.setObjectName("menu-button")
        menu = RoundMenu(parent=self.menu_button)
        for name, difficulty in DIFFICULTIES:
            action = Action(name, self)
            action.triggered.connect(lambda _=False, d=difficulty: self.new_game(d))
            menu.addAction(action)
        menu.addSeparator()
        custom_action = Action("自定义...", self)
        custom_action.setObjectName("menu-custom")
        custom_action.triggered.connect(self._open_custom_dialog)
        menu.addAction(custom_action)
        self.menu_button.setMenu(menu)

        header = QHBoxLayout()
        header.addWidget(self.counter_label)
        header.addStretch(1)
        header.addWidget(self.menu_button)
        header.addWidget(self.face_button)
        header.addStretch(1)
        header.addWidget(self.timer_label)

        # 棋盘
        self.board = BoardWidget(self.game, self)
        self.board.sig_state_changed.connect(self._on_state_changed)
        self.board.sig_pressed.connect(self._on_pressed)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)
        layout.addLayout(header)
        layout.addWidget(self.board, alignment=Qt.AlignmentFlag.AlignCenter)

        # 计时器
        self._timer = QTimer(self)
        self._timer.setInterval(1000)
        self._timer.timeout.connect(self._tick)

        self._update_header()
        self.adjustSize()
        self.setFixedSize(self.sizeHint())

    # ------------------------------------------------------------- 游戏控制

    def new_game(self, difficulty: tuple[int, int, int]) -> None:
        """以指定难度重开一局。"""
        self._difficulty = difficulty
        self.game = Game(*difficulty)
        self._seconds = 0
        self._win_shown = False
        self._timer.stop()
        self.face_button.setText(FACE_NORMAL)
        self.board.rebuild(self.game)
        self._update_header()
        self.adjustSize()
        self.setFixedSize(self.sizeHint())

    def _open_custom_dialog(self) -> None:
        dialog = CustomDifficultyDialog(self)
        if dialog.exec():
            self.new_game(dialog.values())

    # ------------------------------------------------------------- 状态刷新

    def _on_state_changed(self) -> None:
        status = self.game.status
        if status is GameStatus.PLAYING and not self._timer.isActive():
            self._timer.start()
        elif status in (GameStatus.WON, GameStatus.LOST):
            self._timer.stop()
            self.face_button.setText(FACE_WON if status is GameStatus.WON else FACE_LOST)
            if status is GameStatus.WON and not self._win_shown:
                self._win_shown = True
                QTimer.singleShot(0, self._show_win_dialog)
        elif status is GameStatus.PLAYING:
            self.face_button.setText(FACE_NORMAL)
        self._update_header()

    def _show_win_dialog(self) -> None:
        """通关画面：恭喜对话框，显示用时，可再来一局。"""
        if self.game.status is not GameStatus.WON:
            return
        seconds = min(self._seconds, MAX_SECONDS)
        box = MessageBox(
            "🎉 通关！",
            f"恭喜扫出全部 {self.game.board.mine_count} 颗雷，用时 {seconds} 秒！",
            self,
        )
        box.setObjectName("win-dialog")
        box.yesButton.setText("再来一局")
        box.cancelButton.setText("关闭")
        if box.exec():
            self.new_game(self._difficulty)

    def _on_pressed(self, pressed: bool) -> None:
        if self.game.status in (GameStatus.READY, GameStatus.PLAYING):
            self.face_button.setText(FACE_PRESSED if pressed else FACE_NORMAL)

    def _tick(self) -> None:
        if self._seconds < MAX_SECONDS:
            self._seconds += 1
        self._update_header()

    def _update_header(self) -> None:
        n = max(-99, min(999, self.game.remaining_mines))
        self.counter_label.setText(f"-{-n:02d}" if n < 0 else f"{n:03d}")
        self.timer_label.setText(f"{min(self._seconds, MAX_SECONDS):03d}")
