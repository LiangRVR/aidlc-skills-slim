# Protocol Summary（unit: shared-protocol）

## 文件清单

| 文件 | 说明 |
|---|---|
| `shared/protocol.ts`（新建） | 协议全部类型 + 信封 + serialize/deserialize + 逐字段校验器（BR-P-01~BR-P-10） |
| `tests/protocol.test.ts`（新建） | example-based 测试 39 例（PBT-10 互补） |
| `tests/generators.ts`（新建） | fast-check 域生成器（集中复用，PBT-07）+ 通用/定向单点变异器 |
| `tests/protocol.pbt.test.ts`（新建） | 属性测试 3 例（P1/P2/P3） |
| `package.json`（改动） | devDependency 新增 `fast-check` ^3.x |
| `tsconfig.json`（改动） | include 增加 `shared` |

## 公共 API

- `PROTOCOL_VERSION = 1`
- 类型：`Op`、`CellEntry`、`PlayerInfo`、`CompletedUnit`、`Snapshot`、`OpResult`、`ClientMessage`（3 种）、`ServerMessage`（8 种）、`ProtocolMessage`、`PlayerId`、`RoomId`
- `serialize(msg: ProtocolMessage): string` — 注入 version + JSON
- `deserialize(raw: string): ProtocolMessage | null` — 五步管线，任意输入不抛异常

## 测试覆盖

| 测试文件 | 用例数 | 内容 |
|---|---|---|
| `tests/protocol.test.ts` | 39 | 11 种消息正例往返、10 种信封反例、9 种 payload 反例、CellEntry 一致性 5 例、Snapshot 3 例等 |
| `tests/protocol.pbt.test.ts` | 3 | P1 往返（PBT-02）、P2 永不抛异常（PBT-03）、P3 单点变异拒绝 oracle（PBT-05） |

## PBT 属性落实对照（testable-properties.md）

| 属性 | 落实 | 状态 |
|---|---|---|
| P1 Round-trip（全 11 种消息） | protocol.pbt.test.ts P1 | 通过 |
| P2 全输入安全（Invariant） | protocol.pbt.test.ts P2（任意字符串 + 任意 JSON 值） | 通过 |
| P3 拒绝正确性（Oracle，单点变异） | protocol.pbt.test.ts P3（7 通用 + 8 定向变异器） | 通过 |
| 生成器质量（PBT-07） | tests/generators.ts 集中式域生成器 | 落实 |
| shrink/种子（PBT-08） | fast-check 默认开启，未禁用 | 落实 |
| example-based 互补（PBT-10） | protocol.test.ts 39 例 | 落实 |

## 验证结果（2026-08-07）
- `npx tsc --noEmit`：0 错误
- `npx vitest run`：**102/102 通过**（既有 60 + 新增 39 example-based + 3 PBT）
- `npm run build`：成功（gzip ~350KB，chunk 警告与第一轮一致，可接受）
