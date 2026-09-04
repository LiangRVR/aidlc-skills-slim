# 扫雷游戏 - 需求澄清问题

请回答以下问题以澄清需求。

## Question 1
使用什么技术形态实现这个扫雷游戏？

A) PySide6 桌面应用（Windows 原生窗口风格，与 `minesweeper/` 目录下旧实现的残留产物一致，可打包成 exe）

B) 纯 Web 页面（HTML/CSS/JavaScript，浏览器打开即可玩）

C) 终端命令行版本（Python，字符界面）

D) Other (please describe after [Answer]: tag below)

[Answer]: D — PySide6 + QFluentWidgets + uv

## Question 2
游戏代码放在哪里？

A) 重建到现有 `minesweeper/` 目录（清理旧的 build/dist 等失效产物后重建）

B) 在工作区新建一个目录（如 `winmine/`），不动旧的 `minesweeper/` 目录

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
游戏难度设置需要做到什么程度？

A) 经典三档难度（初级 9x9/10 雷、中级 16x16/40 雷、高级 30x16/99 雷）+ 自定义难度

B) 仅经典三档难度，不要自定义

C) 仅单一固定难度（如初级 9x9/10 雷）

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
需要哪些经典 Windows 扫雷的交互细节？（多选）

A) 首次点击保证安全（第一次点开的位置及其周围不会是雷）

B) 双击/左右键同时按的快速开格（chord：数字格周围旗数足够时自动展开其余格子）

C) 右键标记循环：旗帜 → 问号 → 空白

D) 顶部计数器（剩余雷数）与计时器、笑脸按钮重新开始

E) 记录各难度最佳成绩（本地保存）

F) Other (please describe after [Answer]: tag below)

[Answer]: A, B, C, D

## Question 5
是否需要用 PyInstaller 打包成 Windows 可执行文件（exe）？

A) 需要，最终交付可双击运行的 exe

B) 不需要，能从源码直接运行即可

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
是否需要为本项目启用安全扩展规则（Security Baseline）？

A) 是 —— 将所有 SECURITY 规则作为阻断性约束执行（推荐用于生产级应用）

B) 否 —— 跳过所有 SECURITY 规则（适用于 PoC、原型和实验性项目，如本小游戏）

C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 7
是否需要为本项目启用弹性基线扩展（Resiliency Baseline，源自 AWS Well-Architected 可靠性支柱的设计期最佳实践）？

A) 是 —— 应用弹性基线作为设计期指导（适用于业务关键型工作负载）

B) 否 —— 跳过弹性基线（适用于 PoC、原型和实验性项目，如本小游戏）

C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 8
是否为本项目启用基于属性的测试（Property-Based Testing）规则？

A) 是 —— 将所有 PBT 规则作为阻断性约束执行

B) 部分启用 —— 仅对纯函数（如布雷、邻雷计数、展开算法等核心游戏逻辑）执行 PBT 规则

C) 否 —— 跳过所有 PBT 规则，仅使用常规单元测试（pytest）

D) Other (please describe after [Answer]: tag below)

[Answer]: B
