# Unit Test Execution

## Run Unit Tests

### 1. 执行全部测试（示例测试 + Hypothesis 属性测试）
```cmd
cd minesweeper
uv run pytest -q
```

### 2. 查看结果
- **预期**: 14 tests passed, 0 failed（当前基线）
- **测试文件**: `tests/test_game.py`（示例）、`tests/test_game_properties.py`（属性）、`tests/test_ui.py`（UI 回归，offscreen 自动启用）
- **Hypothesis 说明**: 属性测试失败时会输出可复现的 seed 与收缩后的最小反例（PBT-08）；不要加 `derandomize=True` 或禁用 shrinking

### 3. 单独运行某一类
```cmd
uv run pytest tests\test_game.py -q              :: 仅示例测试
uv run pytest tests\test_game_properties.py -q   :: 仅属性测试
```

### 4. 修复失败测试
1. 查看 pytest 输出中的失败用例与（属性测试的）最小反例
2. 定位 `minesweeper/game.py` 中对应逻辑
3. 修复后重跑至全绿
4. 属性测试发现的反例应固化为 `test_game.py` 中的示例回归测试（PBT-10 建议）
