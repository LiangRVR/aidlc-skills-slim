# 测试代码摘要 - minesweeper

## 文件
- `tests/test_game.py` — 示例单元测试（pytest）：初始化、首点安全（固定 seed）、数字格/级联展开、标记循环与计数器、chord 成功/旗数不足、踩雷锁定、胜利自动标旗、参数校验
- `tests/test_game_properties.py` — Hypothesis 属性测试（PBT 部分模式）
- `tests/test_ui.py` — UI 回归测试（offscreen）：rebuild 后格子挂载布局（盘面空白 bug 回归）、同难度重开布局不膨胀

## PBT 合规
| 规则 | 状态 | 说明 |
|---|---|---|
| PBT-02 Round-trip | N/A | 无序列化/编码对 |
| PBT-03 Invariant | ✅ compliant | 布雷数不变量、安全区无雷、邻雷计数 oracle 校验、级联不触雷、revealed_count 不变量 |
| PBT-07 Generator | ✅ compliant | 受约束 `board_configs` / `first_clicks` 领域生成器 |
| PBT-08 Shrinking/Seed | ✅ compliant | 未禁用 shrinking，未 derandomize，Hypothesis 默认失败输出 seed |
| PBT-09 Framework | ✅ compliant | Hypothesis 已列入 dev 依赖 |
| PBT-01/04/05/06/10 | N/A（advisory，部分模式不阻断） | 示例测试与 PBT 分文件并存 |

## 执行结果
- `uv run pytest -q` → 14 passed（约 5s，含 2 个 UI 回归测试）
- NFR-2 性能抽查：高级难度(16x30/99) 30 次首点展开最差 1.80ms（阈值 100ms）
