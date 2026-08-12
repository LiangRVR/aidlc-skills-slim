# Unit Test Execution（Round 5 修订）

## Run Unit Tests

### 1. Execute All Unit Tests
```bash
npm test
```

### 2. E2E 集成冒烟（真实 ws 三客户端，需无端口占用）
```bash
npm run test:e2e
```

### 3. Review Test Results
- **Expected**: **180 tests pass, 0 failures**（Vitest，13 个测试文件）；E2E 输出 `ALL SCENARIOS PASSED`（17 个断言）
- **Test Files**: 13 个 vitest 文件 + scripts/e2e-smoke.ts
- **Coverage Breakdown**:
  - 本地核心（sudoku-game 既有，FR-40 回归门禁）：game-state / sudoku-generator / sudoku-solver / rule-validator / save-manager
  - shared-protocol v2（unit 1）：protocol.test + protocol.pbt.test（63 tests；往返/白名单拒绝/版本守卫）
  - sudoku-server v2（unit 2）：game-room.test（18 场景）+ game-room.pbt.test（SP-1~5）+ score-engine.test（SP-6 纯函数）+ room-manager.pbt.test（99 tests 含生成器）
  - sudoku-online-client v2（unit 3）：online-game-controller.test（13 场景）+ online-game-controller.pbt.test（CP-1~CP-5）（18 tests）

### 4. Fix Failing Tests
If tests fail:
1. Review vitest 输出中的失败栈与 fast-check seed（PBT 失败会打印 counterexample 与 seed）
2. Identify failing test cases
3. Fix code issues
4. Rerun `npm test` until all pass
