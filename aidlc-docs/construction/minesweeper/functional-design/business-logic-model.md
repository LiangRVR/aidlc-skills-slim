# 业务逻辑模型 - minesweeper

## 核心 API（逻辑层，纯 Python，不依赖 Qt）

```text
Game(rows, cols, mine_count, rng: random.Random | None = None)
  .reveal(row, col)        -> RevealResult   # BR-3；首次调用触发懒布雷 BR-1
  .toggle_mark(row, col)   -> Mark           # BR-4，返回新标记
  .chord(row, col)         -> ChordResult    # BR-5
  .remaining_mines         -> int            # mine_count - flag_count
  .status                  -> GameStatus
```

- `RevealResult`: 本次状态发生变化的格子集合 + 游戏状态（用于 UI 增量刷新）
- `ChordResult`: 变化格子集合 + 是否因旗数不足而未动作（用于高亮提示）

## 算法要点

### 懒布雷（BR-1）
```text
safe_zone = 3x3 邻域(first_click) ∩ 棋盘
candidates = 全部格子 - safe_zone
mines = rng.sample(candidates, mine_count)
逐格计算 adjacent_mines
```

### 级联展开（BR-3.4）
```text
stack = [start]
while stack:
    cell = pop()
    if 已访问 or cell 非 HIDDEN/无标记: continue
    打开 cell
    if cell.adjacent_mines == 0:
        push 全部 HIDDEN 邻居
```

### Chord（BR-5）
```text
if cell 已打开且 adjacent_mines > 0:
    flags = 周围 FLAG 数
    if flags == cell.adjacent_mines:
        对周围 HIDDEN&无标记格逐个 reveal（合并结果集合）
    else:
        返回高亮集合（不改状态）
```

## 可测试属性（PBT-01，部分模式：仅 PBT-02/03/07/08/09 阻断）

| 属性 | 类别 | 规则映射 |
|---|---|---|
| 布雷数 == mine_count 且安全区无雷 | Invariant | PBT-03（阻断） |
| adjacent_mines 与蛮力重算一致 | Oracle | PBT-03（阻断，蛮力校验作为不变量验证） |
| 级联展开不打开任何雷格；打开区域恰为连通空白+边界数字 | Invariant | PBT-03（阻断） |
| 胜负判定：revealed_count + mine_count == 总格数 ⟺ WON | Business invariant | PBT-03（阻断） |
| 序列化 Round-trip | Round-trip | PBT-02：N/A（无序列化） |
| 棋盘参数生成器（行列雷数受约束） | Generator quality | PBT-07（阻断） |
| Hypothesis 收缩与种子复现 | Shrinking/Repro | PBT-08（阻断） |
| 框架选型 Hypothesis，列入依赖 | Framework | PBT-09（阻断） |
| PBT-01/04/05/06/10 | — | Advisory（部分模式不阻断；示例测试仍会编写） |

说明：UI 组件（QFluentWidgets 界面）无 PBT 属性，标记为 "No PBT properties identified"（纯渲染/事件绑定）。
