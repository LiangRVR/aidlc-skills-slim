"""Application entry point: ``uv run python -m minesweeper``."""

import sys

from PyQt6.QtWidgets import QApplication

from minesweeper.ui.main_window import MainWindow


def main() -> None:
    app = QApplication(sys.argv)
    app.setApplicationName("Minesweeper")
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
