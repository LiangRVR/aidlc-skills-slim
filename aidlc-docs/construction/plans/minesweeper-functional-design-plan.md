# Functional Design Plan - minesweeper

**Unit**: minesweeper（单一单元：经典扫雷桌面游戏）
**Depth**: Minimal

## Steps

- [x] 分析单元上下文（requirements.md）
- [x] 定义领域实体（Cell / Board / Game）
- [x] 定义业务规则（布雷、展开、标记、chord、胜负）
- [x] 识别可测试属性（PBT-01，advisory 模式）
- [x] 定义前端组件结构
- [x] 生成设计制品

## 设计澄清问题（自主模式 auto-recommended）

## Question 1
Chord 快速开格的触发方式？

A) 在已打开数字格上左右键同时按下（经典 Windows 扫雷行为）

B) 在已打开数字格上双击左键

C) 两者都支持

D) Other (please describe after [Answer]: tag below)

[Answer]: A (autonomous - recommended)

**Rationale** (autonomous): 复刻经典 Windows 扫雷，原版即左右键同按；双击左键易与普通点开混淆。

## Question 2
问号标记是否计入剩余雷数计数器？

A) 否，仅旗帜扣减计数器（经典行为）

B) 是，问号也扣减计数器

C) Other (please describe after [Answer]: tag below)

[Answer]: A (autonomous - recommended)

**Rationale** (autonomous): 经典 Windows 扫雷中只有旗帜影响剩余雷数显示，问号仅为备忘标记。

## Question 3
自定义难度的参数边界？

A) 行 9~24、列 9~30、雷数 10~(行x列-9)，与经典范围一致并可满足首点安全

B) 任意正整数，仅在雷数 >= 总格数-9 时拒绝

C) Other (please describe after [Answer]: tag below)

[Answer]: A (autonomous - recommended)

**Rationale** (autonomous): 经典自定义对话框即采用类似边界；保证 FR-1.3 首点安全（排除 3x3 安全区）在任何棋盘上可实现。
