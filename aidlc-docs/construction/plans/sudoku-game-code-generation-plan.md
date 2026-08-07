# Code Generation Plan - unit: sudoku-game

**本计划是 Code Generation 的唯一事实来源，Part 2 将严格按步骤顺序执行。**

## 单元上下文

- **Stories**: US-01~US-12（全部，单单元承载）
- **依赖**: 无其他单元
- **接口契约**: 见 `aidlc-docs/inception/application-design/component-methods.md`
- **技术栈**: Phaser 3 + TypeScript + Vite + npm；测试框架 Vitest（与 Vite 生态一致）
- **代码位置**: 工作区根 `D:\Documents\PythonProject\aidlc-skills`（greenfield 单单元模式：`src/`、`tests/`、配置文件在根）；文档在 `aidlc-docs/construction/sudoku-game/code/`
- **自动化友好说明**: Phaser 将 UI 渲染进 canvas，canvas 内部元素无法挂 DOM `data-testid`；将在 `index.html` 的游戏容器 div 等 DOM 元素上添加稳定 `data-testid`

## 执行步骤

- [x] **Step 1: Project Structure Setup**
  创建 `package.json`（phaser、vite、typescript、vitest 依赖与 dev/build/test 脚本）、`tsconfig.json`、`vite.config.ts`、`index.html`（含 `data-testid="game-container"` 容器）、`.gitignore` 更新
  *Stories: 全部的基础*

- [x] **Step 2: 核心类型与 EventBus**
  `src/core/types.ts`（Difficulty/CellValue/Puzzle/GameSave/Move/事件名常量）、`src/core/event-bus.ts`
  *Stories: 全部的基础*

- [x] **Step 3: SudokuSolver**
  `src/core/sudoku-solver.ts`（solve / countSolutions 带 limit 短路 / findHint，MRV 启发）
  *Stories: US-01、US-08*

- [x] **Step 4: SudokuGenerator**
  `src/core/sudoku-generator.ts`（完整解生成 → 按难度目标预填数对称挖空 → 唯一性校验，<1s）
  *Stories: US-01、US-02*

- [x] **Step 5: RuleValidator**
  `src/core/rule-validator.ts`（conflictsAt / isCorrect / isComplete）
  *Stories: US-04、US-05*

- [x] **Step 6: GameState**
  `src/core/game-state.ts`（fill/erase/toggleNote/undo/redo/applyHint/reset/tick；Move 快照；错误限制；状态机；笔记自动清除；reset 触发存档清除回调）
  *Stories: US-03、US-05、US-06、US-09、US-10、US-12*

- [x] **Step 7: GameController**
  `src/core/game-controller.ts`（newGame/continueGame/inputDigit/计时 tick/自动存档编排/终局清除）
  *Stories: US-08、US-11、US-12*

- [x] **Step 8: SaveManager**
  `src/persistence/save-manager.ts`（save/load/hasSave/clear；版本与结构校验；损坏降级返回 null）
  *Stories: US-11*

- [x] **Step 9: 核心业务逻辑单元测试（Vitest）**
  `tests/sudoku-solver.test.ts`、`tests/sudoku-generator.test.ts`（唯一解、预填数范围）、`tests/rule-validator.test.ts`、`tests/game-state.test.ts`（fill 正误/笔记清除/撤销重做/错误限制/胜负）、`tests/save-manager.test.ts`（损坏降级）
  *Stories: US-01~US-11 核心逻辑覆盖*

- [x] **Step 10: Business Logic Summary**
  `aidlc-docs/construction/sudoku-game/code/business-logic-summary.md`

- [x] **Step 11: UI 控件**
  `src/ui/board-view.ts`（宫线/高亮/笔记渲染）、`src/ui/number-pad.ts`（一行横向按钮 + 笔记模式视觉区分）、`src/ui/control-bar.ts`（按钮 + 计时 + 错误计数 + 可用态）、`src/ui/result-overlay.ts`（胜利/失败）
  *Stories: US-03、US-04、US-05、US-07、US-09、US-12 的表现层*

- [x] **Step 12: Phaser 场景与入口**
  `src/scenes/menu-scene.ts`（续玩/新游戏 + 难度选择）、`src/scenes/game-scene.ts`（组装 UI、事件订阅、键盘映射 1-9/Delete/N/Z/Y/H、visibilitychange 暂停、ResultOverlay）、`src/main.ts`（Phaser.Game 启动配置）
  *Stories: US-02、US-07、US-11、US-12 的表现层*

- [x] **Step 13: Frontend Summary**
  `aidlc-docs/construction/sudoku-game/code/frontend-summary.md`

- [x] **Step 14: 文档与部署制品**
  更新 `README.md`（游戏说明、npm install / dev / build / test 命令）；Vite 构建配置即部署制品（`npm run build` 产出 `dist/` 静态文件）
  *Stories: 全部*

## 第二轮：FR-13 连击特效（用户批准 2026-08-06）

- [x] **Step 15: GameController.inputDigit 返回判定结果**
  `inputDigit` 返回 `{ index, result: 'correct'|'wrong'|'ignored'|'note' } | null`，作为特效触发数据源
  *Stories: US-13*

- [x] **Step 16: VfxManager**
  `src/ui/vfx-manager.ts`：连击 streak 计数与 4 档分层（0-2/3-5/6-8/9+）；playCorrect（格子粒子爆发 + 完成行/列/宫扫光）、playWrong（破碎 + camera shake + 清零）、持续氛围特效（边框脉冲/上升粒子/全屏边缘光）、reset/destroy
  *Stories: US-13*

- [x] **Step 17: GameScene 接线**
  onDigitInput 统一分发（数字键盘/键盘）；unitsOf 检测行/列/宫完成；reset/new 游戏与 cleanup 时 vfx 重置销毁
  *Stories: US-13*

- [x] **Step 18: 验证与文档**
  `npx tsc --noEmit` + `npx vitest run` + `npm run build` 全绿；更新 frontend-summary.md 与 business-rules.md（BR-27 连击特效）；audit.md 记录

- [x] **Step 19: 变更请求 - 屏幕边缘 vignette 色条改为粒子特效**
  用户反馈最外层边框特效难看；tier≥3 的全屏边缘色条替换为沿屏幕边缘漂浮的粒子（EdgeZone 发射器）
  *Stories: US-13*

- [x] **Step 20: 第三轮 FR-14 专家难度（用户批准 2026-08-06）**
  `Difficulty` 增加 `'expert'`；生成器预填数 22-25；SaveManager 难度校验；菜单"专家"按钮；游戏内难度标签；BR-02 更新；生成器测试补 expert（唯一解 + 预填数范围，60/60 通过）；README 四档难度
  *Stories: US-14*

- [x] **Step 21: 变更请求 - 菜单按钮布局**
  用户反馈按钮整体偏下、随后遮挡标题；MenuScene 按钮组改为按总数垂直居中，起点钳制在标题下方（`max(居中值, height/4 + 90)`）
  *Stories: US-02、US-14 表现层*

- [x] **Step 22: 变更请求 - 页面布局与背景**
  用户反馈画布左上角对齐、希望背景统一；`index.html` body 改 flex 水平居中画布，页面背景与画布背景统一为 `#fafafa`
  *Stories: 全部（视觉呈现）*

## 故事追溯

| Step | Stories |
|---|---|
| 3-4 | US-01、US-02 |
| 5 | US-04、US-05 |
| 6 | US-03、US-05、US-06、US-09、US-10、US-12 |
| 7-8 | US-08、US-11、US-12 |
| 9 | US-01~US-11（测试） |
| 11-12 | US-02~US-05、US-07、US-09、US-12（表现层） |
| 14 | 全部（文档/构建） |

共 14 步。US-01~US-12 全部有实现步骤承载。
