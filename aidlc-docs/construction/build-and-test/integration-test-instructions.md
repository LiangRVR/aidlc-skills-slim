# Integration Test Instructions

## Purpose
单桌面应用，无跨服务集成。此处的"集成"指 **逻辑层（game.py）与 UI 层（ui/）的协同**，通过 offscreen 冒烟测试验证。

## Test Scenarios

### Scenario 1: 逻辑层 → UI 渲染集成（offscreen 冒烟）
- **描述**: 无显示环境下实例化 MainWindow，驱动真实 Game 操作，验证 UI 渲染与状态联动
- **环境**: `set "QT_QPA_PLATFORM=offscreen"` + `set "PYTHONIOENCODING=ascii"`（GBK 终端无法打印 emoji）
- **覆盖点**:
  - 窗口构建与尺寸自适应（初级 9x9 → 高级 16x30 重建）
  - 首点 reveal 后状态为 PLAYING/WON，级联渲染无异常
  - 标记循环渲染（🚩/?/空白）
  - 失败路径全量渲染（💣/❌/红底触发雷）
  - 自定义对话框校验（非法雷数禁用确定按钮）
- **预期**: 全部断言通过，输出 `SMOKE OK`
- **清理**: 无需清理（offscreen，无窗口残留）

### Scenario 2: 手动端到端验收（可选）
- 运行 `uv run python launcher.py` 或 `dist\minesweeper.exe`
- 验收清单：首点安全、级联展开、旗/问号循环、chord 成功与旗数不足高亮、计数器/计时器、笑脸四态、三档难度与自定义对话框、胜利/失败揭示

## Run

冒烟脚本已在开发期执行通过（见 code/ui-summary.md）；回归时重跑等价脚本即可。
