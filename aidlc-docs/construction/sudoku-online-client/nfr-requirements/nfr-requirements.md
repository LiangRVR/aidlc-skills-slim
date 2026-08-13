# NFR Requirements（unit: sudoku-online-client，Round 5 修订）

> **Round 5 变更（竞速对抗模式）**：镜像模型 v2（公共字段 + ownNotes 私有镜像 + scores，CP-1 修订）；新增 ScoreBoard（F8，FR-31）与 GameOverOverlay（FR-36~39）；旁观/错 3 判负移除；本地模式零改动回归门禁沿用（FR-29→FR-40）。性能/安全/可用性预算无新增维度。

## 性能
| 项 | 要求 | 来源/理由 |
|---|---|---|
| 端到端同步延迟 | 局域网 < 200ms（操作发起到对端渲染）——客户端段预算：消息应用+重渲染 < 50ms | NFR-8 |
| 镜像应用开销 | 单条 opApplied 应用 + 渲染快照构造 < 5ms（81 格数组复制级操作；v2 新增 ownNotes/分数字段同量级） | NFR-8 推导 |
| 渲染 | 复用既有 BoardView 渲染管线，不引入额外每帧开销；计时显示 1s 间隔更新 | FR-24 |
| ScoreBoard 更新 | 仅随 opApplied.scores 到达时文本刷新（事件驱动，无轮询/每帧开销） | FR-31 / BR-C-13 |

## 可靠性
| 项 | 要求 | 来源/理由 |
|---|---|---|
| 权威一致性 | 本地永不预改棋盘；镜像只被服务端消息修改（BR-C-01/02）——从机制上杜绝双端漂移 | FR-18 |
| 私有笔记镜像一致性 | ownNotes 只被 Snapshot.yourNotes 与私有 notes/clearedNotes 字段修改（BR-C-15，CP-1） | FR-34 |
| 非法消息容忍 | deserialize null 帧忽略 + 警告，不中断对局（含版本不匹配 v1 帧） | shared-protocol v2 |
| 断线处理 | 断线即只读 + 覆盖层；不自动重连（Resiliency opt-out），用户返回主菜单重进；对局中离开由服务端判 forfeit，在局者收 gameOver(reason='forfeit') 展示终局 | Extension Configuration / FR-38 |
| FR-40 回归 | 本地模式行为零变化；既有本地测试全绿为合并门禁 | FR-40 |

## 安全性
| 项 | 要求 | 来源/理由 |
|---|---|---|
| Security Baseline | opt-out（LAN，无认证/加密，明文 ws） | Extension Configuration |
| 输入校验 | 依赖服务端双层校验（BR-P/BR-S）；客户端不做安全敏感决策 | — |
| 作弊面 | solution 不下发；镜像不含 solution；**他人笔记不下发**（快照仅 yourNotes 自己的笔记） | game-logic v2 §3 / FR-34 |
| 私有字段防误用 | opApplied 私有字段（notes/clearedNotes）仅出现在自己副本且只应用于 ownNotes，绝不写入公共棋盘镜像（CP-5 属性化验证） | NFR-10 / BR-C-15 |

## 可维护性 / 可测试性
| 项 | 要求 |
|---|---|
| 测试框架 | Vitest + fast-check（沿用）；前端单测不启真实 ws（内存桩驱动 applyServerMessage） |
| PBT | CP-1~CP-5 落实（testable-properties.md，CP-5 为 v2 新增）；生成器集中 tests/client-generators.ts |
| 依赖边界 | `src/net` → `src/core`/`shared`/`src/ui` 单向无环；`src/` 与 `server/` 之间除 `shared/` 外不得互 import（**v2.2 已落实**：共享类型与纯逻辑模块（rule-validator/sudoku-solver/sudoku-generator）已下沉 shared/，server/shared 对 src/ 零 import） |
| 接口隔离 | GameScene 只依赖 IGameController；本地/联机差异封装在控制器内（FR-40 结构性保障） |

## 可用性 / 可访问性
| 项 | 要求 | 来源 |
|---|---|---|
| 运行形态 | 浏览器访问 vite 页面（本机开发 + LAN）；连接地址 `ws://<页面host>:8081` 自动推导，无需配置 | NFR-7 |
| 浏览器兼容 | 与既有本地模式一致（现代浏览器，原生 WebSocket API） | — |
| 提示文案 | 联机相关错误提示全部中文（连接失败/断开/加入/离开/终局胜负平） | US-31~40 |
