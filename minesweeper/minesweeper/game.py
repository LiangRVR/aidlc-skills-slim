"""Pure-Python core logic for a classic Minesweeper game.

This module is UI-agnostic: it must not import any PyQt6/UI module. Any
frontend (PyQt6, Tkinter, web, CLI, ...) can drive it through the ``Board``
class. Mines are placed lazily on the first reveal so the first click is
always safe (its 3x3 neighbourhood is kept mine-free when the board allows).
"""

from __future__ import annotations

import random
from enum import Enum


class CellState(Enum):
    """State of a single board cell."""

    HIDDEN = "HIDDEN"
    REVEALED = "REVEALED"
    FLAGGED = "FLAGGED"
    QUESTION = "QUESTION"


class GameStatus(Enum):
    """Overall game status."""

    READY = "READY"  # no first click yet; mines not placed yet
    PLAYING = "PLAYING"
    WON = "WON"
    LOST = "LOST"


class Cell:
    """A single cell of the board.

    Attributes:
        is_mine: True once mines have been placed (meaningless before then).
        neighbor_mines: Number of mines among the 8 neighbouring cells
            (computed once mines have been placed).
        state: Current :class:`CellState`.
    """

    __slots__ = ("is_mine", "neighbor_mines", "state")

    def __init__(self) -> None:
        self.is_mine = False
        self.neighbor_mines = 0
        self.state = CellState.HIDDEN


class Board:
    """Minesweeper board holding all game logic.

    Mines are placed lazily on the first :meth:`reveal` call. The first-clicked
    cell and, when ``rows * cols - 9 >= mine_count``, its 8 neighbours are kept
    mine-free.

    Out-of-bounds coordinates passed to :meth:`cell`, :meth:`reveal`,
    :meth:`toggle_flag` or :meth:`chord` raise :class:`IndexError`.
    :meth:`neighbors` always returns only in-bounds cells.
    """

    def __init__(
        self,
        rows: int,
        cols: int,
        mine_count: int,
        rng: random.Random | None = None,
    ) -> None:
        if mine_count <= 0 or mine_count >= rows * cols:
            raise ValueError(
                "mine_count must satisfy 0 < mine_count < rows*cols "
                f"({mine_count} given for a {rows}x{cols} board)"
            )
        self.rows = rows
        self.cols = cols
        self.mine_count = mine_count
        self.status = GameStatus.READY
        self.exploded: tuple[int, int] | None = None
        self._rng = rng if rng is not None else random.Random()
        self._grid: list[list[Cell]] = [[Cell() for _ in range(cols)] for _ in range(rows)]
        self._mines_placed = False

    # ------------------------------------------------------------------ #
    # Properties
    # ------------------------------------------------------------------ #

    @property
    def flags_placed(self) -> int:
        """Number of cells currently flagged."""
        return sum(1 for row in self._grid for cell in row if cell.state is CellState.FLAGGED)

    @property
    def mines_left(self) -> int:
        """mine_count minus flags_placed (may go negative if over-flagged)."""
        return self.mine_count - self.flags_placed

    @property
    def revealed_count(self) -> int:
        """Number of cells currently revealed."""
        return sum(1 for row in self._grid for cell in row if cell.state is CellState.REVEALED)

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def cell(self, row: int, col: int) -> Cell:
        """Return the :class:`Cell` at (row, col).

        Raises IndexError if the coordinates are out of bounds.
        """
        self._check_bounds(row, col)
        return self._grid[row][col]

    def neighbors(self, row: int, col: int) -> list[tuple[int, int]]:
        """Return the in-bounds 8-neighbourhood of (row, col)."""
        result: list[tuple[int, int]] = []
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                nr, nc = row + dr, col + dc
                if 0 <= nr < self.rows and 0 <= nc < self.cols:
                    result.append((nr, nc))
        return result

    def reveal(self, row: int, col: int) -> None:
        """Reveal the cell at (row, col).

        The first reveal (when status is READY) places the mines and starts the
        game. Revealing a mine loses the game; revealing an empty cell may
        flood-fill. Flagged or already revealed cells are a no-op. No-op when
        the game is already WON or LOST. Raises IndexError out of bounds.
        """
        self._check_bounds(row, col)
        if self.status not in (GameStatus.READY, GameStatus.PLAYING):
            return
        cell = self._grid[row][col]
        if cell.state in (CellState.REVEALED, CellState.FLAGGED):
            return
        if self.status is GameStatus.READY:
            self._place_mines(row, col)
            self.status = GameStatus.PLAYING
        if cell.is_mine:
            self._explode(row, col)
            return
        self._reveal_cell(row, col)
        self._check_win()

    def toggle_flag(self, row: int, col: int) -> None:
        """Cycle a hidden cell through HIDDEN -> FLAGGED -> QUESTION -> HIDDEN.

        Only valid while READY or PLAYING (flagging in READY does not change
        the status, i.e. does not start the game). Revealed cells are a no-op.
        No-op when the game is already WON or LOST. Raises IndexError out of
        bounds.
        """
        self._check_bounds(row, col)
        if self.status not in (GameStatus.READY, GameStatus.PLAYING):
            return
        cell = self._grid[row][col]
        if cell.state is CellState.REVEALED:
            return
        if cell.state is CellState.HIDDEN:
            cell.state = CellState.FLAGGED
        elif cell.state is CellState.FLAGGED:
            cell.state = CellState.QUESTION
        else:  # QUESTION
            cell.state = CellState.HIDDEN

    def chord(self, row: int, col: int) -> None:
        """Fast reveal: if the revealed cell's flag count matches its number,
        reveal all hidden neighbours (each goes through normal reveal logic).

        Only valid while PLAYING. The target cell must be REVEALED with
        neighbour_mines > 0 and exactly ``neighbour_mines`` flagged neighbours;
        otherwise this is a no-op. A wrong chord may trigger a mine and lose
        the game. Raises IndexError out of bounds.
        """
        self._check_bounds(row, col)
        if self.status is not GameStatus.PLAYING:
            return
        cell = self._grid[row][col]
        if cell.state is not CellState.REVEALED or cell.neighbor_mines == 0:
            return
        flagged = sum(
            1 for nr, nc in self.neighbors(row, col)
            if self._grid[nr][nc].state is CellState.FLAGGED
        )
        if flagged != cell.neighbor_mines:
            return
        for nr, nc in self.neighbors(row, col):
            self.reveal(nr, nc)

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    def _check_bounds(self, row: int, col: int) -> None:
        if not (0 <= row < self.rows and 0 <= col < self.cols):
            raise IndexError(
                f"cell ({row}, {col}) is out of bounds for a {self.rows}x{self.cols} board"
            )

    def _place_mines(self, safe_row: int, safe_col: int) -> None:
        """Place mines keeping the first-click cell (and ideally its 3x3
        neighbourhood) mine-free, then compute neighbour mine counts."""
        if self.rows * self.cols - 9 < self.mine_count:
            # Board too small for a full 3x3 safe zone: only the clicked cell
            # is guaranteed safe.
            safe = {(safe_row, safe_col)}
        else:
            safe = {(safe_row, safe_col)}
            safe.update(self.neighbors(safe_row, safe_col))
        candidates = [
            (r, c)
            for r in range(self.rows)
            for c in range(self.cols)
            if (r, c) not in safe
        ]
        for r, c in self._rng.sample(candidates, self.mine_count):
            self._grid[r][c].is_mine = True
        for r in range(self.rows):
            for c in range(self.cols):
                cell = self._grid[r][c]
                if cell.is_mine:
                    continue
                cell.neighbor_mines = sum(
                    1 for nr, nc in self.neighbors(r, c) if self._grid[nr][nc].is_mine
                )
        self._mines_placed = True

    def _explode(self, row: int, col: int) -> None:
        """Lose the game: mark all unflagged mines as revealed."""
        self.status = GameStatus.LOST
        self.exploded = (row, col)
        for r in range(self.rows):
            for c in range(self.cols):
                cell = self._grid[r][c]
                if cell.is_mine and cell.state is not CellState.FLAGGED:
                    cell.state = CellState.REVEALED

    def _reveal_cell(self, row: int, col: int) -> None:
        """Reveal a non-mine cell with iterative flood fill (no recursion,
        safe on large boards)."""
        stack = [(row, col)]
        while stack:
            r, c = stack.pop()
            cell = self._grid[r][c]
            if cell.state is not CellState.HIDDEN or cell.is_mine:
                continue
            cell.state = CellState.REVEALED
            if cell.neighbor_mines == 0:
                stack.extend(self.neighbors(r, c))

    def _check_win(self) -> None:
        """Win when every non-mine cell is revealed; auto-flag all remaining
        mines."""
        if self.revealed_count == self.rows * self.cols - self.mine_count:
            self.status = GameStatus.WON
            for r in range(self.rows):
                for c in range(self.cols):
                    cell = self._grid[r][c]
                    if cell.is_mine and cell.state is not CellState.FLAGGED:
                        cell.state = CellState.FLAGGED