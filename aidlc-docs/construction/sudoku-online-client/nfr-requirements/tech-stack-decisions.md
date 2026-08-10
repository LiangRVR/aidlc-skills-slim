# Tech Stack Decisions（unit: sudoku-online-client）

| 技术 | 版本 | 决策理由 |
|---|---|---|
| 原生浏览器 WebSocket API | 平台内置 | 协议为 JSON 文本帧（shared/protocol），无需客户端 ws 库；零新增运行时依赖 |
| TypeScript | ^5.5.4（沿用） | 既有统一 |
| Phaser | ^3.85.0（沿用） | PlayerCountBadge/JoinToast/覆盖层复用既有 GameObject 体系 |
| Vitest + fast-check | 沿用 devDependencies | CP-1~CP-4 属性测试（PBT-09 已落实） |

## 零新增依赖声明
本单元**不引入任何新的 dependency 或 devDependency**。联机能力全部由：原生 WebSocket + shared/protocol（单元 1）+ 既有 Phaser/Vite 技术栈构成。

## 不引入的技术（记录排除理由）
- **socket.io-client**：需要服务端配套，且服务端已定原生 ws（NFR-7）；其自动重连/房间语义与自有 Resiliency opt-out 决策不符
- **axios / fetch 封装**：无 HTTP 通信
- **状态管理库（zustand/redux 等）**：镜像状态单一持有于 OnlineGameController，规模无需外部状态库
- **Phaser 测试框架（如 phaser3spectorjs）**：组件逻辑与渲染分离（setCount/快照构造纯 TS 可测），UI 单测不启动 WebGL

## PBT-09 合规声明
- [x] fast-check 已在 devDependencies（单元 1 落实），本单元直接复用
- [x] 自定义生成器集中 tests/client-generators.ts（复用 tests/generators.ts 协议消息生成器）
