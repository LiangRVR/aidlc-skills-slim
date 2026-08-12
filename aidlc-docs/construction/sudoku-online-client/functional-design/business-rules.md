# Business Rules（unit: sudoku-online-client）— Round 5 v2（竞速对抗模式）

## 输入与权威
| 规则 | 内容 | 来源 | v2 状态 |
|---|---|---|---|
| BR-C-01 | 本地输入只转换为 op 消息发送，**不先行修改镜像棋盘**；界面变更一律等服务端 opApplied（权威确认） | FR-18 | 沿用 |
| BR-C-02 | 镜像初始化仅来自 `joined` Snapshot（v2 含 yourNotes）；此后仅由服务端消息增量更新 | FR-18 / FR-34 | 修订（初始化含 ownNotes） |
| BR-C-04 | 笔记模式为纯本地 UI 状态：切换不发消息；输入数字时按模式发 `fill` 或 `note` op。**笔记镜像只维护自己的 ownNotes**（对方笔记永不呈现） | FR-21 / FR-34 | 修订（私有笔记） |
| BR-C-05 | undo/redo 只发 op；按钮可用性不做本地预判，空栈由服务端 `opRejected` 兜底 | FR-25 | 沿用 |
| BR-C-06 | `isReadOnly()`=true（**disconnected 或 status==='won'**，v2 修订：旁观态已废除）时 GameScene 阻断一切棋盘输入 | FR-37 | 修订 |

## 显示与反馈
| 规则 | 内容 | 来源 | v2 状态 |
|---|---|---|---|
| BR-C-03 | 消息应用按 business-logic-model §3 表逐条执行；`opApplied` 中 `result='correct' 且 playerId=自己` 才派发本地 VFX（含 completedUnits）；对方操作不触发任何特效 | FR-20 | 沿用 |
| BR-C-09 | 数字着色：自己=蓝、对方=黑、错填=红（覆盖归属色）、预填=既有样式 | FR-20 / F7 | 沿用 |
| BR-C-10 | PlayerCountBadge：右上角常驻"在线 n/2"；joined/playerJoined/playerLeft 时更新；仅线上模式渲染 | FR-30 | 沿用 |
| BR-C-11 | JoinToast 非阻塞：~3 秒自动淡出 | FR-19 | 沿用 |
| BR-C-13 | **ScoreBoard（F8）**：双方分数单行双段（自己/对方，顶部中央），随每条 opApplied.scores 即时更新；仅线上模式挂载；分数来源严格为服务端消息（不本地计算） | FR-31 / Q2=A | **v2 新增** |
| BR-C-14 | **终局覆盖层**：gameOver → 展示双方最终分数、胜/负/平局（winnerId 与自己比对；null=平局）、用时 elapsedSeconds；reason='forfeit' 时可区分"对方离开"文案；**取代 v1 胜利覆盖层与旁观覆盖层** | FR-36~39 | **v2 新增** |
| BR-C-15 | opApplied 私有字段（notes/clearedNotes）**只更新自己的 ownNotes 镜像**：notes → 整格替换该格笔记；clearedNotes → **条目级**应用：correct/redone 移除该格该数字（同格其余笔记保留），undone 恢复该格该数字（仅空格，CP-1 不变量） | FR-34 | **v2 新增；v2.1 修正（格索引→{index,value} 条目，2026-08-12 用户回归发现）** |

## 会话与导航
| 规则 | 内容 | 来源 | v2 状态 |
|---|---|---|---|
| BR-C-07 | 返回主菜单/关闭页面前发送 `leave` 并 `close()`；联机模式不实例化 SaveManager | FR-27 | 沿用 |
| BR-C-08 | 连接失败：中文提示"无法连接到服务器，请确认服务已启动"并返回主菜单；断线（非主动）："连接已断开"覆盖层 + 只读 | US-16 | 沿用 |
| BR-C-12 | capabilities()：联机 `{hint:false, reset:false, newGame:false}` | FR-25 / FR-27 | 沿用 |
| ~~旁观相关~~ | ~~playerLost 处理、旁观覆盖层、旁观只读~~ | — | **v2 废除**（FR-37） |

## FR/US 映射校验（v2）
| 需求 | 规则 | 状态 |
|---|---|---|
| FR-15 模式选择 | business-logic-model §2 + frontend-components MenuScene | 对齐 |
| FR-16/17 免登录/匹配（前端配合） | BR-C-08 + §2 | 对齐 |
| FR-18 权威确认 | BR-C-01/02 | 对齐 |
| FR-19 加入提示 | BR-C-11 | 对齐 |
| FR-20 特效/视觉隔离 | BR-C-03/09 | 对齐 |
| FR-24 共享计时（前端配合） | now-startedAt 本地渲染（§4） | 对齐 |
| FR-25/27 撤销/提示/重开限制 | BR-C-05/12 | 对齐 |
| FR-30 在线人数 | BR-C-10 | 对齐 |
| FR-31 分数展示 | BR-C-13 | 对齐 |
| FR-32 连击（前端） | 无前端呈现（连击服务端内部、不下发，Q2 补充） | 对齐（无呈现义务） |
| FR-33 undo/redo（前端配合） | BR-C-05 + opApplied cell/scores 镜像更新 | 对齐 |
| FR-34 笔记私有（前端配合） | BR-C-02/04/15 | 对齐 |
| FR-35 归属（前端配合） | BR-C-01/09（着色随 owner 变化；错填格任何人可尝试 fill，无本地预判） | 对齐 |
| FR-36/39 终局展示 | BR-C-14 | 对齐 |
| FR-37 废除旁观（前端配合） | BR-C-06 修订 + 旁观相关废除 | 对齐 |
| FR-38 离开判胜（前端配合） | BR-C-14（forfeit 文案）+ BR-C-10 | 对齐 |
| FR-40 本地零改动 | §5 本地模式路径 + 回归门禁 | 对齐 |

前端覆盖的 17 个 FR 全部有规则落点，无遗漏。
