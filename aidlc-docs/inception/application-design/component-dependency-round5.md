# Component Dependency（Round 5 - 竞速对抗模式）

## 依赖矩阵（Round 5 变更部分）

| 依赖方 | 被依赖方 | 关系 | Round 5 变更 |
|---|---|---|---|
| S5 GameRoom | S6 ScoreEngine | 调用（纯函数） | **新增**：计分/连击结算全部经 ScoreEngine |
| S5 GameRoom | src/core GameState | 持有（权威棋盘） | 不变（core 零改动，Q4=A） |
| S5 GameRoom | H1 Protocol | 消息构造 | 契约 v2：个性化 opApplied、gameOver |
| S4 RoomManager | S5 GameRoom | 编排 | 修订：removePlayer -> finalize('forfeit') |
| S3 MessageRouter | S4/S5 | 分发 | 不变 |
| S2 ConnectionManager | H1 Protocol | 发送 | 不变（send 按 playerId，天然支撑个性化副本） |
| F2 OnlineGameController | H1 Protocol | 消息消费 | 契约 v2：scores/私有字段/gameOver |
| F2 OnlineGameController | F8 ScoreBoard | 驱动 | **新增**：opApplied.scores -> ScoreBoard.update |
| F5 GameScene | F2/F8 | 装配 | 修订：挂载 ScoreBoard、结算覆盖层 |
| F7 BoardView | F2（镜像） | 渲染 | 修订：笔记数据来自私有镜像 |

## 通信模式

- `src` 与 `server` 之间仍仅经 `shared/` 通信（协议 v2）；无环
- 依赖方向不变：`scenes -> controllers -> (core | net -> shared)`；`server -> (core | shared | score-engine)`
- S6 ScoreEngine 不依赖任何组件（纯函数叶子模块），被 S5 单向依赖——PBT 可独立构造

## 数据流（终局示例）

```
A fill correct -> S5.applyOp
  -> S6.applyFillCorrect(A)   // B 的 ScoreState 不受影响（连击不被对手打断）
  -> S5 代清 A/B notesByPlayer
  -> S2.send(A, opApplied{A公共+ A.clearedNotes}) / S2.send(B, opApplied{公共 + B.clearedNotes})
  -> (全盘完成) S5.finalize('completed') -> S2.send(双方, gameOver)
  -> F2 更新镜像+ScoreBoard -> F7 渲染 -> F5 结算覆盖层
```
