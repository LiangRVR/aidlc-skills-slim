# 需求分析（Requirements Analysis）（自适应）

**扮演**产品负责人的角色

**自适应阶段**：始终执行。细节级别随问题复杂度自适应调整。

**自适应深度说明参见 [depth-levels.md](../common/depth-levels.md)**

## 前置条件
- 工作区检测（Workspace Detection）必须已完成
- 逆向工程（Reverse Engineering）必须已完成（如果是 brownfield 项目）

## 执行步骤

### 步骤 1：加载逆向工程上下文（如果可用）

**如果是 brownfield 项目**：
- 加载 `aidlc-docs/inception/reverse-engineering/architecture.md`
- 加载 `aidlc-docs/inception/reverse-engineering/component-inventory.md`
- 加载 `aidlc-docs/inception/reverse-engineering/technology-stack.md`
- 在分析请求时使用这些文件来理解现有系统

### 步骤 2：分析用户请求（意图分析）

#### 2.1 请求清晰度
- **清晰（Clear）**：具体、定义明确、可执行
- **模糊（Vague）**：笼统、有歧义、需要澄清
- **不完整（Incomplete）**：缺少关键信息

#### 2.2 请求类型
- **新功能（New Feature）**：添加新功能
- **缺陷修复（Bug Fix）**：修复现有问题
- **重构（Refactoring）**：改进代码结构
- **升级（Upgrade）**：更新依赖或框架
- **迁移（Migration）**：迁移到不同的技术
- **增强（Enhancement）**：改进现有功能
- **新项目（New Project）**：从零开始

#### 2.3 初始范围评估
- **单文件（Single File）**：对一个文件的更改
- **单组件（Single Component）**：对一个组件/包的更改
- **多组件（Multiple Components）**：跨多个组件的更改
- **全系统（System-wide）**：影响整个系统的更改
- **跨系统（Cross-system）**：影响多个系统的更改

#### 2.4 初始复杂度评估
- **微不足道（Trivial）**：简单、直接的更改
- **简单（Simple）**：清晰的实现路径
- **中等（Moderate）**：有一定复杂度，需考虑多个方面
- **复杂（Complex）**：复杂度显著，需考虑很多方面

### 步骤 3：确定需求深度

**根据请求分析，确定深度：**

**最小深度（Minimal Depth）** - 在以下情况使用：
- 请求清晰且简单
- 无需详细需求
- 只需记录基本理解

**标准深度（Standard Depth）** - 在以下情况使用：
- 请求需要澄清
- 需要功能性和非功能性需求
- 正常复杂度

**全面深度（Comprehensive Depth）** - 在以下情况使用：
- 有多个利益相关者的复杂项目
- 高风险或关键系统
- 需要带可追溯性的详细需求

### 步骤 4：评估当前需求

分析用户提供的任何内容：
   - 意图陈述或描述（已记录在 audit.md 中）
   - 现有的需求文档（如果提到，搜索工作区）
   - 粘贴的内容或文件引用
   - 将任何非 Markdown 文档转换为 Markdown 格式

### 步骤 5：彻底的完整性分析

**关键（CRITICAL）**：使用全面分析来评估需求完整性。当存在任何歧义或缺失细节时，默认提出问题。

**强制（MANDATORY）**：评估以下所有领域，并对任何不清楚的领域提出问题：
- **功能性需求（Functional Requirements）**：核心功能、用户交互、系统行为
- **非功能性需求（Non-Functional Requirements）**：性能、安全性、可扩展性、可用性
- **用户场景（User Scenarios）**：用例、用户旅程、边界情况、错误场景
- **业务上下文（Business Context）**：目标、约束、成功标准、利益相关者需求
- **技术上下文（Technical Context）**：集成点、数据需求、系统边界
- **质量属性（Quality Attributes）**：可靠性、可维护性、可测试性、可访问性

**当不确定时，提出问题**——不完整的需求会导致糟糕的实现。

### 步骤 5.1：扩展选择性加入提示（Extension Opt-In Prompts）

**强制（MANDATORY）**：扫描所有已加载的 `*.opt-in.md` 文件（在工作流启动时从 `../extensions/` 子目录加载）中的 `## Opt-In Prompt` 部分。对于每个声明了该部分的扩展，将该问题包含在第 6 步创建的澄清问题文件中。以用户对话所用的相同语言呈现每个选择性加入问题。

收到答案后：
1. 在 `aidlc-docs/aidlc-state.md` 的 `## Extension Configuration` 下记录每个扩展的启用状态：

```markdown
## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| [Extension Name] | [Yes/No] | Requirements Analysis |
```

2. **延迟规则加载（Deferred Rule Loading）**：对于用户选择加入的每个扩展，立即加载完整的规则文件。规则文件通过命名约定推导：从 opt-in 文件名中移除 `.opt-in.md` 并追加 `.md`（例如，`security-baseline.opt-in.md` → `security-baseline.md`）。对于用户选择退出的扩展，不要加载完整的规则文件。

### 步骤 6：生成澄清问题（主动方法）
   - **始终**创建 `aidlc-docs/inception/requirements/requirement-verification-questions.md`，除非需求异常清晰且完整
   - 就任何缺失、不清楚或有歧义的领域提出问题
   - 聚焦于功能性需求、非功能性需求、用户场景和业务上下文
   - 请用户直接在问题文档中填写所有 [Answer]: 标签
   - 如果为答案提供多选选项：
     - 将选项标记为 A, B, C, D 等
     - 确保选项互斥且不重叠
     - **始终**包含自定义回复选项："X) Other (please describe after [Answer]: tag below)"
   - 等待用户在文档中作答
   - **强制（MANDATORY）**：分析所有答案的歧义，并在需要时创建后续问题
   - **强制（MANDATORY）**：持续提问，直到所有歧义都已解决**或**用户明确要求继续

### ⛔ 门禁（GATE）：等待用户答案
在 requirement-verification-questions.md 中的所有问题都得到回答并验证之前，不要进入步骤 7。
将问题文件呈现给用户并停止。

### 步骤 7：生成需求文档
   - **前置条件**：步骤 6 的门禁必须通过——所有答案均已收到并分析
   - 创建 `aidlc-docs/inception/requirements/requirements.md`
   - 在顶部包含意图分析摘要：
     - 用户请求
     - 请求类型
     - 范围评估
     - 复杂度评估
   - 同时包含功能性和非功能性需求
   - 纳入用户对澄清问题的回答
   - 提供关键需求的简要摘要

### 步骤 8：更新状态跟踪

更新 `aidlc-docs/aidlc-state.md`：

```markdown
## Stage Progress
### 🔵 INCEPTION PHASE
- [x] Workspace Detection
- [x] Reverse Engineering (if applicable)
- [x] Requirements Analysis
```

### 步骤 9：记录并继续
   - 在 `aidlc-docs/audit.md` 中记录带时间戳的审批提示
   - 按以下结构呈现完成消息：
     1. **完成公告（Completion Announcement）**（强制）：始终以此开头：

```markdown
# 🔍 Requirements Analysis Complete
```

     2. **AI 摘要（AI Summary）**（可选）：提供结构化的需求要点摘要
        - 格式："需求分析已识别出 [项目类型/复杂度]："
        - 列出关键功能性需求（要点）
        - 列出关键非功能性需求（要点）
        - 如相关，提及架构考虑或技术决策
        - 不要包含工作流指令（"请审阅"、"请告知"、"继续到下一阶段"、"在我们继续之前"）
        - 保持事实性和内容导向
     3. **格式化的工作流消息（Formatted Workflow Message）**（强制）：始终以以下确切格式结尾：

```markdown
> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the requirements document at: `aidlc-docs/inception/requirements/requirements.md`



> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** -  Ask for modifications to the requirements if required based on your review 
> [IF User Stories will be skipped, add this option:]
> 📝 **Add User Stories** - Choose to Include **User Stories** stage (currently skipped based on project simplicity)  
> ✅ **Approve & Continue** - Approve requirements and proceed to **[User Stories/Workflow Planning]**

---
```

**注意**：仅在用户故事（User Stories）阶段将被跳过时才包含"添加用户故事（Add User Stories）"选项。将 [User Stories/Workflow Planning] 替换为实际的下一阶段名称。

   - 在继续之前等待用户明确批准
   - 记录带时间戳的批准回复
   - 在 aidlc-state.md 中将需求分析（Requirements Analysis）阶段标记为完成
