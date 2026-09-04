# Performance Test Instructions

## Purpose
验证 NFR-2：高级难度（16x30/99，480 格）级联展开无可感知卡顿。

## Performance Requirements
- **首点级联展开耗时**: < 100ms（单次 reveal，含懒布雷）

## Run Performance Test

### 执行（开发期已验证）
30 个不同 seed 的高级难度首点 reveal，取最差耗时：

```text
worst first-reveal time over 30 runs: 1.80 ms  →  PERF OK
```

### 结果
- **实测最差**: 1.80ms（目标 < 100ms，裕量 > 50 倍）
- **瓶颈**: 无；级联为迭代式栈实现，无递归深度风险

## 回归方法
若修改 `game.py` 的布雷/展开逻辑，重跑等价计时脚本确认最差耗时仍 < 100ms。
