# 功能设计

## 目的
**每个单元的详细业务逻辑设计**

功能设计侧重于：
- 单元的详细业务逻辑和算法
- 包含实体和关系的领域模型
- 详细的业务规则、验证逻辑和约束
- 与技术无关的设计（不涉及基础设施）

**注意**：这是基于 INCEPTION 阶段应用程序设计中的高层组件设计构建的

## 前置条件
- 单元生成必须完成
- 工作单元制品必须可用
- 建议先完成应用程序设计（提供高层组件结构）
- 执行计划必须指示应执行功能设计阶段

## 概述
为单元设计详细的业务逻辑，与技术无关，纯粹专注于业务功能。

## 执行步骤

### 第 1 步：分析单元上下文
- 从 `aidlc-docs/inception/application-design/unit-of-work.md` 读取单元定义
- 从 `aidlc-docs/inception/application-design/unit-of-work-story-map.md` 读取分配的故事
- 理解单元职责和边界

### 第 2 步：创建功能设计计划
- 为功能设计生成带复选框 [] 的计划
- 专注于业务逻辑、领域模型、业务规则
- 每个步骤应有一个复选框 []

### 第 3 步：生成与上下文相关的问题
**指令**：彻底分析单元定义和功能设计制品，识别所有澄清可改善功能设计的领域。主动提问以确保全面理解。

**关键**：当存在任何可能影响功能设计质量的歧义或缺失细节时，默认提问。问太多问题总比做出错误假设好。

- 使用 [Answer]: 标签格式嵌入问题
- 关注任何歧义、缺失信息或需要澄清的领域
- 在用户输入可改善功能设计决策的任何地方生成问题
- **有疑问时就问** - 过度自信会导致糟糕的设计

**需要考虑的问题类别**（评估所有类别）：
- **业务逻辑建模** - 询问核心实体、工作流、数据转换和业务流程
- **领域模型** - 询问领域概念、实体关系、数据结构和业务对象
- **业务规则** - 询问决策规则、验证逻辑、约束和业务策略
- **数据流** - 询问数据输入、输出、转换和持久化需求
- **集成点** - 询问外部系统交互、API 和数据交换
- **错误处理** - 询问错误场景、验证失败和异常处理
- **业务场景** - 询问边界情况、替代流程和复杂业务情境
- **前端组件**（如适用）- 询问 UI 组件结构、用户交互、状态管理和表单处理

### 第 4 步：存储计划
- 保存为 `aidlc-docs/construction/plans/{unit-name}-functional-design-plan.md`
- 包含所有供用户输入的 [Answer]: 标签

### 第 5 步：收集和分析答案
- 等待用户完成所有 [Answer]: 标签
- **强制要求**：仔细审阅所有对模糊或歧义答案的响应
- **关键**：对任何不清楚的响应添加后续问题 - 不要带着歧义继续
- 留意类似 "depends"、"maybe"、"not sure"、"mix of"、"somewhere between" 的响应
- 如果检测到任何歧义，创建澄清问题文件
- **在解决所有歧义之前不要继续**

### 第 6 步：生成功能设计制品
- 创建 `aidlc-docs/construction/{unit-name}/functional-design/business-logic-model.md`
- 创建 `aidlc-docs/construction/{unit-name}/functional-design/business-rules.md`
- 创建 `aidlc-docs/construction/{unit-name}/functional-design/domain-entities.md`
- 如果单元包含前端/UI：创建 `aidlc-docs/construction/{unit-name}/functional-design/frontend-components.md`
  - 组件层级和结构
  - 每个组件的 Props 和状态定义
  - 用户交互流程
  - 表单验证规则
  - API 集成点（每个组件使用哪些后端端点）

### 第 7 步：呈现完成消息
- 按以下结构呈现完成消息：
     1. **完成公告**（必需）：始终以此开头：

```markdown
# 🔧 Functional Design Complete - [unit-name]
```

     2. **AI 摘要**（可选）：提供功能设计的结构化要点摘要
        - 格式："功能设计已创建 [description]："
        - 列出关键业务逻辑模型和实体（要点）
        - 列出已定义的业务规则和验证逻辑
        - 提及领域模型结构和关系
        - 不要包含工作流指令（"请审阅"、"请告知"、"进入下一阶段"、"在我们继续之前"）
        - 保持事实性和内容导向
     3. **格式化工作流消息**（必需）：始终以此精确格式结尾：

```markdown
> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the functional design artifacts at: `aidlc-docs/construction/[unit-name]/functional-design/`



> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the functional design based on your review  
> ✅ **Continue to Next Stage** - Approve functional design and proceed to **[next-stage-name]**

---
```

### 第 8 步：等待明确审批
- 在用户明确批准功能设计之前不要继续
- 审批必须清晰明确
- 如果用户请求更改，更新设计并重复审批流程

### 第 9 步：记录审批并更新进度
- 在 audit.md 中记录带有时间戳的审批
- 记录用户带有时间戳的审批响应
- 在 aidlc-state.md 中将功能设计阶段标记为完成
