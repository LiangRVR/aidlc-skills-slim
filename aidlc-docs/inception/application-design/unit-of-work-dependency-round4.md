# Unit of Work Dependency（Round 4 - 多人版）

## 依赖矩阵

| 单元 | 依赖 | 类型 | 集成方式 |
|---|---|---|---|
| shared-protocol | `src/core/types`（既有） | 编译期 | 纯类型 import |
| sudoku-server | shared-protocol、`src/core`（既有） | 编译期 | TS import |
| sudoku-online-client | shared-protocol、既有单元 sudoku-game | 编译期 | TS import / 增量改动 |
| sudoku-server ↔ sudoku-online-client | — | **运行期** | WebSocket JSON 消息（契约 = shared-protocol） |

## 依赖图（文本）
```
shared-protocol <---- sudoku-server
shared-protocol <---- sudoku-online-client ----> 既有 sudoku-game（增量，不破坏）
sudoku-server ~~~~ sudoku-online-client  （运行期 WS，契约已冻结）
```

## 协调点
- **协议契约**：component-methods-round4.md 已冻结（ClientMessage 3 种 / ServerMessage 8 种 / Snapshot 模型），两端开发均不得偏离；任何协议变更须同时更新该文档与两端实现
- **核心复用边界**：server 可 import `src/core` 与 `shared/`；前端 `src/` 与 `server/` 之间除 `shared/` 外不得互相 import（component-dependency-round4.md）
- **回归约束**：Unit 3 对既有文件的改动（GameController 接口抽取、MenuScene、GameScene、BoardView）必须通过 FR-29 回归验证

## 执行顺序与测试检查点
1. **Unit 1 shared-protocol**：序列化往返 PBT 全过 → 契约可依赖
2. **Unit 2 sudoku-server**：单测 + 匹配/房间状态 PBT 全过 → 可用真实后端联调
3. **Unit 3 sudoku-online-client**：前端单测 + tsc/build 全过 → 双浏览器联机集成验证（Build and Test 阶段）

无循环依赖；两端编译期仅共享 Unit 1，运行期通过 WS 解耦。
