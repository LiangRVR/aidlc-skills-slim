# Round 4 多人版需求澄清问题（Requirements Verification Questions）

请回答以下问题以澄清多人版数独的需求。在每个问题的 [Answer]: 后填写选项字母；若没有合适选项，选最后一个 "Other" 并在 [Answer]: 后描述你的想法。

## Question 1
后端使用什么技术栈？（前端已是 TypeScript + Vite + npm）

A) Node.js + TypeScript + 原生 ws 库（轻量，依赖少）

B) Node.js + TypeScript + Socket.IO（自带房间/重连/降级轮询）

C) Node.js + JavaScript（不引入 TS 编译）

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
服务端对局状态如何存储？

A) 纯内存存储（进程重启即丢失，最简单，适合演示/原型）

B) 内存 + 定期落盘快照（重启可恢复对局）

C) 数据库（如 SQLite/PostgreSQL）

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
后端部署/运行形态是什么？

A) 本机开发 + 局域网演示即可（同一路由器下两台设备可联机）

B) 需要可部署到公网服务器（陌生人通过互联网匹配）

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
线上对局的胜利如何判定？（数独棋盘由两人共同完成）

A) 棋盘完成即双方共同胜利（合作制，不分胜负）

B) 按各自填对数量计分，棋盘完成时填对多者获胜（竞技制）

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
错误次数（本地版规则：错 3 次判负）在线上对局如何计算？

A) 各自独立计数：一方错满 3 次仅该玩家判负旁观，另一方继续完成棋盘

B) 共享错误池：两人合计错满 3 次，整局判负

C) 一方错满 3 次，整局立即判负

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
计时器在线上对局如何处理？

A) 共享计时：从房间创建开始计时，双方看到同一时钟

B) 各自计时：从各自加入时刻起算

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7
撤销/重做/提示在线上对局中如何表现？

A) 撤销/重做只回退自己的填数与笔记操作；提示可用，作用于共享棋盘

B) 撤销/重做/提示在线上模式全部禁用

C) 撤销/重做可回退双方的操作（共享历史栈）

D) Other (please describe after [Answer]: tag below)

[Answer]: A 提示不可用。

## Question 8
错填的格子（本地版保留并标红）在线上对局中谁能擦除？

A) 谁都可以擦除任何错填的格子（与笔记互相可改一致）

B) 只能擦除自己错填的格子；对方的错填只能由对方擦除

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 9
线上对局中"重开 / 新游戏"按钮的行为？

A) 线上模式禁用重开/新游戏（要玩新局需退出当前房间）

B) 任一玩家点重开，共享棋盘恢复初始，双方都看到

C) 点击仅让自己退出回到主菜单，对局留给对方

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 10
一名玩家中途断线/关闭页面时如何处理？

A) 房间保留，该位置可被新匹配的玩家顶替（规则 6 的持续匹配）

B) 对局立即结束，剩下的一方回到主菜单

C) 短暂等待重连（如 30 秒），超时后按 A 处理

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 11
对方玩家的操作在你界面上的视觉呈现？（规则 8 已定：对方填对不触发你的特效，仅显示数字填入）

A) 对方填入的数字用不同颜色区分（如蓝色），与本地黑色填写区分；错填同样标红

B) 完全不加区分，与对方自己填的一样（黑色）

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 12: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 13: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 14: Resiliency Extensions
Should the resiliency baseline be applied to this project?（源自 AWS Well-Architected 可靠性支柱的设计期最佳实践，只是韧性姿态的初稿，不代表生产就绪保证）

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects)

C) Other (please describe after [Answer]: tag below)

[Answer]: B
