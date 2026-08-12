# Integration Test Instructions（Round 5 竞速对抗模式修订）

> **执行状态**：自动化 E2E 冒烟 **17/17 PASS（2026-08-12）**；人工浏览器联调 7 场景 **全部通过（2026-08-12 用户确认）**。联调期发现并已修复 3 个缺陷：ScoreBoard 布局重叠（→单行顶部中央）、clearedNotes 粒度缺陷（→协议修正案 v2.1 条目化）、NumberPad 完成计数含错填格（→只计非错填格）；ControlBar 图标按钮试行后应用户要求回滚为文字按钮。

## Purpose
验证三单元（shared-protocol v2 / sudoku-server v2 / sudoku-online-client v2）与既有本地模式的端到端协作。分两层：**自动化 E2E 冒烟**（已执行通过）与**人工浏览器联调**（UI 行为终验）。

## 自动化 E2E 冒烟（scripts/e2e-smoke.ts，v2）

```bash
npm run test:e2e
```

- **Setup**：脚本自动 spawn 真实 server（PORT=8092），创建 3 个 ws 客户端
- **场景与断言**（17 条，全部 PASS，2026-08-12）：
  1. A join → joined（81 格快照）
  2. B 同难度 join → 匹配进同一房间（FR-17 优先级链①）
  3. A 收到 playerJoined
  4. A 发 note op → A 收到 opApplied(result='note')（权威确认）
  5. A 的 note opApplied 携带自己的 notes（BR-C-15）
  6. **B 对 A 的 note 零感知**（笔记私有 FR-34）
  7. B 发 fill op → B 收到 opApplied（correct 或 wrong）
  8. A 收到该 fill 广播（含 cellIndex）
  9. opApplied 携带 scores（FR-31/32）
  10. A fill 预填格 → opRejected('given-cell')
  11. **B 断线 → A 收到 gameOver(reason='forfeit')**（FR-38，取代 v1 playerLeft 继续对局）
  12. forfeit 胜者为在局的 A
  13. C 同难度 join → **进入新房间**（补位已废除，won 房间不可加入）
  14. C 初始 score=0
  15. C 在新房间单人（players.length===1）
  16. C 的快照 yourNotes 不含他人笔记（私有性）
  17. 全流程 deserialize 守卫（非法帧静默忽略）
- **Cleanup**：脚本 finally 中 kill server 进程

## 人工浏览器联调（Build & Test 记录项，v2 对抗场景）

### Setup
```bash
npm run server          # 终端 1
npm run dev             # 终端 2（vite）
```
开两个浏览器标签（或两台 LAN 设备）访问 vite 地址。

### Scenario 1：双人竞速对局基础（US-31~35、FR-31~35）
- **Steps**：标签 1 选"线上游戏"→难度→单人先玩；标签 2 同难度加入；双方交替填数/笔记
- **Expected**：徽标"在线 1/2"→"在线 2/2"+加入 toast；**分数板两行（自己/对方）随每次操作即时更新**：填对 +100、填错 -100（下限 0）；自己填入蓝色、对方黑色、错填红色；**自己的笔记只有自己可见**（对端棋盘无对方笔记痕迹）；双方计时一致

### Scenario 2：连击与错填覆盖（US-32/33、FR-32/33）
- **Steps**：一方连续填对 3 格以上（观察第 3 格起 +120）；对方故意填错一格后，自己用正确值覆盖该格
- **Expected**：连击第 3 次起得分 +120/+120（不递增）；填错或 erase 后连击清零（下一填对回到 +100）；错填格被他人正确值覆盖后**归属转移**（格子变覆盖者颜色，覆盖者得分）

### Scenario 3：终局·填满比分（US-36、FR-36/37）
- **Steps**：双方协作填满棋盘（可刻意拉开分差）
- **Expected**：双方同时弹出终局覆盖层：分高者"你赢了"/分低者"你输了"（平分"平局"）+ 双方最终分数 + 用时 mm:ss + "返回主菜单"按钮；**无"错误 x/3"元素**；终局后输入阻断

### Scenario 4：终局·离开判负（US-38、FR-38）
- **Steps**：对局中（未填满）直接关闭标签 2
- **Expected**：标签 1 弹出终局覆盖层"你赢了"+副标题"对方已离开"+双方当前分数；标签 1 返回主菜单后可正常开新局

### Scenario 5：连接失败（US-16 沿用）
- **Steps**：停掉 server，选"线上游戏"→难度
- **Expected**：菜单显示"无法连接到服务器，请确认服务已启动"，停留菜单

### Scenario 6：对局控制限制与撤销返还（US-25/27 沿用、FR-32）
- **Steps**：线上对局中查看控制区；填对一格后撤销（分数应回落）；填错后撤销（-100 不返还）
- **Expected**：提示/重开禁用；"新游戏"位显示"菜单"；**undo 正确填入返还得分**、**undo 错填不返还扣分**（防穷举）；erase 扣分不可撤销

### Scenario 7：本地模式回归（US-40、FR-40）
- **Steps**：选"本地游戏"完成任意对局流程（含存档续玩、提示、重开、新游戏、错误计数）
- **Expected**：行为与对抗版上线前完全一致（含"错误 x/3"本地显示）；界面无分数板/终局层/人数徽标等联机元素

## Performance（NFR-8，轻量验证）
- **要求**：LAN 内操作发起到对端渲染 < 200ms
- **验证法**：Scenario 1 中一方填数，观察对端棋盘与分数板出现时间（人工感知即时即为达标；量级上 ws 本地回环 <10ms，预算充足）
- **记录**：性能专项测试不适用（LAN 双人对局规模，NFR-7 形态限定）
