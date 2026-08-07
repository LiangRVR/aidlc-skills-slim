# Performance Test Instructions - sudoku-game

## Purpose
验证纯前端数独在关键路径上的性能满足 UX 要求。无服务端，故无负载/压力测试。

## Performance Requirements
- **谜题生成时间**: 简单/中等/困难 < 1s；专家 < 2s（预填数少，唯一解校验更耗时）
- **构建产物**: gzip 后单 bundle < 500KB（Phaser 引擎占绝大部分）
- **交互响应**: 填数到棋盘重绘 < 100ms（人眼无感）
- **特效**: 高档连击（≥9）全特效叠加时不掉帧（现代桌面浏览器 ≥ 30fps）

## 实测基准（2026-08-06，本机）
- expert 谜题生成：≈ 240ms/个（vitest 中 5 连生成共 1192ms）
- `npm run build`：≈ 4-5s，产物 gzip ≈ 350KB
- 单元测试全套（60 用例）：≈ 2-3s

## Run Performance Checks

### 1. 生成耗时（自动化，已含在单元测试中）
```bash
npx vitest run tests/sudoku-generator.test.ts
```
- 观察 expert 用例耗时；若 > 5s 需优化挖空策略（减少无效回溯或调低重试次数）

### 2. 运行时帧率（手动）
- 浏览器 DevTools → Performance 面板录制：连击 ≥9 状态下连续填数 30 秒
- **Expected**: 无明显长任务（>100ms），帧率稳定

### 3. Bundle 体积（构建输出检查）
```bash
npm run build
```
- 确认 gzip 体积未显著增长（基线 ≈ 350KB）

## Performance Optimization（若不达标）
1. 生成慢：调整 expert 预填数下限（22 → 24）或生成器降重试上限
2. 帧率低：降低高档位粒子 frequency / 减少彩纸爆发点数
3. 体积大：启用 `manualChunks` 拆分 Phaser（当前无实际需求，仅记录）
