"""Game 逻辑层单元测试。"""

import random

import pytest

from minesweeper.game import (
    BEGINNER,
    EXPERT,
    INTERMEDIATE,
    CellState,
    Game,
    GameStatus,
    Mark,
)


def neighbors(game: Game, r: int, c: int) -> list[tuple[int, int]]:
    """重算周围 8 格坐标（与实现无关的独立辅助函数）。"""
    rows, cols = game.board.rows, game.board.cols
    return [
        (nr, nc)
        for dr in (-1, 0, 1)
        for dc in (-1, 0, 1)
        if (dr, dc) != (0, 0)
        for nr, nc in [(r + dr, c + dc)]
        if 0 <= nr < rows and 0 <= nc < cols
    ]


def make_game(rows: int = 9, cols: int = 9, mine_count: int = 10, seed: int = 42) -> Game:
    return Game(rows, cols, mine_count, rng=random.Random(seed))


def test_initial_state() -> None:
    game = make_game()
    assert game.status is GameStatus.READY
    assert game.remaining_mines == 10
    assert game.revealed_count == 0
    assert game.flag_count == 0
    assert game.board.mines_placed is False
    for row in game.board.cells:
        for cell in row:
            assert cell.state is CellState.HIDDEN
            assert cell.mark is Mark.NONE
            assert cell.is_mine is False
            assert cell.adjacent_mines == 0


def test_difficulty_constants() -> None:
    assert BEGINNER == (9, 9, 10)
    assert INTERMEDIATE == (16, 16, 40)
    assert EXPERT == (16, 30, 99)


def test_validation_errors() -> None:
    with pytest.raises(ValueError):
        Game(8, 9, 10)  # rows 过小
    with pytest.raises(ValueError):
        Game(25, 9, 10)  # rows 过大
    with pytest.raises(ValueError):
        Game(9, 8, 10)  # cols 过小
    with pytest.raises(ValueError):
        Game(9, 31, 10)  # cols 过大
    with pytest.raises(ValueError):
        Game(9, 9, 9)  # 雷数过小
    with pytest.raises(ValueError):
        Game(9, 9, 73)  # 雷数过大（81-9=72）
    Game(9, 9, 72)  # 边界值合法


def test_out_of_bounds_raises_index_error() -> None:
    game = make_game()
    with pytest.raises(IndexError):
        game.reveal(-1, 0)
    with pytest.raises(IndexError):
        game.reveal(0, 9)
    with pytest.raises(IndexError):
        game.toggle_mark(9, 0)
    with pytest.raises(IndexError):
        game.chord(0, -1)


def test_first_reveal_safe_and_flood_fill() -> None:
    game = make_game()
    result = game.reveal(0, 0)
    assert game.status is GameStatus.PLAYING
    assert game.board.mines_placed is True
    assert (0, 0) in result.changed
    # 首点 3x3 邻域（角落处裁剪为 2x2）无雷
    for r in range(2):
        for c in range(2):
            assert game.board.cells[r][c].is_mine is False
    # 级联翻开集合中无雷格
    for r, c in result.changed:
        assert game.board.cells[r][c].is_mine is False
    # 级联闭合：空白格的所有非雷邻居都已翻开
    for r, c in result.changed:
        if game.board.cells[r][c].adjacent_mines == 0:
            for nr, nc in neighbors(game, r, c):
                if not game.board.cells[nr][nc].is_mine:
                    assert game.board.cells[nr][nc].state is CellState.REVEALED
    # revealed_count 与 changed 一致
    assert game.revealed_count == len(result.changed)
    # 重复翻开同一格不改变状态
    assert game.reveal(0, 0).changed == set()
    assert game.revealed_count == len(result.changed)


def test_reveal_number_cell_only_self() -> None:
    game = make_game()
    game.reveal(0, 0)
    # 找一个与已翻开区域相邻的隐藏数字格
    target = None
    revealed = [
        (r, c)
        for r in range(9)
        for c in range(9)
        if game.board.cells[r][c].state is CellState.REVEALED
    ]
    for r, c in revealed:
        for nr, nc in neighbors(game, r, c):
            cell = game.board.cells[nr][nc]
            if cell.state is CellState.HIDDEN and cell.adjacent_mines > 0:
                target = (nr, nc)
                break
        if target:
            break
    assert target is not None, "未找到可测的数字格"
    before = game.revealed_count
    result = game.reveal(*target)
    assert result.changed == {target}
    assert game.revealed_count == before + 1
    assert game.board.cells[target[0]][target[1]].state is CellState.REVEALED


def test_mark_cycle_and_remaining_mines() -> None:
    game = make_game()
    assert game.toggle_mark(0, 0) is Mark.FLAG
    assert game.remaining_mines == 9
    assert game.flag_count == 1
    assert game.toggle_mark(0, 0) is Mark.QUESTION
    assert game.remaining_mines == 10
    assert game.flag_count == 0
    assert game.toggle_mark(0, 0) is Mark.NONE
    assert game.remaining_mines == 10
    # 插旗数可超过雷数，剩余为负
    for c in range(9):
        game.toggle_mark(1, c)
    game.toggle_mark(2, 0)
    game.toggle_mark(2, 1)
    assert game.remaining_mines == -1
    # 已翻开的格不可再标记
    game.reveal(0, 0)
    assert game.toggle_mark(0, 0) is Mark.NONE
    assert game.board.cells[0][0].mark is Mark.NONE


def test_chord_insufficient_flags_highlights() -> None:
    game = make_game()
    game.reveal(0, 0)
    target = _find_number_cell(game)
    assert target is not None
    r, c = target
    hidden = {
        (nr, nc)
        for nr, nc in neighbors(game, r, c)
        if game.board.cells[nr][nc].state is CellState.HIDDEN
    }
    assert hidden, "数字格周围应存在隐藏格"
    before = game.revealed_count
    result = game.chord(r, c)
    assert result.changed == set()
    assert result.highlight == hidden
    assert game.status is GameStatus.PLAYING
    assert game.revealed_count == before


def test_chord_success_reveals_surroundings() -> None:
    game = make_game()
    game.reveal(0, 0)
    target = _find_number_cell(game)
    assert target is not None
    r, c = target
    # 给周围所有雷格插旗，使旗数 == 数字
    for nr, nc in neighbors(game, r, c):
        if game.board.cells[nr][nc].is_mine:
            assert game.toggle_mark(nr, nc) is Mark.FLAG
    before = game.revealed_count
    result = game.chord(r, c)
    assert result.changed, "chord 应翻开周围未标记格"
    assert result.highlight == set()
    assert game.status is not GameStatus.LOST
    for rr, cc in result.changed:
        assert game.board.cells[rr][cc].is_mine is False
    assert game.revealed_count == before + len(result.changed)


def _find_number_cell(game: Game) -> tuple[int, int] | None:
    """找一个已翻开且周围存在隐藏格的数字格。"""
    for r in range(game.board.rows):
        for c in range(game.board.cols):
            cell = game.board.cells[r][c]
            if cell.state is CellState.REVEALED and cell.adjacent_mines > 0:
                if any(
                    game.board.cells[nr][nc].state is CellState.HIDDEN
                    for nr, nc in neighbors(game, r, c)
                ):
                    return (r, c)
    return None


def test_reveal_mine_lost_and_locked() -> None:
    game = make_game()
    game.reveal(0, 0)
    mine = next(
        (r, c)
        for r in range(9)
        for c in range(9)
        if game.board.cells[r][c].is_mine
    )
    result = game.reveal(*mine)
    assert game.status is GameStatus.LOST
    assert result.changed == {mine}
    assert game.board.cells[mine[0]][mine[1]].state is CellState.REVEALED
    before = game.revealed_count
    # 状态锁定：reveal / toggle_mark / chord 均不再改变状态
    assert game.reveal(*mine).changed == set()
    assert game.toggle_mark(0, 0) is Mark.NONE
    cr = game.chord(*mine)
    assert cr.changed == set() and cr.highlight == set()
    assert game.status is GameStatus.LOST
    assert game.revealed_count == before


def test_win_flags_all_mines() -> None:
    game = make_game()
    game.reveal(0, 0)
    # 翻开所有非雷格
    for r in range(9):
        for c in range(9):
            cell = game.board.cells[r][c]
            if not cell.is_mine and cell.state is CellState.HIDDEN:
                game.reveal(r, c)
    assert game.status is GameStatus.WON
    assert game.flag_count == 10
    assert game.remaining_mines == 0
    for r in range(9):
        for c in range(9):
            cell = game.board.cells[r][c]
            if cell.is_mine:
                assert cell.state is CellState.HIDDEN
                assert cell.mark is Mark.FLAG
            else:
                assert cell.state is CellState.REVEALED