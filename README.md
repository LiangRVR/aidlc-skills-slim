# aidlc-skills
Converting AWS's aidlc-workflow into more general-purpose agent skills, while also adding cloud-based workflow approval capabilities.

---

# 数独 Web 游戏（Sudoku Game）

纯前端中文数独游戏：Phaser 3 + TypeScript + Vite。三档难度、候选数笔记、冲突提示、计时、提示、错误限制（3 次）、撤销/重做、localStorage 存档续玩。

## 快速开始

```bash
npm install     # 安装依赖
npm run dev     # 本地开发服务器（默认 http://localhost:5173）
npm run test    # 运行单元测试（Vitest，102 个用例，含 fast-check 属性测试）
npm run build   # 生产构建，产出 dist/ 静态文件（任意静态服务器即可部署）
```

## 操作方式

- 鼠标点击格子选中，点击棋盘下方数字按钮或按键盘 1-9 填入
- Delete/Backspace 清除，N 切换笔记模式，Z 撤销，Y 重做，H 提示

## 代码结构

```text
src/
  core/          纯 TypeScript 核心（引擎无关，可独立测试）
    sudoku-generator.ts  唯一解谜题生成（对称挖空 + 解数量校验）
    sudoku-solver.ts     回溯求解 / 解计数 / 提示定位
    rule-validator.ts    冲突检测 / 正确性 / 完成判定
    game-state.ts        棋盘状态、笔记、撤销重做、错误限制、状态机
    game-controller.ts   编排：开局/续玩/输入/计时/自动存档
    event-bus.ts         领域事件总线
  persistence/
    save-manager.ts      localStorage 存档（版本/结构校验，损坏降级）
  scenes/  ui/           Phaser 表现层（MenuScene / GameScene / BoardView / NumberPad / ControlBar / ResultOverlay）
tests/                   Vitest 单元测试（核心逻辑）
```

