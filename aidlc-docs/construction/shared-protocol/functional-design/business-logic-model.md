# Business Logic Model（unit: shared-protocol）— 协议 v2（Round 5 重写）

## 职责边界
协议单元只做三件事：**定义**消息类型、**序列化**出站消息、**反序列化+校验**入站消息。不含任何游戏逻辑（计分、连击、权限均在服务端单元）。

## 消息信封（v2）
```json
{ "version": 2, "type": "<message-type>", "payload": { ... } }
```
- `version`: 整数，当前恒定 `2`（PROTOCOL_VERSION，Application Design Q1=A）
- 序列化时由 serialize 自动注入；反序列化时校验
- 版本不一致（含 v1 帧）→ 拒绝（deserialize 返回 null，由调用方回复 `error` 消息提示版本不兼容）

## serialize 流程
```
serialize(msg: ClientMessage | ServerMessage): string
  -> 构造信封 { version: PROTOCOL_VERSION, type, payload }
  -> JSON.stringify
  -> 返回文本帧（ws send 直接使用）
```
- 纯函数，无状态，无副作用
- TypeScript 类型保证出站消息结构合法（编译期约束），运行期不再校验出站
- **个性化副本**：同一逻辑事件的两个 opApplied 变体（含/不含各自 clearedNotes）在**服务端**组装为两个 ServerMessage 分别 serialize；协议单元对此无感知（Q5=A 的承载在服务端单元，协议只保证两类变体均合法）

## deserialize 流程（逐字段严格校验，Q1=A 语义保留）
```
deserialize(raw: string): ClientMessage | ServerMessage | null
  1. JSON.parse —— 解析失败 -> null（不抛出）
  2. 信封校验：version 为整数且 == 2；type 为字符串且在白名单；payload 为对象 -> 否则 null
  3. 按 type 逐字段校验 payload（见 business-rules.md）
     - v2 关键校验：CellEntry 严格白名单（含 notes 即拒绝）；opApplied 出席矩阵 BR-P-12；
       yourNotes BR-P-11；scores BR-P-13；gameOver BR-P-15
     - 任一字段缺失/类型错误/取值越界/白名单外字段 -> null
  4. 全部通过 -> 返回强类型消息对象
```

## 错误处理流——与 v1 相同
- 服务端 MessageRouter：deserialize 返回 null → 回复 `{version:2, type:'error', payload:{message:'消息格式非法或版本不兼容'}}`，连接不主动断开
- 前端 WebSocketClient：忽略该帧并记录警告（不中断对局）
- deserialize 对任何输入不抛出异常

## 消息分发路径（与本单元的衔接）
```
前端: op 意图 -> serialize -> ws ----> 服务端: deserialize -> MessageRouter -> RoomManager/GameRoom
服务端: 事件/个性化副本 -> serialize -> ws ----> 前端: deserialize -> OnlineGameController.applyServerMessage
```

## v1 → v2 迁移要点（供 server/client 单元参考）
| v1 | v2 |
|---|---|
| CellEntry.notes | 移除；笔记走 Snapshot.yourNotes + opApplied.notes/clearedNotes |
| PlayerInfo.mistakes/spectating | 移除；PlayerInfo.score 新增 |
| playerLost / gameWon | 移除；gameOver{winnerId, reason, scores, elapsedSeconds} |
| opApplied 全房间同一份 | 个性化副本（公共 + 私有字段） |
