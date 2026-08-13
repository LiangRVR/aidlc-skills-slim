# NFR 需求

## 前置条件
- 单元的功能设计必须完成
- 单元功能设计制品必须可用
- 执行计划必须指示应执行 NFR 需求阶段

## 概述
确定单元的非功能需求并做出技术栈选择。

## 执行步骤

### 第 1 步：分析功能设计
- 从 `aidlc-docs/construction/{unit-name}/functional-design/` 读取功能设计制品
- 理解业务逻辑复杂性和需求

### 第 2 步：创建 NFR 需求计划
- 为 NFR 评估生成带复选框 [] 的计划
- 专注于可扩展性、性能、可用性、安全
- 每个步骤应有一个复选框 []

### 第 3 步：生成与上下文相关的问题
**指令**：彻底分析功能设计，识别所有 NFR 澄清可改善系统质量和架构决策的领域。主动提问以确保全面的 NFR 覆盖。

**关键**：当存在任何可能影响系统质量的歧义或缺失细节时，默认提问。问太多问题总比做出错误的 NFR 假设好。

- 使用 [Answer]: 标签格式嵌入问题
- 关注任何歧义、缺失信息或需要澄清的领域
- 在用户输入可改善 NFR 和技术栈决策的任何地方生成问题
- **有疑问时就问** - 过度自信会导致糟糕的系统质量

**需要评估的问题类别**（考虑所有类别）：
- **可扩展性需求** - 询问预期负载、增长模式、扩展触发条件和容量规划
- **性能需求** - 询问响应时间、吞吐量、延迟和性能基准
- **可用性需求** - 询问正常运行时间预期、灾难恢复、故障转移和业务连续性
- **安全需求** - 询问数据保护、合规、身份验证、授权和威胁模型
- **技术栈选择** - 询问技术偏好、约束、现有系统和集成需求
- **可靠性需求** - 询问错误处理、容错、监控和告警需求
- **可维护性需求** - 询问代码质量、文档、测试和运维需求
- **易用性需求** - 询问用户体验、可访问性和界面需求

### 第 4 步：存储计划
- 保存为 `aidlc-docs/construction/plans/{unit-name}-nfr-requirements-plan.md`
- 包含所有供用户输入的 [Answer]: 标签

### 第 5 步：收集和分析答案
- 等待用户完成所有 [Answer]: 标签
- **强制要求**：仔细审阅所有对模糊或歧义答案的响应
- **关键**：对任何不清楚的响应添加后续问题 - 不要带着歧义继续
- 留意类似 "depends"、"maybe"、"not sure"、"mix of"、"somewhere between"、"standard"、"typical" 的响应
- 如果检测到任何歧义，创建澄清问题文件
- **在解决所有歧义之前不要继续**

### 第 6 步：生成 NFR 需求制品
- 创建 `aidlc-docs/construction/{unit-name}/nfr-requirements/nfr-requirements.md`
- 创建 `aidlc-docs/construction/{unit-name}/nfr-requirements/tech-stack-decisions.md`

### 第 7 步：呈现完成消息
- 按以下结构呈现完成消息：
     1. **完成公告**（必需）：始终以此开头：

```markdown
# 📊 NFR Requirements Complete - [unit-name]
```

     2. **AI 摘要**（可选）：提供 NFR 需求的结构化要点摘要
        - 格式："NFR 需求评估已识别 [description]："
        - 列出关键可扩展性、性能、可用性需求（要点）
        - 列出已识别的安全和合规需求
        - 提及技术栈决策及其理由
        - 不要包含工作流指令（"请审阅"、"请告知"、"进入下一阶段"、"在我们继续之前"）
        - 保持事实性和内容导向
     3. **格式化工作流消息**（必需）：始终以此精确格式结尾：

```markdown
> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the NFR requirements at: `aidlc-docs/construction/[unit-name]/nfr-requirements/`



> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the NFR requirements based on your review  
> ✅ **Continue to Next Stage** - Approve NFR requirements and proceed to **[next-stage-name]**

---
```

### 第 8 步：等待明确审批
- 在用户明确批准 NFR 需求之前不要继续
- 审批必须清晰明确
- 如果用户请求更改，更新需求并重复审批流程

### 第 9 步：记录审批并更新进度
- 在 audit.md 中记录带有时间戳的审批
- 记录用户带有时间戳的审批响应
- 在 aidlc-state.md 中将 NFR 需求阶段标记为完成
