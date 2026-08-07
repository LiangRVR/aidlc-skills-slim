# AGENTS.md - 数独项目（aidlc-skills 工作区）

## AI-DLC 工作流约定

本项目通过 `aidlc-workflows` skill 驱动开发，制品文档全部在 `aidlc-docs/`。

### 工作流规范扩展（文档一致性 / 审批门禁 / 审计署名）

以下三组规则已合并为单个 skill 强制扩展（无 opt-in 文件，按 skill 约定始终强制加载执行），定义见：

`.agents/skills/aidlc-workflows/references/extensions/workflow/workflow-conventions/workflow-conventions.md`

- **DOC-01~05 文档一致性**：每个变更请求执行变更→文档影响分析 + 同交互计划同步 + 完成验证含文档 grep；历史记录 append-only。
- **APG-01~05 审批门禁**：仅批准词（同意/批准/好的/approve/ok 等）= 批准并暂停并提示是否继续；继续词（继续/下一步/continue/go on 等）= 批准并进入下一阶段。
- **AUD-01~04 审计署名**：audit.md 每条新记录附 `**User**` / `**Email**`（git config 动态解析，取不到写 `unknown`），历史条目不追溯。
