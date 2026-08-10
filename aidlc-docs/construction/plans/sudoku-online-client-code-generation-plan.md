# Code Generation Plan - sudoku-online-client

## 单元上下文
- **故事**：US-15、US-19、US-20、US-27、US-29、US-30（主单元）+ US-16/17/18/21/22/23/24/25/26/28 前端配合
- **依赖**：Unit 1（shared/protocol）、Unit 2（sudoku-server，联调对象）；既有单元 sudoku-game（FR-29 回归约束）
- **代码位置**：`src/net/`（新增 2 文件）、`src/ui/`（新增 2 文件 + 改动 2 文件）、`src/core/`（改动 1 文件）、`src/scenes/`（改动 2 文件）、`tests/`（新增）
- **设计依据**：functional-design 五件制品 + nfr-requirements 两件制品（本计划唯一事实源）
- **实施主体**：UI 层（Phaser）开发按全局规则不委派 executor，由主智能体直接实施

## 执行步骤
- [x] Step 1: F1 接口抽取（IGameController + LocalGameController，FR-29 基线 121 全绿确认）
- [x] Step 2: F3 WebSocketClient（src/net/ws-client.ts，含 WsTransport 接口）
- [x] Step 3: F2 OnlineGameController（镜像 + 9 种消息应用 + VFX 隔离 + snapshot owners/you）
- [x] Step 4: F7 BoardView 归属着色（wrong红 > given > 自己蓝 > 对方黑；本地零变化；实施期修订，原"自己黑/对方蓝"作废）
- [x] Step 5: PlayerCountBadge（FR-30）+ JoinToast（F6）+ ui-text.ts 纯函数辅助
- [x] Step 6: ControlBar capabilities 驱动 + newButtonLabel
- [x] Step 7: F4 MenuScene 模式选择（线上/本地、连接失败中文提示；实施期修订为双页滑动：第一屏模式 → 第二屏难度 + 返回）
- [x] Step 8: F5 GameScene 联机适配（双控制器、联机 UI、isReadOnly 阻断、leave+close、无存档）
- [x] Step 9: 测试（client-generators + 11 example + CP-1~4 PBT）+ 协议修订（opApplied + cellIndex，同步 shared/server/tests/docs）
- [x] Step 10: 验证——tsc 0 错误；vitest 136/136（121 基线不破）；vite build 成功；真机联调冒烟归 Build & Test
- [x] Step 11: 生成 client-summary.md（含协议修订记录、CP-1~4 对照、16 故事追踪、FR-29 回归确认）
- [x] Step 12（实施期变更，FR-15/US-15）：MenuScene 双页滑动导航——第一屏模式选择，点击后滑至第二屏难度选择 + 返回按钮 + 连接状态提示；tsc/136 测试/构建通过
- [x] Step 13（实施期变更，FR-20/BR-C-09 修订）：BoardView 归属着色常量对调——自己填数蓝色、对方黑色；tsc/136 测试/构建通过
- [x] Step 14（实施期变更）：start-dev.bat 一键启动脚本 + README/build-instructions 同步
- [x] Step 15（实施期变更）：BoardView 笔记加粗——选中格含数字 N 时，全盘笔记中的 N 加粗显示（与同数字弱高亮联动，本地/联机同效）；tsc/136 测试/构建通过

## 故事追踪
| 故事 | 落点步骤 | 状态 |
|---|---|---|
| US-15 模式选择 | Step 7 | [x] |
| US-16 免登录（前端配合：连接+失败提示） | Step 7/8 | [x] |
| US-17 匹配（前端配合：join 流程） | Step 7/8 | [x] |
| US-18 实时共享（前端配合：镜像渲染） | Step 3/4 | [x] |
| US-19 加入提示 | Step 5/8 | [x] |
| US-20 特效/视觉隔离 | Step 3/4 | [x] |
| US-21 笔记（前端配合） | Step 3/4 | [x] |
| US-22 合作胜利（前端配合：覆盖层） | Step 8 | [x] |
| US-23 旁观（前端配合：锁定） | Step 3/8 | [x] |
| US-24 共享计时（前端配合：now-startedAt） | Step 8 | [x] |
| US-25 撤销/提示限制 | Step 3/6 | [x] |
| US-26 错填互擦（前端配合） | Step 3 | [x] |
| US-27 对局控制限制 | Step 6/8 | [x] |
| US-28 断线补位（前端配合：提示） | Step 8 | [x] |
| US-29 本地回归 | Step 1/10 | [x] |
| US-30 在线人数显示 | Step 5/8 | [x] |
