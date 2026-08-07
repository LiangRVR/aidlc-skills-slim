# Unit of Work Story Map（Round 4 - 多人版）

映射策略：跨端故事按主要逻辑落点单标，"配合"列标注另一端需完成的部分（unit-of-work-plan-round4.md Q3=A）。

## US-15~US-29 → 单元映射

| 故事 | 主单元 | 配合单元 | 说明 |
|---|---|---|---|
| US-15 模式选择 | sudoku-online-client | — | 前端菜单分支；本地路径零改动 |
| US-16 免登录接入 | sudoku-server | sudoku-online-client | 服务端连接即分配 playerId；前端负责连接与失败中文提示 |
| US-17 开局与匹配 | sudoku-server | sudoku-online-client | 匹配算法在服务端；前端负责难度选择与 join 流程 |
| US-18 实时状态共享 | sudoku-server | sudoku-online-client | 权威状态与广播在服务端；前端镜像渲染与初始快照应用 |
| US-19 加入提示 | sudoku-online-client | sudoku-server | JoinToast 在前端；服务端发 `playerJoined` |
| US-20 特效/视觉隔离 | sudoku-online-client | sudoku-server | VFX 隔离与蓝色渲染在前端；服务端在 opApplied 附带 completedUnits |
| US-21 笔记共享/清除 | sudoku-server | sudoku-online-client | 笔记不区分归属与联动清除在服务端；前端同步渲染 |
| US-22 合作胜利 | sudoku-server | sudoku-online-client | 完成判定与 `gameWon` 在服务端；前端胜利覆盖层 |
| US-23 独立错误/旁观 | sudoku-server | sudoku-online-client | 计数与 `playerLost` 在服务端；前端旁观锁定与状态展示 |
| US-24 共享计时 | sudoku-server | sudoku-online-client | startedAt 由服务端维护下发；前端本地显示 now-startedAt |
| US-25 撤销/提示限制 | sudoku-server | sudoku-online-client | undo 仅自己由服务端校验；前端禁用提示按钮 |
| US-26 错填互擦 | sudoku-server | sudoku-online-client | 擦除权限校验在服务端；前端交互 |
| US-27 对局控制限制 | sudoku-online-client | — | 前端 capabilities() 禁用重开/新游戏 + 离开房间流程 |
| US-28 断线补位 | sudoku-server | sudoku-online-client | 房间保留与补位在服务端；前端"对方已离开"提示 |
| US-29 本地回归 | sudoku-online-client | — | 接口抽取零行为变化 + 回归验证 |

## shared-protocol 的故事归属
- 无直接用户故事（使能单元）；支撑 US-16/17/18/21 的协议与序列化可靠性（PBT 往返测试）

## 既有故事（不变）
- US-01~US-14 → 既有单元 `sudoku-game`，本轮不改动其验收标准

## 完整性校验
- US-15~US-29 全部 15 个故事已映射，无遗漏
- 无故事映射到不存在的单元；跨端配合关系与 unit-of-work-dependency-round4.md 一致
