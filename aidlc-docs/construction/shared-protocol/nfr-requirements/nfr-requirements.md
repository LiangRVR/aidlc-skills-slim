# NFR Requirements（unit: shared-protocol）

**【Round 5 复核】协议升 v2 后本单元 NFR 无实质变更**：消息类型总数 11 → 10（ClientMessage 3 + ServerMessage 7）；序列化/反序列化仍为浅字段纯函数；PBT 方向见 functional-design/testable-properties.md v2（NFR-10）。

## 性能
| 项 | 要求 | 理由 |
|---|---|---|
| 序列化/反序列化开销 | 单条消息 < 1ms（普通桌面级） | 支撑 NFR-8（局域网端到端同步 <200ms），协议层不得成为瓶颈 |
| 内存 | 无状态、无缓存，逐消息处理 | 纯函数设计（BR-P-10） |

## 可靠性
| 项 | 要求 |
|---|---|
| 异常安全 | deserialize 对任意输入不抛异常（BR-P-04），调用方无需防御性 try/catch |
| 错误可见 | 非法消息可区分"格式非法"与"版本不兼容"（error 消息文案区分） |

## 可维护性 / 可测试性
| 项 | 要求 |
|---|---|
| 测试框架 | Vitest（既有项目统一） |
| 属性测试框架 | **fast-check**（PBT-09：支持自定义域生成器、自动 shrink、种子复现、与 Vitest 集成） |
| PBT 运行 | 种子确定性；失败时输出种子与最简反例（PBT-08）；example-based 与 PBT 互补（PBT-10） |
| 类型安全 | strict TypeScript（沿用既有 tsconfig），消息类型全覆盖联合类型 |

## 安全性
- Security Baseline 扩展 opt-out（aidlc-state.md Extension Configuration）
- 本单元无认证/授权职责；输入严格校验（BR-P-01~08）已覆盖畸形消息防御
- solution 不下发属 GameRoom 职责，不在本单元

## 可用性 / 可扩展性
- N/A（纯库，无服务可用性概念；并发由 server 单元负责）
