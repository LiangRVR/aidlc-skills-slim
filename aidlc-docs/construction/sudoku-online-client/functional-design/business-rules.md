# Business Rules（unit: sudoku-online-client）

## 输入与权威
| 规则 | 内容 | 来源 |
|---|---|---|
| BR-C-01 | 本地输入只转换为 op 消息发送，**不先行修改镜像棋盘**；界面变更一律等服务端 opApplied 广播（权威确认，BR-S-16 的客户端对应） | FR-18 |
| BR-C-02 | 镜像初始化仅来自 `joined` Snapshot；此后仅由服务端消息增量更新 | FR-18 |
| BR-C-04 | 笔记模式为纯本地 UI 状态：切换不发消息；输入数字时按模式发 `fill` 或 `note` op | FR-21 |
| BR-C-05 | undo/redo 只发 op；按钮可用性不做本地预判，空栈由服务端 `opRejected` 兜底 | FR-25 |
| BR-C-06 | `isReadOnly()`=true（旁观/断线）时 GameScene 阻断一切棋盘输入 | FR-23 |

## 显示与反馈
| 规则 | 内容 | 来源 |
|---|---|---|
| BR-C-03 | 消息应用按 business-logic-model §3 表逐条执行；`opApplied` 中 `result='correct' 且 playerId=自己` 才派发本地 VFX（含 completedUnits）；对方的操作不触发任何特效 | FR-20 |
| BR-C-09 | 数字着色：自己填入=蓝色、对方填入=黑色、错填=红色（覆盖归属色）、预填=既有样式（实施期修订，原"自己黑/对方蓝"作废） | FR-20 / F7 |
| BR-C-10 | PlayerCountBadge：右上角常驻"在线 n/2"，n=players.length；joined/playerJoined/playerLeft 时更新；playerLost 不改变人数；仅线上模式渲染；非交互元素 | FR-30 / US-30 |
| BR-C-11 | JoinToast 非阻塞：右上角 ~3 秒自动淡出，不弹模态、不抢占输入焦点 | FR-19 |

## 会话与导航
| 规则 | 内容 | 来源 |
|---|---|---|
| BR-C-07 | 返回主菜单/关闭页面前发送 `leave` 并 `close()`；联机模式不实例化 SaveManager 自动存档 | FR-27 |
| BR-C-08 | 连接失败：中文提示"无法连接到服务器，请确认服务已启动"并返回主菜单；断线（非主动）："连接已断开"覆盖层 + 只读 | US-16 |
| BR-C-12 | capabilities()：联机 `{hint:false, reset:false, newGame:false}`；ControlBar 据此禁用/隐藏提示、重开、新游戏按钮 | FR-25 / FR-27 |

## FR/US 映射校验
| 需求 | 规则 | 状态 |
|---|---|---|
| FR-15 模式选择 | business-logic-model §2 + frontend-components MenuScene | 对齐 |
| FR-16 免登录（前端配合） | BR-C-08 | 对齐 |
| FR-17 匹配（前端配合） | business-logic-model §2（join 流程） | 对齐 |
| FR-18 权威确认 | BR-C-01/02 | 对齐 |
| FR-19 加入提示 | BR-C-11 | 对齐 |
| FR-20 特效/视觉隔离 | BR-C-03/09 | 对齐 |
| FR-21 笔记（前端配合） | BR-C-04 + 镜像 notes 渲染 | 对齐 |
| FR-22 合作胜利（前端配合） | gameWon 覆盖层（business-logic-model §3） | 对齐 |
| FR-23 旁观（前端配合） | BR-C-06 + 旁观覆盖层 | 对齐 |
| FR-24 共享计时（前端配合） | now-startedAt 本地渲染（business-logic-model §4） | 对齐 |
| FR-25 撤销/提示限制 | BR-C-05/12 | 对齐 |
| FR-26 错填互擦（前端配合） | erase 发 op（BR-C-01），无本地权限预判 | 对齐 |
| FR-27 对局控制限制 | BR-C-07/12 | 对齐 |
| FR-28 断线补位（前端配合） | playerLeft 提示 + 补位者 playerJoined 提示（business-logic-model §3） | 对齐 |
| FR-29 本地回归 | business-logic-model §5 | 对齐 |
| FR-30 在线人数显示 | BR-C-10 | 对齐 |

前端覆盖的 16 个 FR 全部有规则落点，无遗漏。
