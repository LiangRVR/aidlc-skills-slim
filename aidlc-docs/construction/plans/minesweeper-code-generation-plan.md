# Code Generation Plan - minesweeper

**Unit**: minesweeper（单一单元）
**状态**: Part 1 Planning 完成（autonomous 自动批准，AM-03）；本计划为代码生成的唯一事实来源

## 单元上下文
- 需求：`aidlc-docs/inception/requirements/requirements.md`（FR-1~FR-4, NFR-1~5）
- 设计：`aidlc-docs/construction/minesweeper/functional-design/`（domain-entities / business-rules / business-logic-model / frontend-components）
- 应用代码位置：`D:\Documents\PythonProject\aidlc-skills\minesweeper\`（Q2=A，清理旧产物后重建）
- PBT（部分模式）：Hypothesis；PBT-02 N/A（无序列化）；PBT-03/07/08/09 阻断

## 生成步骤

- [x] Step 1: 清理旧产物 —— 删除 `minesweeper/` 下的 `build/`、`dist/`、`minesweeper.spec`、`.pytest_cache`、全部 `__pycache__` 及失效的旧 `.venv`
- [x] Step 2: 项目结构初始化 —— `pyproject.toml`（uv 管理；依赖 pyside6、PyQt-Fluent-Widgets；dev 依赖 pytest、hypothesis、pyinstaller）、`uv sync` 重建 `.venv`
- [x] Step 3: 逻辑层生成 —— `minesweeper/game.py`（CellState/Mark/GameStatus 枚举、Cell/Board/Game、reveal/toggle_mark/chord/remaining_mines，BR-1~BR-7，可注入 rng）
- [x] Step 4: 逻辑层示例单元测试 —— `tests/test_game.py`（首点安全、级联展开、标记循环、chord、胜负、计数器）
- [x] Step 5: 逻辑层属性测试 —— `tests/test_game_properties.py`（Hypothesis：布雷不变量、邻雷计数 oracle、展开不触雷、胜负不变量；受约束棋盘生成器 PBT-07；种子复现 PBT-08）
- [x] Step 6: 前端组件生成 —— `minesweeper/ui/`（cell_button.py / board_widget.py / main_window.py / custom_dialog.py），QFluentWidgets，交互映射见 frontend-components.md；交互控件设置稳定的 objectName（自动化友好）
- [x] Step 7: 入口与打包配置 —— `launcher.py`、新 `minesweeper.spec`（onefile、无控制台）
- [x] Step 8: 测试执行验证（12 passed；高级难度首点展开最差 1.80ms，满足 NFR-2 <100ms）
- [x] Step 9: 文档生成 —— `aidlc-docs/construction/minesweeper/code/` 下各层 markdown 摘要；`minesweeper/README.md`（运行/测试/打包说明）
- [x] Step 10: 打包 exe（dist\minesweeper.exe，约 47MB，onefile 无控制台）
- [x] Step 11: 变更请求 —— 通关画面：WON 时弹出恭喜对话框（显示用时、再来一局/关闭），防重复弹出；更新 requirements.md / frontend-components.md；offscreen 冒烟验证；重新打包 exe
- [x] Step 12: Bug 修复 —— 新游戏盘面空白：根因为 rebuild() 重复创建 QGridLayout（Qt 拒绝第二个布局）；改为布局只建一次、rebuild 复用并重新填充；新增 tests/test_ui.py 回归测试；exe 重新打包

## 需求追踪
| 步骤 | 需求 |
|---|---|
| Step 3 | FR-1, FR-2, BR-1~BR-7 |
| Step 4-5 | NFR-4, PBT-03/07/08/09 |
| Step 6 | FR-3, FR-4, frontend-components.md |
| Step 7/10 | NFR-5 |
| Step 8 | NFR-2（高级难度性能抽查） |
