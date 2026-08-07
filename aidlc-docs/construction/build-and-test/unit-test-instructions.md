# Unit Test Execution - sudoku-game

## Run Unit Tests

### 1. Execute All Unit Tests
```bash
npx vitest run
```

### 2. Review Test Results
- **Expected**: 60 tests pass, 0 failures，5 个测试文件全绿
- **Test Files**:
  | 文件 | 用例数 | 覆盖点 |
  |---|---|---|
  | `tests/sudoku-solver.test.ts` | 9 | 求解/解计数短路/findHint |
  | `tests/sudoku-generator.test.ts` | 10 | 四档难度唯一解与预填数范围（含 expert 22-25）、解与预填一致、对称挖空 |
  | `tests/rule-validator.test.ts` | 8 | 冲突/正确性/完成判定 |
  | `tests/game-state.test.ts` | 24 | fill/erase/note/undo/redo/hint/reset/状态机/存档往返 |
  | `tests/save-manager.test.ts` | 9 | 存档往返、损坏降级、clear |
- **Test Report Location**: 终端输出（Vitest 默认 reporter）
- **预期耗时**: < 5 秒（expert 难度生成测试约占 1.2 秒）

### 3. Fix Failing Tests
If tests fail:
1. 查看终端输出中的失败用例与断言详情
2. 定位对应核心模块（`src/core/`）
3. 修复代码（核心逻辑修改后可委派子代理，UI 层由主代理处理）
4. 重新运行 `npx vitest run` 直至全绿
