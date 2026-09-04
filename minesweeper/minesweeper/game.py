"""扫雷游戏纯逻辑层，不依赖任何 Qt 模块。

坐标越界处理约定：reveal / toggle_mark / chord 对越界坐标一律抛出 IndexError。
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from enum import Enum

# 预置难度：(行, 列, 雷数)
BEGINNER = (9, 9, 10)
INTERMEDIATE = (16, 16, 40)
EXPERT = (16, 30, 99)


class CellState(Enum):
    HIDDEN = "hidden"
    REVEALED = "revealed"


class Mark(Enum):
    NONE = "none"
    FLAG = "flag"
    QUESTION = "question"


class GameStatus(Enum):
    READY = "ready"
    PLAYING = "playing"
    WON = "won"
    LOST = "lost"


@dataclass
class Cell:
    is_mine: bool = False
    adjacent_mines: int = 0
    state: CellState = CellState.HIDDEN
    mark: Mark = Mark.NONE


@dataclass
class Board:
    rows: int
    cols: int
    mine_count: int
    cells: list[list[Cell]]
    mines_placed: bool = False


@dataclass
class RevealResult:
    changed: set[tuple[int, int]]
    status: GameStatus


@dataclass
class ChordResult:
    changed: set[tuple[int, int]]
    highlight: set[tuple[int, int]]
    status: GameStatus


class Game:
    """经典扫雷逻辑。

    坐标越界时 reveal / toggle_mark / chord 抛出 IndexError。
    """

    def __init__(
        self,
        rows: int,
        cols: int,
        mine_count: int,
        rng: random.Random | None = None,
    ) -> None:
        if not 9 <= rows <= 24:
            raise ValueError(f"rows 必须在 [9, 24] 内，当前为 {rows}")
        if not 9 <= cols <= 30:
            raise ValueError(f"cols 必须在 [9, 30] 内，当前为 {cols}")
        if not 10 <= mine_count <= rows * cols - 9:
            raise ValueError(
                f"mine_count 必须在 [10, {rows * cols - 9}] 内，当前为 {mine_count}"
            )
        self._board = Board(
            rows=rows,
            cols=cols,
            mine_count=mine_count,
            cells=[[Cell() for _ in range(cols)] for _ in range(rows)],
        )
        self._rng = rng if rng is not None else random.Random()
        self._revealed_count = 0
        self._flag_count = 0
        self._status = GameStatus.READY

    @property
    def board(self) -> Board:
        """当前棋盘。"""
        return self._board

    @property
    def remaining_mines(self) -> int:
        """剩余雷数 = mine_count - flag_count，可为负。"""
        return self._board.mine_count - self._flag_count

    @property
    def revealed_count(self) -> int:
        """已翻开格数。"""
        return self._revealed_count

    @property
    def flag_count(self) -> int:
        """已插旗格数。"""
        return self._flag_count

    @property
    def status(self) -> GameStatus:
        """当前游戏状态。"""
        return self._status

    def reveal(self, row: int, col: int) -> RevealResult:
        """翻开指定格；首次翻开时懒布雷。已结束或已翻开/被标记的格子不改变状态。"""
        self._check_bounds(row, col)
        if self._status in (GameStatus.WON, GameStatus.LOST):
            return RevealResult(set(), self._status)
        if not self._board.mines_placed:
            self._place_mines(row, col)
            self._status = GameStatus.PLAYING
        cell = self._board.cells[row][col]
        if cell.state is not CellState.HIDDEN or cell.mark is not Mark.NONE:
            return RevealResult(set(), self._status)
        changed: set[tuple[int, int]] = set()
        if cell.is_mine:
            cell.state = CellState.REVEALED
            self._revealed_count += 1
            changed.add((row, col))
            self._status = GameStatus.LOST
            return RevealResult(changed, self._status)
        stack = [(row, col)]
        while stack:
            r, c = stack.pop()
            if not self._in_bounds(r, c):
                continue
            cur = self._board.cells[r][c]
            if cur.is_mine or cur.state is not CellState.HIDDEN or cur.mark is not Mark.NONE:
                continue
            cur.state = CellState.REVEALED
            self._revealed_count += 1
            changed.add((r, c))
            if cur.adjacent_mines == 0:
                for nr, nc in self._neighbors(r, c):
                    nb = self._board.cells[nr][nc]
                    if (
                        not nb.is_mine
                        and nb.state is CellState.HIDDEN
                        and nb.mark is Mark.NONE
                    ):
                        stack.append((nr, nc))
        if self._revealed_count == self._board.rows * self._board.cols - self._board.mine_count:
            self._win()
        return RevealResult(changed, self._status)

    def toggle_mark(self, row: int, col: int) -> Mark:
        """切换标记：NONE→FLAG→QUESTION→NONE；仅 HIDDEN 格可标记。"""
        self._check_bounds(row, col)
        cell = self._board.cells[row][col]
        if self._status in (GameStatus.WON, GameStatus.LOST):
            return cell.mark
        if cell.state is not CellState.HIDDEN:
            return cell.mark
        if cell.mark is Mark.NONE:
            cell.mark = Mark.FLAG
            self._flag_count += 1
        elif cell.mark is Mark.FLAG:
            cell.mark = Mark.QUESTION
            self._flag_count -= 1
        else:
            cell.mark = Mark.NONE
        return cell.mark

    def chord(self, row: int, col: int) -> ChordResult:
        """对已翻开的数字格扫雷：周围旗数==数字时翻开周围未标记格，否则返回高亮提示。"""
        self._check_bounds(row, col)
        if self._status in (GameStatus.WON, GameStatus.LOST):
            return ChordResult(set(), set(), self._status)
        cell = self._board.cells[row][col]
        if cell.state is not CellState.REVEALED or cell.adjacent_mines == 0:
            return ChordResult(set(), set(), self._status)
        neighbors = list(self._neighbors(row, col))
        flag_count = sum(
            1 for nr, nc in neighbors if self._board.cells[nr][nc].mark is Mark.FLAG
        )
        hidden = {
            (nr, nc)
            for nr, nc in neighbors
            if self._board.cells[nr][nc].state is CellState.HIDDEN
        }
        if flag_count != cell.adjacent_mines:
            return ChordResult(set(), hidden, self._status)
        changed: set[tuple[int, int]] = set()
        for nr, nc in neighbors:
            nb = self._board.cells[nr][nc]
            if nb.state is CellState.HIDDEN and nb.mark is Mark.NONE:
                changed |= self.reveal(nr, nc).changed
        return ChordResult(changed, set(), self._status)

    def _place_mines(self, first_row: int, first_col: int) -> None:
        """首点及其 3x3 邻域为安全区，在其余位置随机布雷并计算相邻雷数。"""
        safe = {(first_row, first_col)}
        safe.update(self._neighbors(first_row, first_col))
        candidates = [
            (r, c)
            for r in range(self._board.rows)
            for c in range(self._board.cols)
            if (r, c) not in safe
        ]
        for r, c in self._rng.sample(candidates, self._board.mine_count):
            self._board.cells[r][c].is_mine = True
        for r in range(self._board.rows):
            for c in range(self._board.cols):
                self._board.cells[r][c].adjacent_mines = sum(
                    1
                    for nr, nc in self._neighbors(r, c)
                    if self._board.cells[nr][nc].is_mine
                )
        self._board.mines_placed = True

    def _win(self) -> None:
        """胜利收尾：所有雷格自动置 FLAG，flag_count 置为 mine_count。"""
        for row in self._board.cells:
            for cell in row:
                if cell.is_mine:
                    cell.mark = Mark.FLAG
        self._flag_count = self._board.mine_count
        self._status = GameStatus.WON

    def _neighbors(self, row: int, col: int) -> list[tuple[int, int]]:
        """返回周围 8 格中在棋盘范围内的坐标。"""
        result = []
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                nr, nc = row + dr, col + dc
                if self._in_bounds(nr, nc):
                    result.append((nr, nc))
        return result

    def _in_bounds(self, row: int, col: int) -> bool:
        return 0 <= row < self._board.rows and 0 <= col < self._board.cols

    def _check_bounds(self, row: int, col: int) -> None:
        if not self._in_bounds(row, col):
            raise IndexError(f"坐标 ({row}, {col}) 超出棋盘范围")