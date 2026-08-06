# Business Logic Model - unit: sudoku-game

## 1. 谜题生成流程（SudokuGenerator）

**决策依据**：难度按预填数字数量定义（简单 40-45 / 中等 32-39 / 困难 26-31）。

1. **生成完整解**：从空盘出发，使用随机化回溯算法填充 81 格（每格候选数随机排序后尝试），得到一个完整有效解 `solution`
2. **确定目标预填数**：在难度对应区间内随机取目标预填数 `targetGivens`（简单 40-45、中等 32-39、困难 26-31）
3. **对称挖空**：将 81 格随机排序后遍历，优先按中心对称配对（i 与 80-i）挖空：
   - 挖空候选格（值置 0）后，调用 `SudokuSolver.countSolutions(grid, 2)` 校验
   - 若解仍唯一（返回 1）：接受挖空
   - 若解不唯一（返回 ≥2）：撤销本次挖空，跳过该格
4. **终止条件**：预填数降至 `targetGivens`，或全部格子遍历完毕（此时接受当前结果）
5. **性能约束**：全过程 < 1 秒（countSolutions 带 limit 短路，挖空尝试有界）

## 2. 求解器流程（SudokuSolver）

- `solve`：回溯 + MRV 启发（每次选候选数最少的空格），找到一个解即返回
- `countSolutions(grid, limit)`：同样回溯，累计解数量达到 `limit` 立即返回（供唯一性校验与生成器短路）
- `findHint`：遍历 board 中值为 0 的格，返回 `{ index, value: solution[index] }`；无空格返回 null

## 3. 游戏状态流转（GameState）

```text
             newGame / continueGame
MenuScene --------------------------> playing
playing -- fill 完成且全对 ---------> won（计时停止，存档清除）
playing -- mistakes 达 3 -----------> lost（计时停止，存档清除，棋盘锁定）
playing -- reset -------------------> playing（恢复初始谜题，计时/错误清零，清除存档）
won/lost -- 新游戏 -----------------> playing
```

- 状态机字段：`status: 'playing' | 'won' | 'lost'`
- `won` / `lost` 后所有填数/笔记/撤销操作返回 'ignored'

## 4. 填入与校验流程（fill）

1. 前置校验：格子为预填格、或 status ≠ playing → 返回 'ignored'
2. 记录 Move（含该格旧值与旧笔记快照）入撤销栈，清空重做栈
3. 写入新值，清除该格笔记
4. `RuleValidator.isCorrect` 校验：
   - 正确 → 清除同行/列/宫其他格的该候选数笔记（笔记变更并入 Move 快照）；若 `isComplete` → status=won，emit `game:won`
   - 错误 → 数字保留在格内标红显示（决策 Q2=A），mistakes+1，emit `mistakes:changed`；mistakes 达 3 → status=lost，emit `game:lost`
5. 每次 fill 后 emit `state:changed` 与 `conflict:updated`

## 5. 撤销 / 重做机制

- **Move 记录内容**：操作类型（fill/erase/note/hint）、目标格、旧值/新值、该格旧笔记/新笔记、受影响的关联笔记清除列表、mistakes 变化量
- `undo`：弹出撤销栈顶 Move，按快照逆向恢复（值、笔记、关联笔记、mistakes）；压入重做栈
- `redo`：弹出重做栈顶 Move，正向重放；压入撤销栈
- 任何新操作（fill/erase/toggleNote/applyHint）清空重做栈
- 撤销/重做不越过本局边界（reset 后历史栈清空）

## 6. 计时与暂停（决策 Q3=A）

- GameScene 的 Phaser 计时器每秒触发 `GameController.tick(1)` → GameState.elapsedSeconds+1 → emit `timer:tick`
- 监听 `document.visibilitychange`：页面不可见时暂停计时器；恢复可见时继续
- status ≠ playing 时计时器停止

## 7. 自动存档流程

- **触发点**：每次有效操作（fill/erase/note/undo/redo/hint）后；计时每累计 5 秒时
- **写入**：`GameState.toSave()` → SaveManager.save（含 version 字段）
- **清除**：存档清除有三个独立触发点——① status 变为 won/lost 时 SaveManager.clear；② newGame 时覆盖旧存档；③ reset 时 SaveManager.clear。注意 reset **不是** won/lost/newGame 中的任何一种：reset 后 status 保持 playing（同一谜题恢复初始状态），但它作为独立的存档清除触发点，先清除旧存档，重置后的新状态由后续自动存档（有效操作后或每 5 秒）重新写入
- **读取**：启动时 MenuScene 调 `hasSave()`；`load()` 解析失败、版本不符或结构校验失败 → 返回 null，按无存档处理（降级为新游戏入口）
