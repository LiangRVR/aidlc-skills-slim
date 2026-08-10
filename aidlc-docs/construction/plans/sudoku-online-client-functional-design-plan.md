# Functional Design Plan - sudoku-online-client

## 阶段
Functional Design（单元 sudoku-online-client：US-15 模式选择、US-19 加入提示、US-20 特效/视觉隔离、US-27 对局控制限制、US-29 本地回归，+ US-16/17/18/21/22/23/24/25/26/28 的前端配合部分，见 unit-of-work-story-map-round4.md）——前端联机能力设计，含 UI 组件设计。

## 设计问题与答案（文档回溯，2026-08-07 已定位）
- Q1（WebSocket 连接地址）：[Answer]: **component-methods-round4 / services-round4** —— `ws://<页面host>:8081`（页面同源主机 + 固定端口；LAN 内访问部署机页面即自动指向其服务器）。
- Q2（OnlineGameController 文件归属）：[Answer]: **application-design-round4 遗留定稿项，本阶段定稿** —— 置于 **`src/net/online-game-controller.ts`**。理由：component-dependency-round4 规定 core 保持不依赖网络；OnlineGameController 依赖 WebSocketClient 与 shared/protocol，放入 core 会引入 core→net 反向依赖，破坏既有纯净性（FR-29 回归约束的结构性保障）。
- Q3（断线 UI 表现）：[Answer]: **services-round4 / components-round4 F5** —— 对方离开显示"对方已离开"提示（US-28 配合）；己方连接失败中文提示（US-16 配合）；对局中断线回到主菜单。
- Q4（镜像状态来源）：[Answer]: **components-round4 F3** —— OnlineGameController 维护镜像棋盘用于渲染；初始状态来自 joined Snapshot；后续仅应用服务端广播（BR-S-16 权威确认语义，本地不预演）。
- Q5（撤销/重做线上行为）：[Answer]: **US-25 / FR-25** —— 前端发送 undo/redo op（不本地执行）；提示按钮禁用；服务端裁决后广播应用。
- Q6（在线人数显示，第五轮变更请求 FR-30/US-30）：[Answer]: **用户变更请求（本会话）** —— 棋盘右上角常驻"在线 n/2"非交互徽标；joined/playerJoined/playerLeft 驱动更新；旁观者不计变化；本地模式不显示。协议与服务端零变更（既有消息足够）。

## 执行步骤
- [x] Step 1: 分析单元上下文——unit-of-work-round4.md Unit 3、components-round4 F1-F7、component-methods-round4 前端方法契约、services-round4 前端编排、component-dependency-round4 依赖边界、RE 文档
- [x] Step 2: 生成 `business-logic-model.md`（控制器双实现、消息应用流、镜像模型、联机会话生命周期）
- [x] Step 3: 生成 `business-rules.md`（BR-C-01~12 + FR/US 映射，16 个前端 FR 全覆盖）
- [x] Step 4: 生成 `domain-entities.md`（IGameController/OnlineGameController/MirrorState/WebSocketClient/BoardSnapshot 扩展/PlayerCountBadge/JoinToast）
- [x] Step 5: 生成 `frontend-components.md`（含 PlayerCountBadge FR-30、JoinToast、MenuScene/GameScene/BoardView/ControlBar 改动、data-testid 约定）
- [x] Step 6: 生成 `testable-properties.md`（CP-1 镜像一致性、CP-2 VFX 隔离、CP-3 capabilities 纯函数、CP-4 人数徽标 + 10 个 example 场景 + FR-29 回归门禁）
- [x] Step 7: 更新 aidlc-state.md / audit.md（AUD-01~04），present 完成消息并等待批准（APG-01~05）
