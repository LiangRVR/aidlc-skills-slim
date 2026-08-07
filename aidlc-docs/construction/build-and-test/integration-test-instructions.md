# Integration Test Instructions - sudoku-game

## Purpose
本项目为单单元纯前端应用，无跨服务集成点。以下为核心模块（core/persistence）与表现层（scenes/ui）之间集成的**手动冒烟场景**，在浏览器中逐一执行验证。

## Setup
```bash
npm install
npm run dev   # 打开 http://127.0.0.1:5173
```

## Test Scenarios

### Scenario 1: 开局流（MenuScene → GameController → GameScene）
- **Steps**: 打开页面 → 点"新游戏" → 依次验证四档难度按钮（简单/中等/困难/专家）各开局一次
- **Expected**: 每档正常进入游戏；专家档开局等待 < 2 秒；顶部难度标签与所选一致；按钮组垂直居中且不遮挡标题

### Scenario 2: 存档续玩（GameState ↔ SaveManager ↔ MenuScene）
- **Steps**: 开一局 → 填几个数字 → 刷新页面 → 点"继续上次游戏"
- **Expected**: 棋盘、笔记、错误数、计时完全恢复；localStorage 中 `sudoku-game-save` 存在

### Scenario 3: 输入与渲染（NumberPad/键盘 → GameController → EventBus → BoardView）
- **Steps**: 选中空格 → 分别用数字按钮和键盘 1-9 填数；制造一次同行同值冲突；填一个错误值
- **Expected**: 正确值蓝色、错误值红色保留、冲突格红底高亮；数字 9 格全填对后该数字按钮置灰；输入路径同时驱动特效（见 Scenario 5）

### Scenario 4: 计时暂停（Timer ↔ 页面可见性）
- **Steps**: 游戏中切到别的标签页 30 秒 → 切回
- **Expected**: 计时未增加切走期间的秒数（BR-21）

### Scenario 5: 连击特效（GameController 返回值 → VfxManager）
- **Steps**: 连续填对 3 格、6 格、9 格观察特效升级；填对完成一整行/列/宫；中途填错一次
- **Expected**: ≥3 连击出现棋盘边框脉冲；≥6 叠加上升粒子；≥9 叠加屏幕边缘粒子框；区域完成有扫光；填错时破碎动画 + 震屏，所有氛围特效消失、连击清零；全程输入不被特效阻塞

### Scenario 6: 终局流（GameState → ResultOverlay）
- **Steps**: 故意填错 3 次触发失败；重开一局并用提示/填写完成全盘触发胜利
- **Expected**: 失败显示"失败/重新开始"；胜利显示用时与"再来一局"；终局后存档被清除（刷新页面无"继续上次游戏"）

## Cleanup
```bash
# 关闭 dev server（Ctrl+C）；如需清理测试存档：浏览器控制台执行
localStorage.removeItem('sudoku-game-save')
```
