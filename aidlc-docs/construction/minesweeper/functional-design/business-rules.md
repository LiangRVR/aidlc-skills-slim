# 业务规则 - minesweeper

## BR-1 布雷规则（首次点击安全）
- BR-1.1 雷在**首次 reveal 时**才随机放置（懒布雷）
- BR-1.2 首次点击的格子及其周围 8 格（3x3 安全区，边缘裁剪）**不得为雷**
- BR-1.3 恰好放置 `mine_count` 个雷，均匀随机抽取（`random.Random` 可注入种子便于测试）
- BR-1.4 前置约束：`mine_count <= rows*cols - 9`（由自定义难度校验保证）

## BR-2 邻雷计数
- BR-2.1 每格 `adjacent_mines` = 周围 8 格中雷的数量（边缘按实际邻居计算）

## BR-3 打开格子（reveal）
- BR-3.1 仅 `HIDDEN` 且 `mark == NONE` 的格子可被 reveal；旗帜/问号格忽略左键
- BR-3.2 踩到雷：`status = LOST`，揭示所有雷；错误旗帜（标旗但非雷）以红叉标示
- BR-3.3 数字格（adjacent_mines > 0）：仅打开该格
- BR-3.4 空白格（adjacent_mines == 0）：级联展开——迭代式 flood fill（栈/队列，避免递归深度问题），打开所有连通空白格及其边界数字格
- BR-3.5 级联展开**绝不打开雷格**（空白连通域定义保证，仍需属性测试验证）
- BR-3.6 仅 `READY`/`PLAYING` 状态可 reveal；首次 reveal 后 `status = PLAYING`（触发计时）

## BR-4 标记循环（toggle mark）
- BR-4.1 仅 `HIDDEN` 格可标记：`NONE → FLAG → QUESTION → NONE`
- BR-4.2 `flag_count` 仅在 FLAG 变化时增减；问号不影响计数器

## BR-5 Chord 快速开格
- BR-5.1 触发：已打开的数字格上左右键同按
- BR-5.2 若周围旗帜数 == 该格数字：对周围所有 `HIDDEN` 且 `mark == NONE` 的格子执行 reveal（等价逐个 BR-3，可能触发级联或踩雷失败）
- BR-5.3 旗帜数不足：仅视觉高亮周围未打开格，不改变状态

## BR-6 胜负判定
- BR-6.1 胜利：`revealed_count == rows*cols - mine_count` → `status = WON`，所有剩余雷自动置 FLAG，计时停止
- BR-6.2 失败：reveal 到雷 → `status = LOST`，计时停止
- BR-6.3 计时上限 999 秒（UI 层截断显示）

## BR-7 重开
- BR-7.1 笑脸按钮或菜单选择难度 → 创建新 Game（同难度或新难度），状态复位

## 自定义难度校验（对应计划 Q3）
- 行 ∈ [9, 24]，列 ∈ [9, 30]，雷数 ∈ [10, rows*cols - 9]
