# NFR Requirements（unit: sudoku-server）

## 性能
| 项 | 要求 | 来源/理由 |
|---|---|---|
| 端到端同步延迟 | 局域网内操作发起到对端渲染 < 200ms（服务端裁决+广播段预算 < 50ms） | NFR-8 |
| 单房间吞吐 | 2 人房间 op 处理无队列堆积（单 op 裁决 < 5ms，含 solver 比对与广播序列化） | NFR-8 推导 |
| 房间规模 | 单机进程支撑 ≥ 50 个并发房间（LAN 场景远超实际需求） | NFR-7 局域网形态推导 |
| 谜题生成耗时 | 创建房间时生成，expert ≤ 3s（沿用本地模式实测上界）；不阻塞既有房间广播（Node 单线程：生成放同步段可接受，房间创建属低频事件） | src/core 实测 |

## 可靠性
| 项 | 要求 | 来源/理由 |
|---|---|---|
| 状态权威 | 服务端为唯一权威；任何客户端消息不直接改变对局，须经裁决管线（BR-S-05） | FR-18 |
| 异常安全 | 入站处理链路不抛异常导致进程崩溃：deserialize null 路径（BR-S-15）+ 裁决层防御性校验 | BR-S-15 |
| 断线容错 | ws 断开即 removePlayer，房间状态保留、可补位；不丢失棋盘 | FR-28 |
| Resiliency 扩展 | opt-out（aidlc-state.md）：无重连恢复会话、无持久化、无优雅降级承诺 | Extension Configuration |

## 安全性
| 项 | 要求 | 来源/理由 |
|---|---|---|
| Security Baseline | opt-out（LAN 场景，无认证/授权/加密） | Extension Configuration（Q13=B） |
| 畸形输入防御 | 协议层全字段校验（BR-P 系列）+ 裁决层规则校验（BR-S 系列）双层 | BR-P/BR-S |
| 答案保护 | solution 仅存服务端内存，任何消息不下发（防作弊的唯一安全相关规则） | game-logic §3 |
| 传输 | 明文 ws（LAN）；不暴露公网 | NFR-7 |

## 可维护性 / 可测试性
| 项 | 要求 |
|---|---|
| 测试框架 | Vitest + fast-check（沿用根 devDependencies） |
| PBT | SP-1~SP-5 全部落实（testable-properties.md）；种子确定性输出（PBT-08） |
| 测试隔离 | 不依赖真实 ws 端口——以内存 Connection 桩驱动 GameRoom/RoomManager；ws 接入层仅留薄壳集成测试 |
| 类型安全 | strict TS；复用 shared/protocol 类型与 src/core 域类型 |
| 依赖边界 | server 仅 import `src/core` + `shared/`（component-dependency-round4），lint 层面人工审查保证 |

## 可用性 / 可扩展性
| 项 | 要求 | 来源 |
|---|---|---|
| 运行形态 | 单 Node 进程，本机开发 + 局域网可访问（0.0.0.0 监听） | NFR-7（Q3=A） |
| 端口 | 默认 8081，环境变量可覆盖 | components-round4 |
| 存储 | 纯内存，无持久化；进程重启即全部房间丢失（可接受，Q2=A） | NFR-7 |
| 优雅关闭 | SIGINT/SIGTERM 关闭 ws 服务并断开连接（尽力而为，不保证客户端收到通知） | components-round4 |
| 水平扩展 | 不需要（单进程内存态设计前提） | NFR-7 |
