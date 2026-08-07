# AGENTS.md - 数独项目（aidlc-skills 工作区）

## AI-DLC 工作流约定

本项目通过 `aidlc-workflows` skill 驱动开发，制品文档全部在 `aidlc-docs/`。

### 文档一致性检查

每个变更请求必须执行文档一致性检查（变更→文档影响分析 + 计划同步 + 完成验证含文档 grep）。该规则已固化为 skill 的强制扩展，定义见：

`.agents/skills/aidlc-workflows/references/extensions/documentation/doc-consistency/doc-consistency.md`

（DOC-01~DOC-05，无 opt-in 文件，按 skill 约定始终强制加载执行。）
