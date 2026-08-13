# 用户故事（User Stories）- 详细步骤

## 目的
**将需求转化为以用户为中心、带验收标准的故事**

用户故事（User Stories）聚焦于：
- 将业务需求转化为以用户为中心的叙述
- 为每个故事定义清晰的验收标准
- 创建代表不同利益相关者类型的用户画像（personas）
- 在团队之间建立共识
- 为实施提供可测试的规范

## 前置条件
- 工作区检测（Workspace Detection）必须已完成
- 建议先完成需求分析（Requirements Analysis）（如有，可参考需求）
- 工作流规划（Workflow Planning）必须指明应执行用户故事（User Stories）阶段

## 智能评估指南

**何时执行用户故事（WHEN TO EXECUTE USER STORIES）**：在继续之前使用以下增强评估：

### 高优先级执行（始终执行）
- **新的用户功能（New User Features）**：用户将直接交互的任何新功能
- **用户体验变更（User Experience Changes）**：对现有用户工作流或界面的修改
- **多角色系统（Multi-Persona Systems）**：服务不同类型用户的应用程序
- **面向客户的 API（Customer-Facing APIs）**：外部用户或系统将消费的服务
- **复杂业务逻辑（Complex Business Logic）**：具有多个场景或业务规则的需求
- **跨团队项目（Cross-Team Projects）**：需要多个团队共享理解的工作

### 中优先级执行（评估复杂度）
- **后端用户影响（Backend User Impact）**：间接影响用户体验的内部变更
- **性能改进（Performance Improvements）**：具有用户可见益处的增强
- **集成工作（Integration Work）**：连接影响用户工作流的系统
- **数据变更（Data Changes）**：影响用户数据、报表或分析的修改
- **安全增强（Security Enhancements）**：影响用户认证或权限的变更

### 复杂度评估因素
对于中优先级情况，如果以下任一条件适用，则执行用户故事：
- **范围（Scope）**：变更跨多个组件或用户触点
- **歧义（Ambiguity）**：需求中有不清楚的方面，故事可以澄清
- **风险（Risk）**：高业务影响或存在误解的可能
- **利益相关者（Stakeholders）**：多个业务利益相关者参与需求
- **测试（Testing）**：将需要进行用户验收测试
- **选项（Options）**：存在多种有效的实施方案

### 仅对简单情况跳过
- **纯重构（Pure Refactoring）**：零用户影响的内部代码改进
- **孤立缺陷修复（Isolated Bug Fixes）**：范围清晰、定义明确的简单修复
- **仅基础设施（Infrastructure Only）**：无用户可见影响的变更
- **开发者工具（Developer Tooling）**：构建流程、CI/CD 或开发环境变更
- **文档（Documentation）**：不影响功能的更新

### 默认决策规则
**当不确定时，包含用户故事并提出澄清问题。** 创建带适当澄清的全面故事的开销通常会被以下收益所抵消：
- 更清晰的需求理解
- 更好的团队对齐
- 改进的测试标准
- 增强的利益相关者沟通
- 降低的实施风险
- 开发过程中更少的昂贵变更
- 更好的用户体验结果

---

# 第 1 部分：规划（PLANNING）

## 步骤 1：验证用户故事需求（强制）

**关键（CRITICAL）**：在继续用户故事之前，执行此评估：

### 评估流程
1. **分析请求上下文**：
   - 审阅原始用户请求和需求
   - 识别面向用户的变更与仅限内部的变更
   - 评估工作的复杂度和范围
   - 评估业务利益相关者的参与度

2. **应用评估标准**：
   - 对照高优先级指标检查（始终执行）
   - 评估中优先级因素（基于复杂度的决策）
   - 确认这不是应跳过的简单情况

3. **记录评估决策**：
   - 创建 `aidlc-docs/inception/plans/user-stories-assessment.md`
   - 包含为什么用户故事对本次请求有价值的理由
   - 引用适用的具体评估标准
   - 解释预期收益（清晰度、测试、利益相关者对齐）

4. **仅在合理时继续**：
   - 用户故事必须为项目增加明确价值
   - 评估必须显示具体收益超过开销
   - 决策应对项目利益相关者具有说服力

### 评估文档模板
```markdown
# User Stories Assessment

## Request Analysis
- **Original Request**: [Brief summary]
- **User Impact**: [Direct/Indirect/None]
- **Complexity Level**: [Simple/Medium/Complex]
- **Stakeholders**: [List involved parties]

## Assessment Criteria Met
- [ ] High Priority: [List applicable criteria]
- [ ] Medium Priority: [List applicable criteria with complexity justification]
- [ ] Benefits: [Expected value from user stories]

## Decision
**Execute User Stories**: [Yes/No]
**Reasoning**: [Detailed justification]

## Expected Outcomes
- [List specific benefits user stories will provide]
- [How stories will improve project success]
```

## 步骤 2：创建故事计划
- 扮演产品负责人的角色
- 生成包含分步执行清单的全面故事开发计划
- 每个步骤和子步骤都应有一个复选框 []
- 聚焦于将需求转化为用户故事的方法论与方法

## 步骤 3：生成上下文相关的问题
**指令（DIRECTIVE）**：彻底分析需求和上下文，识别所有通过澄清能够改进故事质量和团队理解的领域。主动提出问题，确保全面的用户故事开发。

**关键（CRITICAL）**：当存在任何可能影响故事质量的歧义或缺失细节时，默认提出问题。宁可多问问题，也不要创建不完整或不清楚的故事。

**问题格式规则参见 `../common/question-format-guide.md`**

- 使用 [Answer]: 标签格式嵌入问题
- 聚焦于任何歧义、缺失信息或需要澄清的领域
- 在用户输入能够改进故事创建决策的地方生成问题
- **当不确定时，提出问题**——过度自信会导致糟糕的故事

**要评估的问题类别**（考虑所有类别）：
- **用户画像（User Personas）** - 询问用户类型、角色、特征和动机
- **故事粒度（Story Granularity）** - 询问合适的细节级别、故事大小和拆分方法
- **故事格式（Story Format）** - 询问格式偏好、模板使用和文档标准
- **拆分方法（Breakdown Approach）** - 询问组织方法、优先级和分组策略
- **验收标准（Acceptance Criteria）** - 询问细节级别、格式、测试方法和验证手段
- **用户旅程（User Journeys）** - 询问用户工作流、交互模式和体验流程
- **业务上下文（Business Context）** - 询问业务目标、成功指标和利益相关者需求
- **技术约束（Technical Constraints）** - 询问技术限制、集成需求和系统边界

## 步骤 4：在计划中包含强制性的故事制品
- **始终**在故事计划中包含以下强制性制品：
  - [ ] 生成 stories.md，包含遵循 INVEST 标准的用户故事
  - [ ] 生成 personas.md，包含用户原型与特征
  - [ ] 确保故事是独立的（Independent）、可协商的（Negotiable）、有价值的（Valuable）、可估算的（Estimable）、小型的（Small）、可测试的（Testable）
  - [ ] 为每个故事包含验收标准
  - [ ] 将画像（personas）映射到相关的用户故事

## 步骤 5：呈现故事选项
- 在计划文档中包含不同的故事拆分方法：
  - **基于用户旅程（User Journey-Based）**：故事跟随用户工作流和交互
  - **基于功能（Feature-Based）**：故事围绕系统功能和能力组织
  - **基于画像（Persona-Based）**：故事按不同用户类型及其需求分组
  - **基于领域（Domain-Based）**：故事围绕业务领域或上下文组织
  - **基于史诗（Epic-Based）**：故事结构化为带子故事的层级史诗
- 解释每种方法的权衡与收益
- 允许带清晰决策标准的混合方法

## 步骤 6：存储故事计划
- 将带有嵌入问题的完整故事计划保存在 `aidlc-docs/inception/plans/` 目录中
- 文件名：`story-generation-plan.md`
- 包含所有供用户输入的 [Answer]: 标签
- 确保计划全面且覆盖故事开发的所有方面

## 步骤 7：请求用户输入
- 请用户直接在故事计划文档中填写所有 [Answer]: 标签
- 强调审计追踪和决策文档的重要性
- 提供填写 [Answer]: 标签的清晰说明
- 说明所有问题必须在继续之前回答

## 步骤 8：收集答案
- 等待用户使用文档中的 [Answer]: 标签回答所有问题
- 在所有 [Answer]: 标签完成之前不得继续
- 检查文档以确保没有留空的 [Answer]: 标签

## 步骤 9：分析答案（强制）
在继续之前，你必须仔细检查所有用户答案，查找：
- **模糊或含混的回复**："混合"、"介于两者之间"、"不确定"、"取决于"、"也许"、"大概"
- **未定义的标准或术语**：引用了没有明确定义的概念
- **相互矛盾的答案**：彼此冲突的回复
- **缺失的生成细节**：缺乏实施具体指导的答案
- **合并选项的答案**：在没有明确决策规则的情况下合并不同方法的回复
- **不完整的解释**：引用外部因素但未定义它们的答案
- **基于假设的回复**：假设了未明确陈述的知识的答案

## 步骤 10：强制性的后续问题
如果第 9 步的分析揭示了任何模糊的答案，你必须：
- 使用 [Answer]: 标签创建单独的澄清问题文件
- 在所有歧义完全解决之前，不要进入批准环节
- **关键（CRITICAL）**：要彻底——对每个不清楚的回复提出后续问题
- 所需后续问题的示例：
  - "你提到'A 和 B 的混合'——应由什么具体标准来决定何时使用 A 而非 B？"
  - "你说'介于 A 和 B 之间'——你能定义确切的中间方案吗？"
  - "你表示'不确定'——什么额外信息能帮助你做出决定？"
  - "你提到'取决于复杂度'——你如何定义复杂度级别和阈值？"
  - "你选择了'混合方法'——每种方法的使用时机有哪些具体规则？"
  - "你说'大概是 X'——哪些因素会使其明确是 X 而非明确不是 X？"
  - "你引用了'标准实践'——你能定义该标准实践是什么吗？"

## 步骤 11：避免实施细节
- 聚焦于故事创建方法论，而非优先级或开发任务
- 在此阶段不要讨论技术生成
- 避免创建开发时间线或迭代（sprint）规划
- 保持聚焦于故事结构和格式决策

## 步骤 12：记录审批提示
- 在请求批准之前，在 `aidlc-docs/audit.md` 中记录带时间戳的提示
- 包含完整的审批提示文本
- 使用 ISO 8601 时间戳格式

## 步骤 13：等待计划的明确批准
- 在用户明确批准故事方法之前不得继续
- 批准必须清晰且无歧义
- 如果用户请求修改，更新计划并重复批准流程

## 步骤 14：记录批准回复
- 在 `aidlc-docs/audit.md` 中记录用户的批准回复及时间戳
- 包含用户回复的确切文本
- 清晰地标记批准状态

---

# 第 2 部分：生成（GENERATION）

## 步骤 15：加载故事生成计划
- [ ] 从 `aidlc-docs/inception/plans/story-generation-plan.md` 读取完整的故事计划
- [ ] 识别下一个未完成的步骤（第一个 [ ] 复选框）
- [ ] 加载该步骤的上下文与需求

## 步骤 16：执行当前步骤
- [ ] 准确执行当前步骤所描述的内容
- [ ] 按计划中的指定生成故事制品
- [ ] 遵循规划阶段已批准的方法论和格式
- [ ] 使用计划中指定的故事拆分方法

## 步骤 17：更新进度
- [ ] 在故事生成计划中将已完成的步骤标记为 [x]
- [ ] 更新 `aidlc-docs/aidlc-state.md` 的当前状态
- [ ] 保存所有已生成的制品

## 步骤 18：继续或完成生成
- [ ] 如果还有更多步骤，返回步骤 15
- [ ] 如果所有步骤已完成，验证故事已准备好进入下一阶段
- [ ] 确保所有强制性制品都已生成

## 步骤 19：记录审批提示
- 在请求批准之前，在 `aidlc-docs/audit.md` 中记录带时间戳的提示
- 包含完整的审批提示文本
- 使用 ISO 8601 时间戳格式

## 步骤 20：呈现完成消息
- 按以下结构呈现完成消息：
     1. **完成公告（Completion Announcement）**（强制）：始终以此开头：

```markdown
# 📚 User Stories Complete
```

     2. **AI 摘要（AI Summary）**（可选）：提供所生成故事的结构化要点摘要
        - 格式："用户故事生成已创建 [描述]："
        - 列出生成的 key 画像（personas）（要点）
        - 列出创建的用户故事，包含数量和组织方式
        - 提及故事结构和合规性（INVEST 标准、验收标准）
        - 不要包含工作流指令（"请审阅"、"请告知"、"继续到下一阶段"、"在我们继续之前"）
        - 保持事实性和内容导向
     3. **格式化的工作流消息（Formatted Workflow Message）**（强制）：始终以以下确切格式结尾：

```markdown
> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the user stories and personas at: `aidlc-docs/inception/user-stories/stories.md` and `aidlc-docs/inception/user-stories/personas.md`



> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** -  Ask for modifications to the stories or personas based on your review  
> ✅ **Approve & Continue** - Approve user stories and proceed to **Workflow Planning**

---
```

## 步骤 21：等待已生成故事的明确批准
- 在用户明确批准已生成的故事之前不得继续
- 批准必须清晰且无歧义
- 如果用户请求修改，更新故事并重复批准流程

## 步骤 22：记录批准回复
- 在 `aidlc-docs/audit.md` 中记录用户的批准回复及时间戳
- 包含用户回复的确切文本
- 清晰地标记批准状态

## 步骤 23：更新进度
- 在 `aidlc-state.md` 中将用户故事（User Stories）阶段标记为完成
- 更新"当前状态"（Current Status）部分
- 为过渡到下一阶段做准备

---

# 关键规则（CRITICAL RULES）

## 规划阶段规则
- **上下文相关的问题（CONTEXT-APPROPRIATE QUESTIONS）**：只问与本次特定上下文相关的问题
- **强制性的答案分析（MANDATORY ANSWER ANALYSIS）**：在继续之前始终分析答案的歧义
- **不允许带着歧义继续（NO PROCEEDING WITH AMBIGUITY）**：在生成之前必须解决所有模糊的答案
- **需要明确批准（EXPLICIT APPROVAL REQUIRED）**：用户在生成开始之前必须批准计划

## 生成阶段规则
- **无硬编码逻辑（NO HARDCODED LOGIC）**：只执行故事生成计划中写的内容
- **完全遵循计划（FOLLOW PLAN EXACTLY）**：不要偏离步骤顺序
- **更新复选框（UPDATE CHECKBOXES）**：完成每一步后立即标记 [x]
- **使用已批准的方法论（USE APPROVED METHODOLOGY）**：遵循规划阶段的故事方法
- **验证完成（VERIFY COMPLETION）**：在继续之前确保所有故事制品都已完成

## 完成标准
- 所有规划问题都已回答，歧义已解决
- 故事计划已获得用户明确批准
- 故事生成计划中的所有步骤都已标记 [x]
- 所有故事制品都已按计划生成（stories.md、personas.md）
- 已生成的故事已获得用户明确批准
- 故事已通过验证，为下一阶段做好准备
