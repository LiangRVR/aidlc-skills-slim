# Functional Design Plan - sudoku-server

## 阶段
Functional Design（单元 sudoku-server：US-16、17、18、21、22、23、24、25、26、28，见 unit-of-work-story-map-round4.md）——后端对局服务业务逻辑设计，技术无关，落实 FR-16~FR-28 服务端部分。

## 设计问题与答案（文档回溯，2026-08-07 已定位，无需用户回答）
- Q1（房间生命周期）：gameWon 后房间如何处理？
  [Answer]: **application-design-round4.md §GameRoom 生命周期** —— `won` 为终态：不可加入、继续为在局玩家同步直至其离开；在线玩家数降为 0（playing/won 均可）时 RoomManager 立即回收，内存状态丢弃；无定时清理任务。
- Q2（观战者恢复）：失败观战玩家何时恢复 active？
  [Answer]: **FR-23 + FR-27 + US-27** —— 本局内不恢复（线上无重开/新游戏机制）；恢复途径是离开房间后重新匹配。观战者仍占用房间玩家位（players 含观战者；可加入判定按 players 数量）。
- Q3（服务器形态）：ws 与前端静态文件托管同进程？
  [Answer]: **FR-16 + NFR-7** —— 否。独立后端进程（Node.js + TS + ws，纯内存，本机开发 + 局域网可访问）；前端静态托管不在后端职责内。
- Q4（代码复用）：server 复用 `src/core` 的方式？
  [Answer]: **component-dependency-round4.md / unit-of-work-round4.md** —— 直接 import `src/core`（GameState/Generator/Solver/RuleValidator/types）与 `shared/`；前端 `src/` 与 `server/` 之间除 `shared/` 外不得互相 import。
- Q5（再来一局）：一局结束后房间内重开？
  [Answer]: **FR-27 / US-27** —— 不支持。想玩新局须返回主菜单退出当前房间，再重新匹配。

## 执行步骤
- [x] Step 1: 分析单元上下文——unit-of-work-round4.md、unit-of-work-story-map-round4.md、application-design-round4.md（GameRoom 生命周期）、components/services/component-methods-round4、component-dependency-round4、requirements.md FR-16~28、shared-protocol 设计文档与已生成 shared/protocol.ts
- [x] Step 2: 生成 `aidlc-docs/construction/sudoku-server/functional-design/game-logic.md`——组件编排（ServerEntry/ConnectionManager/MessageRouter/RoomManager/GameRoom）、匹配优先级链流程、join/op/leave/断线处理流、op 裁决管线、GameState 单机语义适配策略（独立错误计数/无 lost/无提示/无重开）、双人 undo/redo 设计、计时
- [x] Step 3: 生成 `aidlc-docs/construction/sudoku-server/functional-design/business-rules.md`——BR-S-01~ 编号规则表 + FR/US 映射
- [x] Step 4: 生成 `aidlc-docs/construction/sudoku-server/functional-design/domain-entities.md`——RoomManager/GameRoom/RoomPlayer/MoveRecord/Connection 实体字段、关系、生命周期
- [x] Step 5: 生成 `aidlc-docs/construction/sudoku-server/functional-design/testable-properties.md`——服务端 PBT 属性（匹配算法不变量、房间状态机不变量、广播完整性、undo 隔离性、断线补位）+ example-based 互补场景
- [x] Step 6: 更新 aidlc-state.md / audit.md（AUD-01~04），present 完成消息并等待批准（APG-01~05）
