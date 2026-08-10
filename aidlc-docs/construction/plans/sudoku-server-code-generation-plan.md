# Code Generation Plan - sudoku-server

## 单元上下文
- **故事**：US-16（免登录接入）、US-17（匹配）、US-18（权威状态/广播）、US-21（笔记共享/清除）、US-22（合作胜利）、US-23（独立错误/旁观）、US-24（共享计时）、US-25（撤销仅自己）、US-26（错填互擦）、US-28（断线补位）
- **依赖**：Unit 1（`shared/protocol.ts` 已生成）；`src/core`（GameState/SudokuGenerator/SudokuSolver/RuleValidator/types，既有，不改）
- **代码位置**：`server/`（新建目录）+ `tests/`（既有目录新增文件）；文档 `aidlc-docs/construction/sudoku-server/code/`
- **设计依据**：functional-design 四件制品 + nfr-requirements 两件制品（本计划唯一事实源）

## 执行步骤
- [x] Step 1: 依赖与脚本——`npm i ws`、`npm i -D tsx @types/ws`；package.json 加 `"server": "tsx server/index.ts"`；tsconfig.json include 增加 `server`（保持 strict）
- [x] Step 2: 创建 `server/game-room.ts`——GameRoom/RoomPlayer/MoveRecord；op 裁决管线（BR-S-05）；fill（solution 判定、联动清笔记、completedUnits、独立计数、错满旁观 BR-S-06/07）、erase（BR-S-09）、note 共享 toggle（BR-S-11）、双人独立 undo/redo 栈（BR-S-10）；胜利判定与 gameWon；src/core 复用边界按实施期修订（不复用 GameState 类，复用 types/RuleValidator/SudokuGenerator，见 game-logic §11 修订）；发送经注入的 RoomSender 回调（不依赖 ws，可测试）
- [x] Step 3: 创建 `server/room-manager.ts`——房间注册表；selectRoom 纯函数四级优先级链（BR-S-01/02）；createRoom（SudokuGenerator 生成谜题+solution、startedAt=now，BR-S-04）；reclaimIfEmpty（在线 0 人即回收，BR-S-13）
- [x] Step 4: 创建 `server/connection-manager.ts` 与 `server/message-router.ts`——连接注册/注销、定向发送与房间广播（BR-S-19）；deserialize 分发 join/op/leave；null → error('消息格式非法或版本不兼容')（BR-S-15）
- [x] Step 5: 创建 `server/index.ts`——ServerEntry：ws 监听（默认 8081，env PORT 覆盖，0.0.0.0）；接入即分配 playerId（BR-S-03）；close → removePlayer → playerLeft 广播 + 回收检查（BR-S-12/13）；SIGINT/SIGTERM 优雅关闭
- [x] Step 6: 创建 `tests/server-generators.ts`——arbRoomPool/arbOpScript/arbTwoPlayerScript（PBT-07，复用 tests/generators.ts 协议生成器）
- [x] Step 7: 创建 `tests/game-room.test.ts`——example-based 12 场景
- [x] Step 8: 创建 `tests/room-manager.pbt.test.ts`——SP-1 匹配 Oracle（自实现参考链比对）、SP-5 补位/回收
- [x] Step 9: 创建 `tests/game-room.pbt.test.ts`——SP-2 房间状态机不变量（任意 op 脚本驱动）、SP-3 广播完整性（计数/目标/顺序）、SP-4 undo 隔离性（对方格子差分比对）
- [x] Step 10: 验证——`npx tsc --noEmit` 0 错误；`npx vitest run` 全过（121/121：既有 102 + 12 example + 7 PBT）；`npm run build` 前端构建不回归；`npm run server` 冒烟通过（PORT=8091 监听成功后终止）。PBT 发现并修正 2 个真实缺陷（重复错填幂等、undo 过期快照，见 business-rules BR-S-21/BR-S-10 补充）
- [x] Step 11: 生成 `aidlc-docs/construction/sudoku-server/code/server-summary.md`（文件清单、公共 API、测试覆盖、SP-1~5 落实对照、US 故事追踪 [x]）

## 故事追踪
| 故事 | 落点步骤 | 状态 |
|---|---|---|
| US-16 免登录接入 | Step 5 | [x] |
| US-17 匹配 | Step 3 | [x] |
| US-18 权威状态/广播 | Step 2/4 | [x] |
| US-21 笔记共享/清除 | Step 2 | [x] |
| US-22 合作胜利 | Step 2 | [x] |
| US-23 独立错误/旁观 | Step 2 | [x] |
| US-24 共享计时 | Step 3（startedAt） | [x] |
| US-25 撤销仅自己 | Step 2 | [x] |
| US-26 错填互擦 | Step 2 | [x] |
| US-28 断线补位 | Step 3/5 | [x] |
