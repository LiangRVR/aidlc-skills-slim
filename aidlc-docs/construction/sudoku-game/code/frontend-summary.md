# Frontend Summary - unit: sudoku-game

## 结构

- `src/main.ts` — Phaser.Game 启动（540x700，AUTO 渲染，挂载 `#game-container`），创建单例 GameController 存入 registry
- `src/scenes/menu-scene.ts` — 主菜单：标题、"继续上次游戏"（hasSave 时，load 失败降级回菜单）、"新游戏" → 三档难度按钮（简单/中等/困难）
- `src/scenes/game-scene.ts` — 游戏主场景：组装 ControlBar / BoardView / NumberPad / ResultOverlay；订阅 EventBus 七个领域事件统一 renderAll；键盘映射（1-9 填数、Delete/Backspace 清除、N 笔记、Z 撤销、Y 重做、H 提示）；Phaser 计时器每秒 tick（仅 playing 时），`visibilitychange` 控制计时器 paused（BR-21）；场景 shutdown 时解除全部订阅与 DOM 监听
- `src/ui/board-view.ts` — 468px 棋盘（52px 格）：宫线粗/细线区分；高亮优先级 冲突 > 选中 > 同数字 > 关联行列宫；预填格黑色粗体、用户填写蓝色、错误红色（BR-06）；笔记 3x3 小字渲染
- `src/ui/number-pad.ts` — 棋盘下方一行横向 10 键（1-9 + 清除）；笔记模式：整行按钮蓝色填充 + 加粗描边 + 右上角"笔记模式"标识（BR/设计决策）；数字 9 个位置全部填对时对应按钮置灰禁用（BR-25），不再完整时自动恢复
- `src/ui/control-bar.ts` — 顶部：时间 mm:ss、错误 x/3、难度标签；按钮行：撤销/重做/提示/笔记/重开/新游戏；撤销/重做按栈状态禁用（BR-20）；笔记按钮高亮反映模式
- `src/ui/result-overlay.ts` — 半透明遮罩 + 面板：胜利（显示用时）/失败（错误上限），按钮返回主菜单
- `src/ui/vfx-manager.ts` — 连击特效（第二轮 FR-13 / BR-26~BR-30）：streak 计数与 4 档分层（1-2/3-5/6-8/9+）；填对时格子粒子爆发 + 光环扩散 + 闪格，完成行/列/宫时区域扫光；连击 ≥3 棋盘边框脉冲、≥6 叠加上升粒子、≥9 叠加全屏边缘脉冲光与彩纸；填错时破碎粒子 + 震屏，连击清零且全部氛围特效消失；reset/destroy 供重开与场景销毁调用

## 交互流实现要点

- 输入路径：BoardView 点击格 → selectCell；NumberPad/键盘 → GameScene.onDigitInput → GameController.inputDigit（返回 `{index, result}`）→ 正确/错误分发 VfxManager.playCorrect/playWrong → EventBus → renderAll
- 行/列/宫完成检测：GameScene.completedUnitsOf 在填对后比对 board 与 solution，触发区域扫光特效
- 冲突与错误单元格由 GameScene 在 renderAll 中用 RuleValidator 实时计算（conflictsAt 双向标记；wrongCells = 非预填且值 ≠ solution）
- 终局：game:won / game:lost 事件 → ResultOverlay；存档清除由 core 层 setClearSaveHandler 完成，UI 不触碰 localStorage

## 自动化友好

- `index.html` 容器 `data-testid="game-container"`（canvas 内部元素无 DOM，无法挂 testid，见计划说明）

## 验证结果

- `npx tsc --noEmit`：0 错误
- `npm run build`：成功（dist/ 产出，gzip ≈ 348 kB）
- `npx vitest run`：58/58 通过（含生成器修复后三档难度预填数范围稳定性验证，重复 4 次运行全过）
- 第二轮（FR-13 连击特效）后复验：`npx tsc --noEmit` 0 错误、`npx vitest run` 58/58 通过、`npm run build` 成功
