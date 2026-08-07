# Unit of Work Plan（Round 4 - 多人版）

## 目标
将多人版系统分解为可独立开发的工作单元，明确依赖与故事映射，供 CONSTRUCTION 阶段逐单元执行。

## 执行步骤
- [x] Step 1: 生成 `unit-of-work-round4.md`（单元定义与职责）
- [x] Step 2: 生成 `unit-of-work-dependency-round4.md`（单元依赖矩阵与集成方式）
- [x] Step 3: 生成 `unit-of-work-story-map-round4.md`（US-15~US-29 → 单元映射，含跨端故事标注）
- [x] Step 4: 校验单元边界与依赖（无环、协议契约已在 Application Design 冻结）
- [x] Step 5: 校验全部故事已分配（US-01~US-14 标注为"既有单元 sudoku-game，本轮不变"）

## 问题

### Question 1
单元拆分粒度？

A) 双单元：`sudoku-server`（后端全部 + shared 协议）与 `sudoku-online-client`（前端联机改动）——协议契约已在 Application Design 冻结，shared 不需要独立成单元

B) 三单元：`shared-protocol`（协议类型与序列化 + PBT 往返测试）、`sudoku-server`、`sudoku-online-client`——协议先行交付，两端可真正并行

C) 单单元：全部归为一个单元顺序开发

D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 2
单元执行顺序？

A) server 先行，client 随后（client 集成时可用真实后端联调，最稳妥）

B) client 先行（用内存 mock 服务端），server 随后（前端 UI 先可见）

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 3
跨端故事（如 US-15 模式选择、US-17 匹配流程，界面在前端、逻辑在后端）如何映射？

A) 按主要逻辑落点映射到单一单元，映射表中标注"需另一端配合"

B) 拆分为两端各自的部分故事分别映射

C) Other (please describe after [Answer]: tag below)

[Answer]: A
