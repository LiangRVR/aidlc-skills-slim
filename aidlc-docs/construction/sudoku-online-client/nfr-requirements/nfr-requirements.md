# NFR Requirements（unit: sudoku-online-client）

## 性能
| 项 | 要求 | 来源/理由 |
|---|---|---|
| 端到端同步延迟 | 局域网 < 200ms（操作发起到对端渲染）——客户端段预算：消息应用+重渲染 < 50ms | NFR-8 |
| 镜像应用开销 | 单条 opApplied 应用 + 渲染快照构造 < 5ms（81 格数组复制级操作） | NFR-8 推导 |
| 渲染 | 复用既有 BoardView 渲染管线，不引入额外每帧开销；计时显示 1s 间隔更新 | FR-24 |

## 可靠性
| 项 | 要求 | 来源/理由 |
|---|---|---|
| 权威一致性 | 本地永不预改棋盘；镜像只被服务端消息修改（BR-C-01/02）——从机制上杜绝双端漂移 | FR-18 |
| 非法消息容忍 | deserialize null 帧忽略 + 警告，不中断对局 | shared-protocol 设计 |
| 断线处理 | 断线即只读 + 覆盖层；不自动重连（Resiliency opt-out），用户返回主菜单重进 | Extension Configuration |
| FR-29 回归 | 本地模式行为零变化；既有 121 测试全绿为合并门禁 | FR-29 |

## 安全性
| 项 | 要求 | 来源/理由 |
|---|---|---|
| Security Baseline | opt-out（LAN，无认证/加密，明文 ws） | Extension Configuration（Q13=B） |
| 输入校验 | 依赖服务端双层校验（BR-P/BR-S）；客户端不做安全敏感决策 | — |
| 作弊面 | solution 不下发（服务端规则）；镜像不含 solution | game-logic §3 |

## 可维护性 / 可测试性
| 项 | 要求 |
|---|---|
| 测试框架 | Vitest + fast-check（沿用）；前端单测不启真实 ws（内存桩驱动 applyServerMessage） |
| PBT | CP-1~CP-4 落实（testable-properties.md）；生成器集中 tests/client-generators.ts |
| 依赖边界 | `src/net` → `src/core`/`shared`/`src/ui` 单向无环；`src/` 与 `server/` 之间除 `shared/` 外不得互 import（component-dependency-round4） |
| 接口隔离 | GameScene 只依赖 IGameController；本地/联机差异封装在控制器内 |

## 可用性 / 可访问性
| 项 | 要求 | 来源 |
|---|---|---|
| 运行形态 | 浏览器访问 vite 页面（本机开发 + LAN）；连接地址 `ws://<页面host>:8081` 自动推导，无需配置 | Q1 / NFR-7 |
| 浏览器兼容 | 与既有本地模式一致（现代浏览器，原生 WebSocket API） | — |
| 提示文案 | 联机相关错误提示全部中文（连接失败/断开/加入/离开） | US-16/19/28 |
