# 基础设施设计

## 前置条件
- 单元的功能设计必须完成
- 建议先完成 NFR 设计（提供要映射的逻辑组件）
- 执行计划必须指示应执行基础设施设计阶段

## 概述
将逻辑软件组件映射到部署环境的实际基础设施选择。

## 执行步骤

### 第 1 步：分析设计制品
- 从 `aidlc-docs/construction/{unit-name}/functional-design/` 读取功能设计
- 从 `aidlc-docs/construction/{unit-name}/nfr-design/` 读取 NFR 设计（如果存在）
- 识别需要基础设施的逻辑组件

### 第 2 步：创建基础设施设计计划
- 为基础设施设计生成带复选框 [] 的计划
- 专注于映射到实际服务（AWS、Azure、GCP、本地部署）
- 每个步骤应有一个复选框 []

### 第 3 步：生成与上下文相关的问题
**指令**：彻底分析功能设计和 NFR 设计，识别所有澄清可改善基础设施决策的领域。主动提问以确保全面的基础设施覆盖。

**关键**：当存在任何可能影响基础设施质量的歧义或缺失细节时，默认提问。问太多问题总比做出错误的基础设施假设好。

**强制要求**：通过对每个类别提出针对性问题来评估以下所有类别。对于每个类别，根据功能设计和 NFR 设计制品中的证据确定适用性 -- 没有明确理由不要跳过任何类别：

- 使用 [Answer]: 标签格式嵌入问题
- 关注任何歧义、缺失信息或需要澄清的领域
- 在用户输入可改善基础设施决策的任何地方生成问题
- **有疑问时就问** - 过度自信会导致糟糕的基础设施选择

**需要评估的问题类别**（考虑所有类别）：
- **部署环境** - 询问云服务商偏好、环境设置和部署目标
- **计算基础设施** - 询问计算服务选择、规模和扩展需求
- **存储基础设施** - 询问数据库选择、存储模式和数据生命周期需求
- **消息传递基础设施** - 询问消息/队列服务、事件驱动模式和异步处理
- **网络基础设施** - 询问负载均衡、API 网关方法和网络拓扑
- **监控基础设施** - 询问可观测性工具、告警策略和日志需求
- **共享基础设施** - 询问基础设施共享策略、多租户和资源隔离

### 第 4 步：存储计划
- 保存为 `aidlc-docs/construction/plans/{unit-name}-infrastructure-design-plan.md`
- 包含所有供用户输入的 [Answer]: 标签

### 第 5 步：收集和分析答案
- 等待用户完成所有 [Answer]: 标签
- 审阅模糊或歧义的响应
- 如有需要添加后续问题

### 第 6 步：生成基础设施设计制品
- 创建 `aidlc-docs/construction/{unit-name}/infrastructure-design/infrastructure-design.md`
- 创建 `aidlc-docs/construction/{unit-name}/infrastructure-design/deployment-architecture.md`
- 如果有共享基础设施：创建 `aidlc-docs/construction/shared-infrastructure.md`

### 第 7 步：呈现完成消息
- 按以下结构呈现完成消息：
     1. **完成公告**（必需）：始终以此开头：

```markdown
# 🏢 Infrastructure Design Complete - [unit-name]
```

     2. **AI 摘要**（可选）：提供基础设施设计的结构化要点摘要
        - 格式："基础设施设计已映射 [description]："
        - 列出关键基础设施服务和组件（要点）
        - 列出部署架构决策及其理由
        - 提及云服务商选择和服务的映射
        - 不要包含工作流指令（"请审阅"、"请告知"、"进入下一阶段"、"在我们继续之前"）
        - 保持事实性和内容导向
     3. **格式化工作流消息**（必需）：始终以此精确格式结尾：

```markdown
> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the infrastructure design at: `aidlc-docs/construction/[unit-name]/infrastructure-design/`



> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the infrastructure design based on your review  
> ✅ **Continue to Next Stage** - Approve infrastructure design and proceed to **Code Generation**

---
```

### 第 8 步：等待明确审批
- 在用户明确批准基础设施设计之前不要继续
- 审批必须清晰明确
- 如果用户请求更改，更新设计并重复审批流程

### 第 9 步：记录审批并更新进度
- 在 audit.md 中记录带有时间戳的审批
- 记录用户带有时间戳的审批响应
- 在 aidlc-state.md 中将基础设施设计阶段标记为完成
