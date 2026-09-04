"""Game 逻辑层属性测试（Hypothesis）。

PBT-08：保持 Hypothesis 默认（不禁用 shrinking、不设置 derandomize），
仅用 @settings 控制 max_examples 与 deadline。
"""

import random

from hypothesis import given, settings, strategies as st

from minesweeper.game import Game, GameStatus


@st.composite
def board_configs(draw):
    """生成满足校验边界的 (rows, cols, mine_count)。"""
    rows = draw(st.integers(min_value=9, max_value=24))
    cols = draw(st.integers(min_value=9, max_value=30))
    mine_count = draw(st.integers(min_value=10, max_value=rows * cols - 9))
    return rows, cols, mine_count


@st.composite
def first_clicks(draw, rows: int, cols: int):
    """生成合法首点坐标。"""
    return (draw(st.integers(min_value=0, max_value=rows - 1)),
            draw(st.integers(min_value=0, max_value=cols - 1)))


@st.composite
def boards_with_first_click(draw):
    """生成 (rows, cols, mine_count, first_row, first_col)。"""
    rows, cols, mine_count = draw(board_configs())
    fr, fc = draw(first_clicks(rows, cols))
    return rows, cols, mine_count, fr, fc


def _brute_adjacent_mines(game: Game, row: int, col: int) -> int:
    """蛮力重算某格周围雷数（oracle）。"""
    rows, cols = game.board.rows, game.board.cols
    return sum(
        1
        for nr in range(max(0, row - 1), min(rows, row + 2))
        for nc in range(max(0, col - 1), min(cols, col + 2))
        if (nr, nc) != (row, col) and game.board.cells[nr][nc].is_mine
    )


@settings(max_examples=50, deadline=None)
@given(boards_with_first_click())
def test_post_placement_invariants(data: tuple[int, int, int, int, int]) -> None:
    rows, cols, mine_count, fr, fc = data
    game = Game(rows, cols, mine_count, rng=random.Random(2024))
    result = game.reveal(fr, fc)
    assert game.board.mines_placed is True

    # PBT-03a：布雷后雷数==mine_count，且首点 3x3 邻域（边缘裁剪）无雷
    total = sum(
        1 for row in game.board.cells for cell in row if cell.is_mine
    )
    assert total == mine_count
    for r in range(max(0, fr - 1), min(rows, fr + 2)):
        for c in range(max(0, fc - 1), min(cols, fc + 2)):
            assert game.board.cells[r][c].is_mine is False

    # PBT-03b：每格 adjacent_mines 与蛮力重算一致
    for r in range(rows):
        for c in range(cols):
            assert game.board.cells[r][c].adjacent_mines == _brute_adjacent_mines(game, r, c)

    # PBT-03c：首点 reveal 后 changed 集合中无雷格
    for r, c in result.changed:
        assert game.board.cells[r][c].is_mine is False

    # PBT-03d：未失败时 revealed_count 与 len(changed) 一致且不越界
    if game.status is not GameStatus.LOST:
        assert game.revealed_count == len(result.changed)
        assert game.revealed_count + mine_count <= rows * cols