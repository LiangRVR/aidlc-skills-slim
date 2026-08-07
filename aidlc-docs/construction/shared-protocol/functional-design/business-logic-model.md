# Business Logic Model（unit: shared-protocol）

## 职责边界
协议单元只做三件事：**定义**消息类型、**序列化**出站消息、**反序列化+校验**入站消息。不含任何游戏逻辑。

## 消息信封
所有线上消息统一信封（functional-design Q2=B 决策，契约变更）：

```json
{ "version": 1, "type": "<message-type>", "payload": { ... } }
```

- `version`: 整数，当前恒定 `1`（PROTOCOL_VERSION）
- 序列化时由 serialize 自动注入；反序列化时校验
- 版本不一致 → 拒绝（deserialize 返回 null，由调用方回复 `error` 消息提示版本不兼容）

## serialize 流程
```
serialize(msg: ClientMessage | ServerMessage): string
  -> 构造信封 { version: PROTOCOL_VERSION, type, payload }
  -> JSON.stringify
  -> 返回文本帧（ws send 直接使用）
```
- 纯函数，无状态，无副作用
- TypeScript 类型保证出站消息结构合法（编译期约束），运行期不再校验出站

## deserialize 流程（逐字段严格校验，Q1=A）
```
deserialize(raw: string): ClientMessage | ServerMessage | null
  1. JSON.parse —— 解析失败 -> null（不抛出）
  2. 信封校验：version 为整数且 == PROTOCOL_VERSION；type 为字符串且在白名单；payload 为对象 -> 否则 null
  3. 按 type 逐字段校验 payload（见 business-rules.md 各消息字段规则）
     - 任一字段缺失/类型错误/取值越界 -> null
  4. 全部通过 -> 返回强类型消息对象
```

## 错误处理流
- deserialize 返回 null 时，**接收方**负责处理：
  - 服务端 MessageRouter：回复 `{version, type:'error', payload:{message:'消息格式非法或版本不兼容'}}`
  - 前端 WebSocketClient：忽略该帧并记录警告（不中断对局）
- deserialize 对任何输入（非字符串、空串、二进制、超大文本）都不抛出异常——调用方无需 try/catch

## 消息分发路径（与本单元的衔接）
```
前端: op 意图 -> serialize -> ws ----> 服务端: deserialize -> MessageRouter -> RoomManager/GameRoom
服务端: 事件 -> serialize -> ws ----> 前端: deserialize -> OnlineGameController.applyServerMessage
```
