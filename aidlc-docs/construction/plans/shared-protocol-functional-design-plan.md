# Functional Design Plan（unit: shared-protocol）

## 目标
为共享消息协议单元完成详细逻辑设计。协议契约（类型与消息全集）已在 Application Design 冻结（component-methods-round4.md），本阶段聚焦：序列化/反序列化逻辑、校验规则、传输域实体、**PBT-01 可测属性识别**。

## 执行步骤
- [x] Step 1: 生成 `business-logic-model.md`（serialize/deserialize 流程、消息分发路径、错误处理流）
- [x] Step 2: 生成 `business-rules.md`（校验规则 BR：类型校验、字段必填、取值范围、未知消息处理）
- [x] Step 3: 生成 `domain-entities.md`（协议传输实体：Op/CellEntry/PlayerInfo/Snapshot/ClientMessage/ServerMessage 的字段与约束）
- [x] Step 4: 生成 `testable-properties.md`（PBT-01：按 7 类属性类别识别可测属性，标记无属性组件）
- [x] Step 5: 一致性校验（与 component-methods-round4.md 契约逐项对齐，US-16/17/18/21 支撑关系）并呈现完成消息；DOC-01 同步：Q2=B 版本信封变更已回写 component-methods-round4.md / application-design-round4.md / components-round4.md

## 问题

### Question 1
`deserialize` 的校验严格度？

A) 逐字段校验：每个消息类型校验字段存在性、类型与取值范围（如 fill.value 必须为 1-9 整数、index 为 0-80），任一不符返回 null——服务端不会被畸形消息带崩，PBT 可生成对抗输入

B) 宽松校验：仅检查 JSON 合法性与 type 白名单，字段缺失/越界由使用方处理

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 2
协议是否带版本标识？

A) 不带版本字段：局域网演示单版本部署，前后端始终同包发布，未知 type 直接拒绝

B) 带 `version` 字段：为后续演进（如对抗性计分版本）预留兼容空间，不一致时拒绝并提示

C) Other (please describe after [Answer]: tag below)

[Answer]: B
