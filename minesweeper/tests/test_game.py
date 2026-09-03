"""Unit tests for the pure-Python Minesweeper core logic in minesweeper.game."""

import random

import pytest

from minesweeper.game import Board, CellState, GameStatus


# --------------------------------------------------------------------------- #
# Construction & validation
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("rows,cols,mines", [(5, 5, 0), (5, 5, -3), (5, 5, 25), (5, 5, 26)])
def test_invalid_mine_count_raises_value_error(rows, cols, mines):
    with pytest.raises(ValueError):
        Board(rows, cols, mines)


def test_initial_board_state():
    board = Board(9, 9, 10, random.Random(1))
    assert board.rows == 9
    assert board.cols == 9
    assert board.mine_count == 10
    assert board.status is GameStatus.READY
    assert board.exploded is None
    assert board.revealed_count == 0
    assert board.flags_placed == 0
    assert board.mines_left == 10
    # no mines placed before the first reveal (lazy placement)
    for r in range(board.rows):
        for c in range(board.cols):
            cell = board.cell(r, c)
            assert cell.state is CellState.HIDDEN
            assert not cell.is_mine
            assert cell.neighbor_mines == 0


# --------------------------------------------------------------------------- #
# Lazy placement, first-click safety, neighbour mine counts
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("seed", range(20))
def test_first_click_and_neighbourhood_never_mines(seed):
    board = Board(16, 30, 99, random.Random(seed))
    board.reveal(0, 0)
    assert board.status is GameStatus.PLAYING
    assert not board.cell(0, 0).is_mine
    for nr, nc in board.neighbors(0, 0):
        assert not board.cell(nr, nc).is_mine
    total = sum(
        1 for r in range(board.rows) for c in range(board.cols) if board.cell(r, c).is_mine
    )
    assert total == board.mine_count == 99


def test_degraded_safe_zone_on_tiny_board():
    # 4x4 with 8 mines: rows*cols - 9 = 7 < 8, so only the clicked cell is safe.
    board = None
    for seed in range(50):
        candidate = Board(4, 4, 8, random.Random(seed))
        candidate.reveal(0, 0)
        if any(candidate.cell(r, c).is_mine for r, c in candidate.neighbors(0, 0)):
            board = candidate
            break
    assert board is not None
    assert board.status is GameStatus.PLAYING
    assert not board.cell(0, 0).is_mine
    assert board.revealed_count == 1  # mine-adjacent, so no flood fill
    total = sum(
        1 for r in range(4) for c in range(4) if board.cell(r, c).is_mine
    )
    assert total == 8


def test_neighbor_mines_computed_correctly():
    board = Board(6, 6, 6, random.Random(7))
    board.reveal(0, 0)
    for r in range(board.rows):
        for c in range(board.cols):
            cell = board.cell(r, c)
            if cell.is_mine:
                continue  # neighbour counts are only meaningful for non-mines
            expected = sum(
                1 for nr, nc in board.neighbors(r, c) if board.cell(nr, nc).is_mine
            )
            assert cell.neighbor_mines == expected


def test_neighbors_returns_only_in_bounds_cells():
    board = Board(3, 3, 2, random.Random(1))
    assert sorted(board.neighbors(1, 1)) == [
        (0, 0), (0, 1), (0, 2), (1, 0), (1, 2), (2, 0), (2, 1), (2, 2),
    ]
    assert sorted(board.neighbors(0, 0)) == [(0, 1), (1, 0), (1, 1)]
    assert sorted(board.neighbors(2, 2)) == [(1, 1), (1, 2), (2, 1)]


# --------------------------------------------------------------------------- #
# Flagging
# --------------------------------------------------------------------------- #


def test_flag_cycle_and_mines_left():
    board = Board(5, 5, 3, random.Random(1))
    cell = board.cell(0, 0)

    assert cell.state is CellState.HIDDEN
    board.toggle_flag(0, 0)
    assert cell.state is CellState.FLAGGED
    assert board.flags_placed == 1
    assert board.mines_left == 2

    board.toggle_flag(0, 0)
    assert cell.state is CellState.QUESTION
    assert board.flags_placed == 0
    assert board.mines_left == 3

    board.toggle_flag(0, 0)
    assert cell.state is CellState.HIDDEN
    assert board.status is GameStatus.READY  # flagging in READY does not start the game


def test_flag_then_reveal_in_ready_is_noop():
    board = Board(5, 5, 3, random.Random(1))
    board.toggle_flag(0, 0)
    board.reveal(0, 0)
    assert board.status is GameStatus.READY
    assert board.cell(0, 0).state is CellState.FLAGGED
    assert all(not board.cell(r, c).is_mine for r in range(5) for c in range(5))


def test_flagging_and_revealing_revealed_or_flagged_cells_is_noop():
    board = Board(5, 5, 3, random.Random(1))
    board.reveal(0, 0)
    assert board.status is GameStatus.PLAYING
    revealed_before = board.revealed_count

    board.reveal(0, 0)  # already revealed
    assert board.revealed_count == revealed_before
    board.toggle_flag(0, 0)  # revealing a revealed cell does nothing
    assert board.cell(0, 0).state is CellState.REVEALED

    hidden = next(
        (r, c)
        for r in range(5)
        for c in range(5)
        if board.cell(r, c).state is CellState.HIDDEN
    )
    board.toggle_flag(*hidden)
    assert board.cell(*hidden).state is CellState.FLAGGED
    board.reveal(*hidden)  # reveal on a flagged cell is a no-op
    assert board.cell(*hidden).state is CellState.FLAGGED
    assert board.status is GameStatus.PLAYING


# --------------------------------------------------------------------------- #
# Flood fill
# --------------------------------------------------------------------------- #


def test_flood_fill_expands_large_empty_area():
    board = None
    for seed in range(100):
        candidate = Board(16, 16, 40, random.Random(seed))
        candidate.reveal(0, 0)
        if candidate.revealed_count >= 30:
            board = candidate
            break
    assert board is not None, "no seed produced a large opening"
    assert board.revealed_count >= 30

    # No revealed mine...
    for r in range(board.rows):
        for c in range(board.cols):
            cell = board.cell(r, c)
            if cell.state is CellState.REVEALED:
                assert not cell.is_mine
            # ...and every non-mine neighbour of a revealed zero cell is revealed.
            if cell.state is CellState.REVEALED and cell.neighbor_mines == 0:
                for nr, nc in board.neighbors(r, c):
                    n = board.cell(nr, nc)
                    assert n.state is CellState.REVEALED or n.is_mine

    # The expanded region contains numbered edge cells, not only zeros.
    assert any(
        board.cell(r, c).neighbor_mines > 0
        for r in range(board.rows)
        for c in range(board.cols)
        if board.cell(r, c).state is CellState.REVEALED
    )


# --------------------------------------------------------------------------- #
# Losing & winning
# --------------------------------------------------------------------------- #


def test_revealing_a_mine_loses_the_game():
    board = Board(5, 5, 3, random.Random(2))
    board.reveal(0, 0)
    mines = [(r, c) for r in range(5) for c in range(5) if board.cell(r, c).is_mine]
    assert len(mines) == 3

    keep_flagged = mines[0]
    board.toggle_flag(*keep_flagged)
    boom = mines[1]
    board.reveal(*boom)

    assert board.status is GameStatus.LOST
    assert board.exploded == boom
    assert board.cell(*keep_flagged).state is CellState.FLAGGED
    for r in range(5):
        for c in range(5):
            cell = board.cell(r, c)
            if cell.is_mine:
                if (r, c) == keep_flagged:
                    assert cell.state is CellState.FLAGGED
                else:
                    assert cell.state is CellState.REVEALED
            else:
                assert cell.state in (CellState.HIDDEN, CellState.REVEALED)


def test_revealing_every_non_mine_wins_and_auto_flags_mines():
    board = Board(5, 5, 3, random.Random(1))
    board.reveal(0, 0)
    assert board.status is GameStatus.PLAYING

    for r in range(board.rows):
        for c in range(board.cols):
            if not board.cell(r, c).is_mine:
                board.reveal(r, c)

    assert board.status is GameStatus.WON
    assert board.revealed_count == 5 * 5 - 3
    assert board.flags_placed == 3
    assert board.mines_left == 0
    for r in range(board.rows):
        for c in range(board.cols):
            if board.cell(r, c).is_mine:
                assert board.cell(r, c).state is CellState.FLAGGED
            else:
                assert board.cell(r, c).state is CellState.REVEALED


# --------------------------------------------------------------------------- #
# Chord
# --------------------------------------------------------------------------- #


def _find_chord_scenario(seed, rows=9, cols=9, mines=10):
    """Build a PLAYING board with a revealed anchor cell that has hidden mine
    neighbours and hidden non-mine neighbours."""
    for attempt in range(300):
        board = Board(rows, cols, mines, random.Random(seed + attempt))
        board.reveal(0, 0)
        if board.status is not GameStatus.PLAYING:
            continue
        for r in range(rows):
            for c in range(cols):
                cell = board.cell(r, c)
                if cell.state is not CellState.REVEALED or cell.is_mine:
                    continue
                if cell.neighbor_mines == 0:
                    continue
                nbrs = board.neighbors(r, c)
                mine_nbrs = [n for n in nbrs if board.cell(*n).is_mine]
                hidden_nonmine = [
                    n
                    for n in nbrs
                    if board.cell(*n).state is CellState.HIDDEN and not board.cell(*n).is_mine
                ]
                if len(mine_nbrs) == cell.neighbor_mines and mine_nbrs and hidden_nonmine:
                    return board, (r, c), mine_nbrs, hidden_nonmine
    raise AssertionError("could not construct a chord scenario")


def test_chord_reveals_neighbours_when_flags_match():
    board, anchor, mine_nbrs, hidden_nonmine = _find_chord_scenario(1)
    r, c = anchor
    assert board.cell(r, c).neighbor_mines == len(mine_nbrs)
    for m in mine_nbrs:
        board.toggle_flag(*m)
    assert board.flags_placed == len(mine_nbrs)

    before = board.revealed_count
    board.chord(r, c)
    assert board.status is GameStatus.PLAYING
    assert board.revealed_count >= before + len(hidden_nonmine)
    for n in hidden_nonmine:
        assert board.cell(*n).state is CellState.REVEALED
    for m in mine_nbrs:  # mines stay flagged
        assert board.cell(*m).state is CellState.FLAGGED


def test_chord_is_noop_when_flag_count_mismatches():
    board, anchor, mine_nbrs, _ = _find_chord_scenario(5)
    r, c = anchor
    for m in mine_nbrs[:-1]:  # flag one fewer than the cell's number
        board.toggle_flag(*m)
    before = board.revealed_count
    board.chord(r, c)
    assert board.status is GameStatus.PLAYING
    assert board.revealed_count == before


def test_chord_with_wrong_flags_triggers_mine():
    board, anchor, mine_nbrs, hidden_nonmine = _find_chord_scenario(9)
    r, c = anchor
    need = board.cell(r, c).neighbor_mines
    assert len(hidden_nonmine) >= need
    for n in hidden_nonmine[:need]:  # flag wrong cells, leaving mines unflagged
        board.toggle_flag(*n)
    board.chord(r, c)
    assert board.status is GameStatus.LOST
    assert board.exploded is not None
    assert board.exploded in board.neighbors(r, c)
    assert board.cell(*board.exploded).is_mine


def test_chord_is_noop_when_target_not_applicable():
    board = Board(5, 5, 3, random.Random(1))
    board.reveal(0, 0)
    before = board.revealed_count

    # chord on a hidden cell
    hidden = next(
        (r, c)
        for r in range(5)
        for c in range(5)
        if board.cell(r, c).state is CellState.HIDDEN and not board.cell(r, c).is_mine
    )
    board.chord(*hidden)
    assert board.revealed_count == before
    assert board.status is GameStatus.PLAYING

    # chord in READY is a no-op
    fresh = Board(5, 5, 3, random.Random(1))
    fresh.chord(0, 0)
    assert fresh.status is GameStatus.READY


# --------------------------------------------------------------------------- #
# Terminal-state no-ops & out-of-bounds behaviour
# --------------------------------------------------------------------------- #


def test_actions_are_noop_after_loss():
    board = Board(5, 5, 3, random.Random(3))
    board.reveal(0, 0)
    boom = next(
        (r, c) for r in range(5) for c in range(5) if board.cell(r, c).is_mine
    )
    board.reveal(*boom)
    assert board.status is GameStatus.LOST

    hidden_nonmine = next(
        (r, c)
        for r in range(5)
        for c in range(5)
        if not board.cell(r, c).is_mine and board.cell(r, c).state is CellState.HIDDEN
    )
    states_before = [board.cell(r, c).state for r in range(5) for c in range(5)]
    revealed_before = board.revealed_count

    board.reveal(*hidden_nonmine)
    board.toggle_flag(*hidden_nonmine)
    board.chord(*boom)

    assert board.status is GameStatus.LOST
    assert board.exploded == boom
    assert board.revealed_count == revealed_before
    assert [board.cell(r, c).state for r in range(5) for c in range(5)] == states_before


def test_actions_are_noop_after_win():
    board = Board(5, 5, 3, random.Random(1))
    board.reveal(0, 0)
    for r in range(board.rows):
        for c in range(board.cols):
            if not board.cell(r, c).is_mine:
                board.reveal(r, c)
    assert board.status is GameStatus.WON

    states_before = [board.cell(r, c).state for r in range(5) for c in range(5)]
    mine = next((r, c) for r in range(5) for c in range(5) if board.cell(r, c).is_mine)
    board.reveal(*mine)
    board.toggle_flag(*mine)
    board.chord(0, 0)

    assert board.status is GameStatus.WON
    assert [board.cell(r, c).state for r in range(5) for c in range(5)] == states_before
    assert board.flags_placed == 3


def test_out_of_bounds_raises_index_error():
    board = Board(5, 5, 3, random.Random(1))
    methods = [board.cell, board.reveal, board.toggle_flag, board.chord]
    for method in methods:
        for row, col in [(-1, 0), (0, -1), (5, 0), (0, 5), (5, 5), (-3, 2)]:
            with pytest.raises(IndexError):
                method(row, col)
    # out-of-bounds access never mutated the game state
    assert board.status is GameStatus.READY
    assert board.revealed_count == 0
    assert board.flags_placed == 0