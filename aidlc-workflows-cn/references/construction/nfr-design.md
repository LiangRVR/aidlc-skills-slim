# NFR 设计

## 前置条件
- 单元的 NFR 需求必须完成
- NFR 需求制品必须可用
- 执行计划必须指示应执行 NFR 设计阶段

## 概述
使用模式和逻辑组件将 NFR 需求纳入单元设计。

## 执行步骤

### 第 1 步：分析 NFR 需求
- 从 `aidlc-docs/construction/{unit-name}/nfr-requirements/` 读取 NFR 需求
- 理解可扩展性、性能、可用性、安全需求

### 第 2 步：创建 NFR 设计计划
- 为 NFR 设计生成带复选框 [] 的计划
- 专注于设计模式和逻辑组件
- 每个步骤应有一个复选框 []

### 第 3 步：生成与上下文相关的问题
**指令**：彻底分析 NFR 需求，识别所有澄清可改善 NFR 设计质量的领域。主动提问以确保全面的非功能设计覆盖。

**关键**：当存在任何可能影响 NFR 设计质量的歧义或缺失细节时，默认提问。问太多问题总比对非功能模式做出错误假设好。

**强制要求**：通过对每个类别提出针对性问题来评估以下所有类别。对于每个类别，根据 NFR 需求中的证据确定适用性 -- 没有明确理由不要跳过任何类别：

- 使用 [Answer]: 标签格式嵌入问题
- 关注任何歧义、缺失信息或需要澄清的领域
- 在用户输入可改善模式和组件决策的任何地方生成问题
- **有疑问时就问** - 过度自信会导致糟糕的非功能设计

**需要评估的问题类别**（考虑所有类别）：
- **弹性模式** - 询问容错方法、重试策略和故障恢复预期
- **可扩展性模式** - 询问扩展机制、负载边界和增长预测
- **性能模式** - 询问优化策略、延迟目标和吞吐量需求
- **安全模式** - 询问安全实现方法、威胁模型和合规约束
- **逻辑组件** - 询问基础设施组件（队列、缓存、熔断器等）及其集成模式

### 第 4 步：存储计划
- 保存为 `aidlc-docs/construction/plans/{unit-name}-nfr-design-plan.md`
- 包含所有供用户输入的 [Answer]: 标签

### 第 5 步：收集和分析答案
- 等待用户完成所有 [Answer]: 标签
- 审阅模糊或歧义的响应
- 如有需要添加后续问题

### 第 6 步：生成 NFR 设计制品
- 创建 `aidlc-docs/construction/{unit-name}/nfr-design/nfr-design-patterns.md`
- 创建 `aidlc-docs/construction/{unit-name}/nfr-design/logical-components.md`

### 第 7 步：呈现完成消息
- 按以下结构呈现完成消息：
     1. **完成公告**（必需）：始终以此开头：

```markdown
# 🎨 NFR Design Complete - [unit-name]
```

     2. **AI 摘要**（可选）：提供 NFR 设计的结构化要点摘要
        - 格式："NFR 设计已纳入 [description]："
        - 列出已实施的关键设计模式（要点）
        - 列出逻辑组件和基础设施要素
        - 提及已应用的弹性、可扩展性和性能模式
        - 不要包含工作流指令（"请审阅"、"请告知"、"进入下一阶段"、"在我们继续之前"）
        - 保持事实性和内容导向
     3. **格式化工作流消息**（必需）：始终以此精确格式结尾：

```markdown
> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the NFR design at: `aidlc-docs/construction/[unit-name]/nfr-design/`



> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the NFR design based on your review  
> ✅ **Continue to Next Stage** - Approve NFR design and proceed to **[next-stage-name]**

---
```

### 第 8 步：等待明确审批
- 在用户明确批准 NFR 设计之前不要继续
- 审批必须清晰明确
- 如果用户请求更改，更新设计并重复审批流程

### 第 9 步：记录审批并更新进度
- 在 audit.md 中记录带有时间戳的审批
- 记录用户带有时间戳的审批响应
- 在 aidlc-state.md 中将 NFR 设计阶段标记为完成
