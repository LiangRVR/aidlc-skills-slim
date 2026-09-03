"""PyInstaller entry script (module-style imports don't work as PyInstaller targets)."""

from minesweeper.__main__ import main

if __name__ == "__main__":
    main()
