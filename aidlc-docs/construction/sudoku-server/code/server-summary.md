# Server Summary（unit: sudoku-server）

## 文件清单

| 文件 | 说明 |
|---|---|
| `server/game-room.ts`（新建） | GameRoom/RoomPlayer/MoveRecord：权威棋盘 CellEntry[81]、op 裁决管线（fill/erase/note/undo/redo）、独立错误计数与旁观、过期快照语义的 undo/redo、胜利判定、joined/playerJoined/playerLeft/gameWon 事件生成 |
| `server/room-manager.ts`（新建） | selectRoom 纯函数四级匹配链（BR-S-01/02）+ RoomManager 注册表/创建/回收（BR-S-13） |
| `server/connection-manager.ts`（新建） | 连接注册/注销、定向发送、playerId↔roomId 关联 |
| `server/message-router.ts`（新建） | deserialize 分发 join/op/leave；非法帧 error（BR-S-15）；断线=leave+回收检查 |
| `server/index.ts`（新建） | ServerEntry：ws 0.0.0.0 监听（env PORT，默认 8081）、接入即分配 playerId（crypto.randomUUID）、SIGINT/SIGTERM 优雅关闭 |
| `tests/server-generators.ts`（新建） | 固定测试谜题 + 发送录制器 + makeRoom + fast-check 生成器（arbRoomPool/arbOpOn/arbOpScript/arbTwoPlayerScript，PBT-07） |
| `tests/game-room.test.ts`（新建） | example-based 12 场景（PBT-10） |
| `tests/room-manager.pbt.test.ts`（新建） | SP-1 匹配 Oracle、SP-5 补位/回收谓词层 |
| `tests/game-room.pbt.test.ts`（新建） | SP-2 房间不变量、SP-3 广播完整性、SP-4 undo 隔离 + 笔记返还 |
| `package.json`（改动） | +dependencies ws ^8.21.3；+devDependencies tsx/@types/ws；+script `"server": "tsx server/index.ts"` |
| `tsconfig.json`（改动） | include 增加 `server` |

## PBT 发现并已修正的真实缺陷（2026-08-07）

1. **重复错填重复计错**（SP-2 发现）：对自己的 wrong 格重复提交相同值曾被当作新错误再次计数——违反幂等语义（网络重复帧/重试会双倍惩罚），且与单机同值忽略语义不一致。修正：同值重复提交 → `opRejected('no-op')`（BR-S-21 补充）。
2. **undo 快照过期覆盖对方格子**（SP-4 发现）：A 撤销自己的笔记操作时，若该格此后被 B 填入，旧的快照恢复会覆盖 B 的格子。修正：undo/redo 执行前对比当前格与 after/before 快照，不一致则按过期记录跳过恢复（丢弃记录、照常广播、不计数变更）；联动笔记恢复/清除仅作用于仍为空格的格子（BR-S-10 补充）。

## 测试覆盖

| 测试文件 | 用例数 | 内容 |
|---|---|---|
| tests/game-room.test.ts | 12 | PBT-10 互补场景全覆盖 |
| tests/room-manager.pbt.test.ts | 3 | SP-1 + SP-5（2 项） |
| tests/game-room.pbt.test.ts | 4 | SP-2、SP-3、SP-4（2 项） |

## 验证结果（2026-08-07）
- `npx tsc --noEmit`：0 错误
- `npx vitest run`：**121/121 通过**（既有 102 + 新增 12 example + 7 PBT）
- `npm run build`：前端构建成功不回归（server 不进 vite bundle）
- `npm run server` 冒烟：PORT=8091 启动成功打印监听地址，进程终止干净

## 故事追踪（unit-of-work-story-map-round4）
| 故事 | 落点 | 状态 |
|---|---|---|
| US-16 免登录接入 | index.ts playerId 分配 | 实现 |
| US-17 开局与匹配 | room-manager.ts selectRoom | 实现（SP-1 PBT） |
| US-18 实时状态共享 | game-room.ts 裁决 + 广播 | 实现（SP-3 PBT） |
| US-21 笔记共享/清除 | game-room.ts note/联动清除 | 实现（场景 12） |
| US-22 合作胜利 | game-room.ts isComplete→gameWon | 实现（场景 1/2） |
| US-23 独立错误/旁观 | RoomPlayer.mistakes/spectating | 实现（场景 3、SP-2） |
| US-24 共享计时 | startedAt + gameWon.elapsedSeconds | 实现 |
| US-25 撤销仅自己 | 独立栈 + 过期语义 | 实现（SP-4 PBT） |
| US-26 错填互擦 | erase 权限 BR-S-09 | 实现（场景 4/5） |
| US-28 断线补位 | removePlayer/reclaim/matchRoom | 实现（场景 6/7、SP-5） |
