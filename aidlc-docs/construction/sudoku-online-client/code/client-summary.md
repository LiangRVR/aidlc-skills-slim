# Client Summary（unit: sudoku-online-client）

## 文件清单

### 新建
| 文件 | 说明 |
|---|---|
| `src/net/ws-client.ts` | F3：WsTransport 接口 + WebSocketClient（connect/send/onMessage/onClose/close；非法帧忽略+警告；连接失败 reject） |
| `src/net/online-game-controller.ts` | F2：OnlineGameController（IGameController 实现；MirrorState；9 种消息应用；VFX 隔离派发；错误计数镜像含 undo 返还启发式；voluntaryClose 区分主动离开） |
| `src/ui/player-count-badge.ts` | FR-30：PlayerCountBadge（"在线 n/2"，右上角，非交互） |
| `src/ui/join-toast.ts` | F6：JoinToast（show，~3s 淡出，单实例替换） |
| `src/ui/ui-text.ts` | 纯文本辅助（formatPlayerCount），无 Phaser 依赖可单测 |
| `tests/client-generators.ts` | WsStub/makeController/makeSnapshot/arbOpAppliedStream（PBT-07） |
| `tests/online-game-controller.test.ts` | 11 个 example 场景 |
| `tests/online-game-controller.pbt.test.ts` | CP-1/CP-2/CP-3/CP-4 |

### 改动
| 文件 | 说明 |
|---|---|
| `src/core/game-controller.ts` | F1：抽取 IGameController + ControllerCapabilities；GameController → LocalGameController（+isReadOnly/capabilities，行为零变化） |
| `src/core/types.ts` | EVENTS 追加（VFX_CORRECT/VFX_WRONG/CONNECTION_LOST/ONLINE_*/ERROR_MESSAGE，纯增量） |
| `src/main.ts` | 使用 LocalGameController |
| `src/ui/board-view.ts` | F7：BoardSnapshot 可选 owners/you；着色 wrong红 > given > owner===you蓝 > 对方黑 > 既有 COLOR_USER（本地无 owners 走原路径，零变化；实施期修订，原"自己黑/对方蓝"作废）；选中格含数字 N 时全盘笔记中的 N 加粗（实施期变更） |
| `src/ui/control-bar.ts` | capabilities 驱动 hint/reset 禁用；newButtonLabel 可覆写（联机"菜单"）；本地默认不变 |
| `src/scenes/menu-scene.ts` | F4：双页滑动导航——page1 本地/线上模式选择，点击后滑至 page2（四档难度 + 返回）；线上→连接 `ws://<location.hostname>:8081`→失败中文提示停留 page2；online→local 返回时重建 LocalGameController |
| `src/scenes/game-scene.ts` | F5：双控制器适配（renderLocal 原逻辑原样保留）；联机：Badge/Toast/旁观横幅/断线覆盖层/胜利覆盖层（wonElapsed）/isReadOnly 阻断/leave+close/无存档/计时 now-startedAt/完成数字禁用基于镜像 |
| `shared/protocol.ts` | **协议修订**：opApplied payload 增加 `cellIndex`（undo/redo 无 op.index，客户端无法定位变更格——Unit 3 实施期发现） |
| `server/game-room.ts` | 7 处 opApplied 广播补 cellIndex |
| `tests/protocol.test.ts`、`tests/generators.ts` | 同步 cellIndex |

## 协议修订记录（DOC-01 同步）
- **opApplied + cellIndex**（整数 0-80，必填校验）：发现于镜像应用设计落地时——undo/redo 消息的 op 无 index，CellEntry 亦无 index，客户端无法应用变更。同步更新：shared/protocol.ts 类型与校验、server 广播、协议测试与生成器。设计文档同步：见下方"文档一致性"。

## 测试覆盖与验证（2026-08-07）
- `npx tsc --noEmit`：0 错误
- `npx vitest run`：**136/136**（121 基线全绿=FR-29 回归确认 + 11 example + 4 PBT）
- `npm run build`：成功
- CP-1 镜像一致性 / CP-2 VFX 隔离 / CP-3 capabilities 纯函数 / CP-4 人数徽标：全部通过
- 真机联调冒烟（server + vite 双浏览器标签）属 Build & Test 阶段集成验证，本阶段未执行

## 故事追踪
| 故事 | 落点 | 状态 |
|---|---|---|
| US-15 模式选择 | menu-scene.ts | 实现 |
| US-16 免登录（前端配合） | menu-scene 连接+失败提示 | 实现 |
| US-17 匹配（前端配合） | join 流程 | 实现 |
| US-18 实时共享（前端配合） | online-game-controller 镜像 + board-view | 实现（CP-1） |
| US-19 加入提示 | join-toast.ts | 实现 |
| US-20 特效/视觉隔离 | VFX 隔离派发 + 归属着色 | 实现（CP-2） |
| US-21 笔记（前端配合） | noteMode 本地态 + 镜像 notes | 实现（场景 9/11） |
| US-22 合作胜利（前端配合） | gameWon 覆盖层 | 实现（场景 6） |
| US-23 旁观（前端配合） | isReadOnly + 旁观横幅 | 实现（场景 4、CP-3） |
| US-24 共享计时（前端配合） | now-startedAt | 实现 |
| US-25 撤销/提示限制 | op 转发 + capabilities | 实现（场景 9、CP-3） |
| US-26 错填互擦（前端配合） | erase op 无本地预判 | 实现 |
| US-27 对局控制限制 | capabilities + 菜单按钮离开 | 实现 |
| US-28 断线补位（前端配合） | playerLeft/Joined Toast + 断线覆盖层 | 实现（场景 5/7） |
| US-29 本地回归 | 121 基线全绿 + renderLocal 原样 | 实现（FR-29 门禁通过） |
| US-30 在线人数显示 | player-count-badge.ts | 实现（CP-4） |
