# Unit Test Execution

## Run Unit Tests

### 1. Execute All Unit Tests
```bash
npm test
```

### 2. E2E 集成冒烟（真实 ws 双客户端，需无端口占用）
```bash
npm run test:e2e
```

### 3. Review Test Results
- **Expected**: **136 tests pass, 0 failures**（Vitest）；E2E 输出 `ALL SCENARIOS PASSED`（11 个断言）
- **Test Files**: 12 个（tests/ 下 11 个 vitest 文件 + scripts/e2e-smoke.ts）
- **Coverage Breakdown**:
  - 本地核心（sudoku-game 既有）：60 例（game-state/solver/generator/rule-validator/save-manager）
  - shared-protocol：39 example + 3 PBT（P1/P2/P3）
  - sudoku-server：12 example + 7 PBT（SP-1~SP-5）
  - sudoku-online-client：11 example + 4 PBT（CP-1~CP-4）
  - E2E：双客户端 ws 集成冒烟 11 断言

### 4. Fix Failing Tests
If tests fail:
1. PBT 失败时 fast-check 输出 seed 与最简反例（PBT-08）——用相同 seed 复现后定位
2. `npx vitest run tests/<file>` 单文件聚焦
3. 修复后全量 rerun 至全绿
