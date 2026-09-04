"""UI 回归测试（offscreen）。

防止 rebuild() 后格子未挂到布局导致空白盘面的回归（2026-09-04 bug）。
"""

import os

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

import pytest
from PySide6.QtWidgets import QApplication

from minesweeper.game import BEGINNER, EXPERT
from minesweeper.ui.main_window import MainWindow


@pytest.fixture(scope="session")
def qapp():
    return QApplication.instance() or QApplication([])


def test_rebuild_keeps_cells_in_layout(qapp) -> None:
    """切换难度重建棋盘后，所有格子必须挂在当前布局中。"""
    w = MainWindow()
    assert w.board.layout().count() == 9 * 9
    w.new_game(EXPERT)
    assert w.board.layout().count() == 16 * 30
    assert len(w.board._buttons) == 16
    assert len(w.board._buttons[0]) == 30


def test_rebuild_same_difficulty(qapp) -> None:
    """同难度重开后格子数量不变且布局不膨胀。"""
    w = MainWindow()
    w.new_game(BEGINNER)
    w.new_game(BEGINNER)
    assert w.board.layout().count() == 81
