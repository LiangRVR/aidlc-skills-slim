"""扫雷游戏入口。"""

import sys

from PySide6.QtWidgets import QApplication
from qfluentwidgets import Theme, setTheme

from minesweeper.ui.main_window import MainWindow


def main() -> None:
    app = QApplication(sys.argv)
    setTheme(Theme.AUTO)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
