# Integration Test Instructions

> **执行状态（2026-08-10 用户确认）**：人工浏览器联调 6 场景 + 实施期 UI 变更目验（双页菜单、归属配色、笔记加粗）**全部通过**。

## Purpose
验证三单元（shared-protocol / sudoku-server / sudoku-online-client）与既有本地模式的端到端协作。分两层：**自动化 E2E 冒烟**（已执行通过）与**人工浏览器联调**（UI 行为终验）。

## 自动化 E2E 冒烟（scripts/e2e-smoke.ts）

```bash
npm run test:e2e
```

- **Setup**：脚本自动 spawn 真实 server（PORT=8092），创建 3 个 ws 客户端
- **场景与断言**（全部 PASS，2026-08-07 三连跑稳定）：
  1. A join → joined（81 格快照）
  2. B 同难度 join → 匹配进同一房间（FR-17 优先级链①）
  3. A 收到 playerJoined
  4. A 发 note op → A 收到 opApplied（权威确认语义 BR-S-16）
  5. B 收到同一条广播（含 cellIndex，协议修订验证）
  6. A fill 预填格 → opRejected('given-cell')
  7. B 断线 → A 收到 playerLeft（FR-28）
  8. C 同难度 join → 补位进同一房间，mistakes=0
  9. C 的快照含 A 的笔记（棋盘状态保留）
- **Cleanup**：脚本 finally 中 kill server 进程

## 人工浏览器联调（Build & Test 记录项）

### Setup
```bash
npm run server          # 终端 1
npm run dev             # 终端 2（vite）
```
开两个浏览器标签（或两台 LAN 设备）访问 vite 地址。

### Scenario 1：双人完整协作对局（US-15~22、US-24、US-30）
- **Steps**：标签 1 选"线上游戏"→难度→单人先玩；标签 2 同难度加入；双方交替填数/笔记至完成
- **Expected**：标签 1 右上角"在线 1/2"→ 标签 2 加入后双方变"在线 2/2"且有"有玩家加入"toast；自己填数蓝色、对方填数黑色、错填红色；双方计时一致；填满后双方同时看到胜利覆盖层与相同用时

### Scenario 2：旁观（US-23）
- **Steps**：标签 1 故意填错 3 次
- **Expected**：标签 1 显示旁观横幅且输入被阻断；标签 2 收到"对方已旁观"toast 可继续对局；人数徽标保持 2/2

### Scenario 3：断线补位（US-28）
- **Steps**：对局中关闭标签 2；标签 1 继续；再开标签 3 同难度加入
- **Expected**：标签 1 显示"对方已离开"+徽标变 1/2；标签 3 补位从当前棋盘继续、错误 0/3；标签 1 徽标回 2/2 并提示"有玩家加入"

### Scenario 4：连接失败（US-16）
- **Steps**：停掉 server，选"线上游戏"→难度
- **Expected**：菜单显示"无法连接到服务器，请确认服务已启动"，停留菜单

### Scenario 5：对局控制限制（US-25/27）
- **Steps**：线上对局中查看控制区；点撤销
- **Expected**：提示/重开按钮禁用；"新游戏"位显示"菜单"并正常退出房间；撤销仅回退自己的操作；无提示按钮可用

### Scenario 6：本地模式回归（US-29/FR-29）
- **Steps**：选"本地游戏"完成任意对局流程（含存档续玩、提示、重开、新游戏）
- **Expected**：行为与多人版上线前完全一致；界面无人数徽标/toast 等联机元素

## Performance（NFR-8，轻量验证）
- **要求**：LAN 内操作发起到对端渲染 < 200ms
- **验证法**：Scenario 1 中一方填数，观察对端出现时间（人工感知即时即为达标；量级上 ws 本地回环 <10ms，预算充足）
- **记录**：性能专项测试不适用（LAN 双人对局规模，NFR-7 形态限定）
