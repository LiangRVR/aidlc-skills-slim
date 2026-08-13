# 单元生成（Units Generation）- 详细步骤

## 概述
本阶段通过两个集成部分将系统分解为可管理的工作单元：
- **第 1 部分 - 规划（Planning）**：创建带问题的分解计划、收集答案、分析歧义、获得批准
- **第 2 部分 - 生成（Generation）**：执行已批准的计划以生成单元制品

**定义（DEFINITION）**：工作单元（unit of work）是为开发目的而对用户故事进行的逻辑分组。对于微服务，每个单元成为一个可独立部署的服务。对于单体应用，单一单元代表包含逻辑模块的整个应用程序。

**术语（Terminology）**：使用"服务（Service）"指代可独立部署的组件，"模块（Module）"指代服务内的逻辑分组，"工作单元（Unit of Work）"用于规划上下文。

## 前置条件
- 工作区检测（Workspace Detection）必须已完成
- 建议先完成需求分析（Requirements Analysis）（提供功能范围）
- 建议先完成用户故事（User Stories）（故事映射到单元）
- 应用程序设计（Application Design）阶段为必需（决定组件、方法和服务）
- 执行计划必须指明应执行设计（Design）阶段

---

# 第 1 部分：规划（PLANNING）

## 步骤 1：创建工作单元计划（Unit of Work Plan）
- 生成带有复选框 [] 的、将系统分解为工作单元的计划
- 聚焦于将系统拆分为可管理的开发单元
- 每个步骤和子步骤都应有一个复选框 []

## 步骤 2：在计划中包含强制性的单元制品
**始终**在单元计划中包含以下强制性制品：
- [ ] 生成 `aidlc-docs/inception/application-design/unit-of-work.md`，包含单元定义与职责
- [ ] 生成 `aidlc-docs/inception/application-design/unit-of-work-dependency.md`，包含依赖矩阵
- [ ] 生成 `aidlc-docs/inception/application-design/unit-of-work-story-map.md`，将故事映射到单元
- [ ] **仅 greenfield 项目**：在 `unit-of-work.md` 中记录代码组织策略（结构模式参见 code-generation.md）
- [ ] 验证单元边界与依赖
- [ ] 确保所有故事都已分配到单元

## 步骤 3：生成上下文相关的问题
**指令（DIRECTIVE）**：彻底分析需求、故事和应用程序设计，识别所有通过澄清能够改进单元分解质量的领域。主动提出问题，确保对分解关注点的全面覆盖。

**关键（CRITICAL）**：当存在任何可能影响单元边界或分解质量的歧义或缺失细节时，默认提出问题。宁可多问问题，也不要对系统应如何分解做出错误假设。

**强制（MANDATORY）**：通过对每个类别提出针对性的问题来评估以下所有类别。对于每个类别，基于需求、故事和应用程序设计中的证据确定其适用性——没有明确理由不要跳过任何类别：

- 使用 [Answer]: 标签格式嵌入问题
- 聚焦于任何歧义、缺失信息或需要澄清的领域
- 在用户输入能够改进分解决策的地方生成问题
- **当不确定时，提出问题**——过度自信会导致糟糕的单元边界

**要评估的问题类别**（考虑所有类别）：
- **故事分组（Story Grouping）** - 询问分组策略、故事亲缘性和逻辑聚类方法
- **依赖（Dependencies）** - 询问集成方法、共享资源和单元间通信模式
- **团队对齐（Team Alignment）** - 询问团队结构、所有权边界和协作模式
- **技术考虑（Technical Considerations）** - 询问可能因单元而异的可扩展性/部署需求
- **业务领域（Business Domain）** - 询问领域边界、限界上下文和业务能力对齐
- **代码组织（仅 greenfield 多单元项目）（Code Organization (Greenfield multi-unit only)）** - 询问部署模型和目录结构偏好

## 步骤 4：存储 UOW 计划
- 保存为 `aidlc-docs/inception/plans/unit-of-work-plan.md`
- 包含所有供用户输入的 [Answer]: 标签
- 确保计划覆盖系统分解的所有方面

## 步骤 5：请求用户输入
- 请用户直接在计划文档中填写 [Answer]: 标签
- 强调分解决策的重要性
- 提供完成 [Answer]: 标签的清晰说明

## 步骤 6：收集答案
- 等待用户使用文档中的 [Answer]: 标签回答所有问题
- 在所有 [Answer]: 标签完成之前不得继续
- 检查文档以确保没有留空的 [Answer]: 标签

## 步骤 7：分析答案（强制）
在继续之前，你必须仔细检查所有用户答案，查找：
- **模糊或含混的回复**："混合"、"介于两者之间"、"不确定"、"取决于"
- **未定义的标准或术语**：引用了没有明确定义的概念
- **相互矛盾的答案**：彼此冲突的回复
- **缺失的生成细节**：缺乏具体指导的答案
- **合并选项的答案**：在没有明确决策规则的情况下合并不同方法的回复

## 步骤 8：强制性的后续问题
如果第 7 步的分析揭示了任何模糊的答案，你必须：
- 使用 [Answer]: 标签在计划文档中添加具体的后续问题
- 在所有歧义解决之前，不要进入批准环节
- 所需后续问题的示例：
  - "你提到'A 和 B 的混合'——应由什么具体标准来决定何时使用 A 而非 B？"
  - "你说'介于 A 和 B 之间'——你能定义确切的中间方案吗？"
  - "你表示'不确定'——什么额外信息能帮助你做出决定？"
  - "你提到'取决于复杂度'——你如何定义复杂度级别？"

## 步骤 9：请求批准
- 询问："**工作单元计划已完成。请审阅 aidlc-docs/inception/plans/unit-of-work-plan.md 中的计划。准备继续生成吗？**"
- 在用户确认之前不得继续

## 步骤 10：记录审批
- 在 audit.md 中记录带时间戳的提示与回复
- 使用 ISO 8601 时间戳格式
- 包含完整的审批提示文本

## 步骤 11：更新进度
- 在 aidlc-state.md 中将单元生成第 1 部分（规划）标记为完成
- 更新"当前状态"（Current Status）部分
- 为过渡到单元生成第 2 部分（生成）做准备

---

# 第 2 部分：生成（GENERATION）

## 步骤 12：加载工作单元计划
- [ ] 从 `aidlc-docs/inception/plans/unit-of-work-plan.md` 读取完整计划
- [ ] 识别下一个未完成的步骤（第一个 [ ] 复选框）
- [ ] 加载该步骤的上下文与需求

## 步骤 13：执行当前步骤
- [ ] 准确执行当前步骤所描述的内容
- [ ] 按计划中的指定生成单元制品
- [ ] 遵循规划阶段已批准的分解方法
- [ ] 使用计划中指定的标准与边界

## 步骤 14：更新进度
- [ ] 在工作单元计划中将已完成的步骤标记为 [x]
- [ ] 更新 `aidlc-docs/aidlc-state.md` 的当前状态
- [ ] 保存所有已生成的制品

## 步骤 15：继续或完成
- [ ] 如果还有更多步骤，返回步骤 12
- [ ] 如果所有步骤已完成，验证单元已准备好进入设计阶段
- [ ] 将单元生成（Units Generation）阶段标记为完成

## 步骤 16：呈现完成消息

```markdown
# 🔧 Units Generation Complete

[AI-generated summary of units and decomposition created in bullet points]

> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the units generation artifacts at: `aidlc-docs/inception/application-design/`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the units generation if required
> ✅ **Approve & Continue** - Approve units and proceed to **CONSTRUCTION PHASE**
```

## 步骤 17：等待明确的批准
- 在用户明确批准单元生成之前不得继续
- 批准必须清晰且无歧义
- 如果用户请求修改，更新单元并重复批准流程

## 步骤 18：记录批准回复
- 在 `aidlc-docs/audit.md` 中记录用户的批准回复及时间戳
- 包含用户回复的确切文本
- 清晰地标记批准状态

## 步骤 19：更新进度
- 在 `aidlc-docs/aidlc-state.md` 中将单元生成（Units Generation）阶段标记为完成
- 更新"当前状态"（Current Status）部分
- 为过渡到 CONSTRUCTION PHASE 做准备

---

## 关键规则（Critical Rules）

### 规划阶段规则
- 仅生成与上下文相关的问题
- 所有问题使用 [Answer]: 标签格式
- 在继续之前分析所有答案的歧义
- 用后续问题解决所有歧义
- 在生成之前获得用户的明确批准

### 生成阶段规则
- **无硬编码逻辑（NO HARDCODED LOGIC）**：只执行工作单元计划中写的内容
- **完全遵循计划（FOLLOW PLAN EXACTLY）**：不要偏离步骤顺序
- **更新复选框（UPDATE CHECKBOXES）**：完成每一步后立即标记 [x]
- **使用已批准的方法（USE APPROVED APPROACH）**：遵循规划阶段形成的分解方法论
- **验证完成（VERIFY COMPLETION）**：在继续之前确保所有单元制品都已完成

## 完成标准
- 所有规划问题都已回答，歧义已解决
- 计划已获得用户批准
- 工作单元计划中的所有步骤都已标记 [x]
- 所有单元制品都已按计划生成：
  - `unit-of-work.md`，包含单元定义
  - `unit-of-work-dependency.md`，包含依赖矩阵
  - `unit-of-work-story-map.md`，包含故事映射
- 单元已通过验证，为按单元设计阶段做好准备
