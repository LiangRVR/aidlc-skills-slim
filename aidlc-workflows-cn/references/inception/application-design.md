# 应用程序设计（Application Design）- 详细步骤

## 目的
**高层组件识别与服务层设计**

应用程序设计（Application Design）聚焦于：
- 识别主要功能组件及其职责
- 定义组件接口（而非详细的业务逻辑）
- 设计用于编排的服务层
- 建立组件间的依赖关系与通信模式

**注意**：详细的业务逻辑设计将在后续的功能设计（Functional Design）阶段（按单元，CONSTRUCTION 阶段）进行

## 前置条件
- 工作区检测（Workspace Detection）必须已完成
- 建议先完成需求分析（Requirements Analysis）（提供功能上下文）
- 建议先完成用户故事（User Stories）（用户故事指导设计决策）
- 执行计划必须指明应执行应用程序设计（Application Design）阶段

## 分步执行

### 1. 分析上下文
- 阅读 `aidlc-docs/inception/requirements/requirements.md` 和 `aidlc-docs/inception/user-stories/stories.md`
- 识别关键业务能力与功能领域
- 确定设计范围与复杂度

### 2. 创建应用程序设计计划（Application Design Plan）
- 生成带有复选框 [] 的应用程序设计计划
- 聚焦于组件、职责、方法、业务规则与服务
- 每个步骤和子步骤都应有一个复选框 []

### 3. 在计划中包含强制性的设计制品
- **始终**在设计计划中包含以下强制性制品：
  - [ ] 生成 components.md，包含组件定义与高层职责
  - [ ] 生成 component-methods.md，包含方法签名（业务规则稍后在功能设计（Functional Design）阶段细化）
  - [ ] 生成 services.md，包含服务定义与编排模式
  - [ ] 生成 component-dependency.md，包含依赖关系与通信模式
  - [ ] 验证设计的完整性与一致性

### 4. 生成上下文相关的问题
**指令（DIRECTIVE）**：分析需求与用户故事，生成与本次特定应用程序设计相关的问题。使用以下类别作为指导。评估每个类别，当不确定其适用性时，提出问题而不是跳过它——过度自信会导致糟糕的结果（参见 overconfidence-prevention.md）。

- 使用 [Answer]: 标签格式嵌入问题
- 聚焦于任何歧义、缺失信息或需要澄清的领域
- 在用户输入能够改进设计决策的地方生成问题
- **当不确定时，提出问题**——过度自信会导致糟糕的设计

**要评估的问题类别**（考虑所有类别）：
- **组件识别（Component Identification）** - 询问组件边界、组织与分组策略
- **组件方法（Component Methods）** - 询问方法签名、输入/输出预期与接口契约（详细的业务规则稍后定义）
- **服务层设计（Service Layer Design）** - 询问服务编排、边界与协调模式
- **组件依赖（Component Dependencies）** - 询问通信模式、依赖管理与耦合问题
- **设计模式（Design Patterns）** - 询问架构风格偏好、模式选择与设计约束

### 5. 存储应用程序设计计划
- 保存为 `aidlc-docs/inception/plans/application-design-plan.md`
- 包含所有供用户输入的 [Answer]: 标签
- 确保计划覆盖所有设计方面

### 6. 请求用户输入
- 请用户直接在计划文档中填写 [Answer]: 标签
- 强调设计决策的重要性
- 提供完成 [Answer]: 标签的清晰说明

### 7. 收集答案
- 等待用户使用文档中的 [Answer]: 标签回答所有问题
- 在所有 [Answer]: 标签完成之前不得继续
- 检查文档以确保没有留空的 [Answer]: 标签

### 8. 分析答案（强制）
在继续之前，你必须仔细检查所有用户答案，查找：
- **模糊或含混的回复**："混合"、"介于两者之间"、"不确定"、"取决于"
- **未定义的标准或术语**：引用了没有明确定义的概念
- **相互矛盾的答案**：彼此冲突的回复
- **缺失的设计细节**：缺乏具体指导的答案
- **合并选项的答案**：在没有明确决策规则的情况下合并不同方法的回复

### 9. 强制性的后续问题
如果第 8 步的分析揭示了任何模糊的答案，你必须：
- 使用 [Answer]: 标签在计划文档中添加具体的后续问题
- 在所有歧义解决之前，不要进入批准环节
- 所需后续问题的示例：
  - "你提到'A 和 B 的混合'——应由什么具体标准来决定何时使用 A 而非 B？"
  - "你说'介于 A 和 B 之间'——你能定义确切的中间方案吗？"
  - "你表示'不确定'——什么额外信息能帮助你做出决定？"
  - "你提到'取决于复杂度'——你如何定义复杂度级别？"

### 10. 生成应用程序设计制品
- 执行已批准的计划以生成设计制品
- 创建 `aidlc-docs/inception/application-design/components.md`，包含：
  - 组件名称与用途
  - 组件职责
  - 组件接口
- 创建 `aidlc-docs/inception/application-design/component-methods.md`，包含：
  - 每个组件的方法签名
  - 每个方法的高层用途
  - 输入/输出类型
  - 注意：详细的业务规则将在功能设计（Functional Design）阶段（按单元，CONSTRUCTION 阶段）定义
- 创建 `aidlc-docs/inception/application-design/services.md`，包含：
  - 服务定义
  - 服务职责
  - 服务交互与编排
- 创建 `aidlc-docs/inception/application-design/component-dependency.md`，包含：
  - 展示关系的依赖矩阵
  - 组件间的通信模式
  - 数据流图
- 创建 `aidlc-docs/inception/application-design/application-design.md`，将以上创建的多个设计文档整合到单一文档中。

### 11. 记录审批
- 在 `aidlc-docs/audit.md` 中记录带时间戳的审批提示
- 包含完整的审批提示文本
- 使用 ISO 8601 时间戳格式

### 12. 呈现完成消息

```markdown
# 🏗️ Application Design Complete

[AI-generated summary of application design artifacts created in bullet points]

> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the application design artifacts at: `aidlc-docs/inception/application-design/`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the application design if required
> [IF Units Generation is skipped:]
> 📝 **Add Units Generation** - Choose to include **Units Generation** stage (currently skipped)
> ✅ **Approve & Continue** - Approve design and proceed to **[Units Generation/CONSTRUCTION PHASE]**
```

### 13. 等待明确的批准
- 在用户明确批准应用程序设计之前不得继续
- 批准必须清晰且无歧义
- 如果用户请求修改，更新设计并重复批准流程

### 14. 记录批准回复
- 在 `aidlc-docs/audit.md` 中记录用户的批准回复及时间戳
- 包含用户回复的确切文本
- 清晰地标记批准状态

### 15. 更新进度
- 在 `aidlc-docs/aidlc-state.md` 中将应用程序设计（Application Design）阶段标记为完成
- 更新"当前状态"（Current Status）部分
- 为过渡到下一阶段做准备
