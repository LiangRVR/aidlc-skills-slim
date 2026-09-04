"""自定义难度对话框。"""

from __future__ import annotations

from qfluentwidgets import BodyLabel, MessageBoxBase, SpinBox, SubtitleLabel
from PySide6.QtWidgets import QFormLayout

MIN_ROWS, MAX_ROWS = 9, 24
MIN_COLS, MAX_COLS = 9, 30
MIN_MINES = 10


class CustomDifficultyDialog(MessageBoxBase):
    """行 9~24、列 9~30、雷数 10~(行x列-9)，非法时禁用确定按钮。"""

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("custom-difficulty-dialog")

        title = SubtitleLabel("自定义难度", self)
        self.viewLayout.addWidget(title)

        self.rows_spin = SpinBox(self)
        self.rows_spin.setObjectName("custom-rows")
        self.rows_spin.setRange(MIN_ROWS, MAX_ROWS)
        self.rows_spin.setValue(9)

        self.cols_spin = SpinBox(self)
        self.cols_spin.setObjectName("custom-cols")
        self.cols_spin.setRange(MIN_COLS, MAX_COLS)
        self.cols_spin.setValue(9)

        self.mines_spin = SpinBox(self)
        self.mines_spin.setObjectName("custom-mines")
        self.mines_spin.setRange(MIN_MINES, MAX_ROWS * MAX_COLS - 9)
        self.mines_spin.setValue(10)

        self.hint_label = BodyLabel("", self)
        self.hint_label.setObjectName("custom-hint")
        self.hint_label.setStyleSheet("color:#d13438;")

        form = QFormLayout()
        form.addRow("行数 (9-24)", self.rows_spin)
        form.addRow("列数 (9-30)", self.cols_spin)
        form.addRow("雷数", self.mines_spin)
        self.viewLayout.addLayout(form)
        self.viewLayout.addWidget(self.hint_label)

        self.yesButton.setText("确定")
        self.cancelButton.setText("取消")

        self.rows_spin.valueChanged.connect(self._validate)
        self.cols_spin.valueChanged.connect(self._validate)
        self.mines_spin.valueChanged.connect(self._validate)
        self._validate()

    def values(self) -> tuple[int, int, int]:
        """返回 (行, 列, 雷数)。"""
        return (
            self.rows_spin.value(),
            self.cols_spin.value(),
            self.mines_spin.value(),
        )

    def _validate(self) -> None:
        max_mines = self.rows_spin.value() * self.cols_spin.value() - 9
        mines = self.mines_spin.value()
        if mines > max_mines:
            self.hint_label.setText(f"雷数不能超过 行x列-9 = {max_mines}")
            self.yesButton.setEnabled(False)
        else:
            self.hint_label.setText("")
            self.yesButton.setEnabled(True)
