# 领域实体 - minesweeper

## Cell（格子）

| 字段 | 类型 | 说明 |
|---|---|---|
| `is_mine` | bool | 是否为雷 |
| `adjacent_mines` | int (0-8) | 周围 8 格雷数 |
| `state` | CellState | `HIDDEN` / `REVEALED` |
| `mark` | Mark | `NONE` / `FLAG` / `QUESTION` |

约束：`mark != NONE` 时 `state` 必为 `HIDDEN`；已打开格子无标记。

## Board（棋盘）

| 字段 | 类型 | 说明 |
|---|---|---|
| `rows` | int | 行数（9~24） |
| `cols` | int | 列数（9~30） |
| `mine_count` | int | 雷数（10 ~ rows*cols-9） |
| `cells` | list[list[Cell]] | 格子矩阵 |
| `mines_placed` | bool | 是否已布雷（懒布雷：首次 reveal 时才放置） |

## Game（游戏）

| 字段 | 类型 | 说明 |
|---|---|---|
| `board` | Board | 当前棋盘 |
| `status` | GameStatus | `READY` / `PLAYING` / `WON` / `LOST` |
| `revealed_count` | int | 已打开的非雷格数 |
| `flag_count` | int | 当前旗帜数 |

派生量：`remaining_mines = mine_count - flag_count`（可为负，仅旗帜扣减，问号不影响）。

## 关系

```
Game 1---1 Board 1---* Cell
```

- Game 聚合 Board；Board 聚合 Cell 矩阵
- Game 持有状态机，UI 层仅调用 Game 方法并渲染返回结果
