# Component Dependency（Round 4 - 多人版）

## 依赖矩阵

| 组件 | 依赖 | 方式 |
|---|---|---|
| ServerEntry | ws（npm）、ConnectionManager、MessageRouter | 直接调用 |
| ConnectionManager | ws、shared/protocol | 直接调用 |
| MessageRouter | shared/protocol、RoomManager、ConnectionManager | 直接调用 |
| RoomManager | GameRoom、src/core（SudokuGenerator/types） | 直接调用 |
| GameRoom | src/core（GameState/SudokuSolver/RuleValidator/types）、shared/protocol | 直接调用 |
| shared/protocol | 仅 TypeScript 类型（依赖 src/core/types 的 Difficulty） | 纯类型 |
| WebSocketClient | shared/protocol、浏览器 WebSocket API | 直接调用 |
| OnlineGameController | shared/protocol、WebSocketClient、src/core（EventBus/types/BoardSnapshot） | 直接调用 |
| LocalGameController（现有） | src/core（GameState/Generator/SaveManager/EventBus） | 不变 |
| MenuScene | WebSocketClient、shared/protocol | 直接调用 |
| GameScene | IGameController（接口）、BoardView/NumberPad/ControlBar/VfxManager/JoinToast | 构造注入 |
| JoinToast | Phaser | 直接调用 |
| BoardView | Phaser、BoardSnapshot（含 owner） | 不变（数据扩展） |

## 通信模式
- **前端 ↔ 后端**：JSON WebSocket 消息，操作-确认-广播（增量）+ joined 全量快照
- **前端内部**：EventBus 事件驱动（沿用第一轮架构决策），OnlineGameController 与 LocalGameController 对 GameScene 呈现同一接口
- **后端内部**：直接函数调用（单进程），GameRoom 为唯一状态权威

## 数据流
```
[用户输入] -> GameScene -> IGameController
   本地: LocalGameController -> GameState -> EventBus -> UI (不变)
   联机: OnlineGameController -> ws `op` -> GameRoom(权威 GameState)
          -> `opApplied` 广播 -> OnlineGameController 镜像 -> EventBus -> UI
[新玩家] -> ws `join` -> RoomManager 匹配/创建 -> `joined`(Snapshot) + `playerJoined` 广播
```

## 边界约束
- `src/core` 保持不依赖 Phaser、不依赖网络（OnlineGameController 依赖 net，置于 core 之外的编排边界——实现时位于 `src/core/online-game-controller.ts` 但只允许单向依赖 `src/net` 与 `shared`；若评审认为破坏 core 纯净性，可移至 `src/net/` 下，Functional Design 定稿）
- `server/` 可依赖 `src/core` 与 `shared/`；**`src/`（前端）与 `server/` 之间除 `shared/` 外不得互相 import**
- 无循环依赖：方向为 `scenes -> controllers -> (core | net -> shared)`；`server -> (core | shared)`
