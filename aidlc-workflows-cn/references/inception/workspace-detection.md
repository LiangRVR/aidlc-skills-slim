# 工作区检测（Workspace Detection）

**目的**：确定工作区状态并检查是否已有 AI-DLC 项目

## 步骤 1：检查是否已有 AI-DLC 项目

检查 `aidlc-docs/aidlc-state.md` 是否存在：
- **如果存在**：从上一个阶段恢复（从先前阶段加载上下文）
- **如果不存在**：继续新项目评估

## 步骤 2：扫描工作区中的现有代码

**确定工作区是否包含现有代码：**
- 扫描工作区中的源代码文件（.java, .py, .js, .ts, .jsx, .tsx, .kt, .kts, .scala, .groovy, .go, .rs, .rb, .php, .c, .h, .cpp, .hpp, .cc, .cs, .fs 等）
- 检查构建文件（pom.xml, package.json, build.gradle 等）
- 查找项目结构标识
- 识别工作区根目录（而不是 aidlc-docs/）

**记录发现：**
```markdown
## Workspace State
- **Existing Code**: [Yes/No]
- **Programming Languages**: [List if found]
- **Build System**: [Maven/Gradle/npm/etc. if found]
- **Project Structure**: [Monolith/Microservices/Library/Empty]
- **Workspace Root**: [Absolute path]
```

## 步骤 3：确定下一阶段

**如果工作区为空（没有现有代码）**：
- 设置标志：`brownfield = false`
- 下一阶段：需求分析（Requirements Analysis）

**如果工作区中有现有代码**：
- 设置标志：`brownfield = true`
- 检查 `aidlc-docs/inception/reverse-engineering/` 中是否有现有的逆向工程制品
- **如果存在逆向工程制品**：
    - 检查制品是否已过期（将制品时间戳与代码库最后一次重大修改进行比较）
    - **如果制品是最新的**：加载它们，跳到需求分析（Requirements Analysis）
    - **如果制品已过期**：下一阶段是逆向工程（Reverse Engineering）（重跑以刷新制品）
    - **如果用户明确要求重跑**：无论是否过期，下一阶段都是逆向工程（Reverse Engineering）
- **如果没有逆向工程制品**：下一阶段是逆向工程（Reverse Engineering）

## 步骤 4：创建初始状态文件

创建 `aidlc-docs/aidlc-state.md`：

```markdown
# AI-DLC State Tracking

## Project Information
- **Project Type**: [Greenfield/Brownfield]
- **Start Date**: [ISO timestamp]
- **Current Stage**: INCEPTION - Workspace Detection

## Workspace State
- **Existing Code**: [Yes/No]
- **Reverse Engineering Needed**: [Yes/No]
- **Workspace Root**: [Absolute path]

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Stage Progress
[Will be populated as workflow progresses]
```

## 步骤 5：呈现完成消息

**对于 brownfield 项目：**
```markdown
# 🔍 Workspace Detection Complete

Workspace analysis findings:
• **Project Type**: Brownfield project
• [AI-generated summary of workspace findings in bullet points]
• **Next Step**: Proceeding to **Reverse Engineering** to analyze existing codebase...
```

**对于 greenfield 项目：**
```markdown
# 🔍 Workspace Detection Complete

Workspace analysis findings:
• **Project Type**: Greenfield project
• **Next Step**: Proceeding to **Requirements Analysis**...
```

## 步骤 6：自动继续

- **无需用户批准**——这仅是信息性的
- 自动进入下一阶段：
  - **Brownfield**：逆向工程（Reverse Engineering）（如果没有现有制品）或需求分析（Requirements Analysis）（如果制品存在）
  - **Greenfield**：需求分析（Requirements Analysis）
