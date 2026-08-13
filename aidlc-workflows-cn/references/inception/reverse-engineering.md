# 逆向工程（Reverse Engineering）

**目的**：分析现有代码库并生成全面的设计制品

**执行时机**：检测到 brownfield 项目时（工作区中存在现有代码）

**跳过时机**：greenfield 项目（无现有代码）

**重跑行为**：重跑由 workspace-detection.md 控制。如果发现现有的逆向工程制品且仍是最新的，则加载它们并跳过逆向工程。如果制品已过期（早于代码库最后一次重大修改）或用户明确要求重跑，则重新执行逆向工程以确保制品反映当前的代码状态

## 步骤 1：多包发现

### 1.1 扫描工作区
- 所有包（不仅是提到的那些）
- 通过配置文件了解包间关系
- 包类型：应用程序（Application）、CDK/基础设施（CDK/Infrastructure）、模型（Models）、客户端（Clients）、测试（Tests）

### 1.2 理解业务上下文
- 系统整体上实现的核心业务
- 每个包的业务概述
- 系统中实现的业务交易（Business Transactions）列表

### 1.3 基础设施发现
- CDK 包（含 CDK 依赖的 package.json）
- Terraform（.tf 文件）
- CloudFormation（.yaml/.json 模板）
- 部署脚本

### 1.4 构建系统发现
- 构建系统：Brazil, Maven, Gradle, npm
- 构建系统声明的配置文件
- 包之间的构建依赖

### 1.5 服务架构发现
- Lambda 函数（处理器、触发器）
- 容器服务（Docker/ECS 配置）
- API 定义（Smithy 模型、OpenAPI 规范）
- 数据存储（DynamoDB、S3 等）

### 1.6 代码质量分析
- 编程语言和框架
- 测试覆盖率指标
- Linting 配置
- CI/CD 流水线

## 步骤 2：生成业务概述文档

创建 `aidlc-docs/inception/reverse-engineering/business-overview.md`：

```markdown
# Business Overview

## Business Context Diagram
[Mermaid diagram showing the Business Context]

## Business Description
- **Business Description**: [Overall Business description of what the system does]
- **Business Transactions**: [List of Business Transactions that the system implements and their descriptions]
- **Business Dictionary**: [Business dictionary terms that the system follows and their meaning]

## Component Level Business Descriptions
### [Package/Component Name]
- **Purpose**: [What it does from the business perspective]
- **Responsibilities**: [Key responsibilities]
```

## 步骤 3：生成架构文档

创建 `aidlc-docs/inception/reverse-engineering/architecture.md`：

```markdown
# System Architecture

## System Overview
[High-level description of the system]

## Architecture Diagram
[Mermaid diagram showing all packages, services, data stores, relationships]

## Component Descriptions
### [Package/Component Name]
- **Purpose**: [What it does]
- **Responsibilities**: [Key responsibilities]
- **Dependencies**: [What it depends on]
- **Type**: [Application/Infrastructure/Model/Client/Test]

## Data Flow
[Mermaid sequence diagram of key workflows]

## Integration Points
- **External APIs**: [List with purposes]
- **Databases**: [List with purposes]
- **Third-party Services**: [List with purposes]

## Infrastructure Components
- **CDK Stacks**: [List with purposes]
- **Deployment Model**: [Description]
- **Networking**: [VPC, subnets, security groups]
```

## 步骤 4：生成代码结构文档

创建 `aidlc-docs/inception/reverse-engineering/code-structure.md`：

```markdown
# Code Structure

## Build System
- **Type**: [Maven/Gradle/npm/Brazil]
- **Configuration**: [Key build files and settings]

## Key Classes/Modules
[Mermaid class diagram or module hierarchy]

### Existing Files Inventory
[List all source files with their purposes - these are candidates for modification in brownfield projects]

**Example format**:
- `[path/to/file]` - [Purpose/responsibility]

## Design Patterns
### [Pattern Name]
- **Location**: [Where used]
- **Purpose**: [Why used]
- **Implementation**: [How implemented]

## Critical Dependencies
### [Dependency Name]
- **Version**: [Version number]
- **Usage**: [How and where used]
- **Purpose**: [Why needed]
```

## 步骤 5：生成 API 文档

创建 `aidlc-docs/inception/reverse-engineering/api-documentation.md`：

```markdown
# API Documentation

## REST APIs
### [Endpoint Name]
- **Method**: [GET/POST/PUT/DELETE]
- **Path**: [/api/path]
- **Purpose**: [What it does]
- **Request**: [Request format]
- **Response**: [Response format]

## Internal APIs
### [Interface/Class Name]
- **Methods**: [List with signatures]
- **Parameters**: [Parameter descriptions]
- **Return Types**: [Return type descriptions]

## Data Models
### [Model Name]
- **Fields**: [Field descriptions]
- **Relationships**: [Related models]
- **Validation**: [Validation rules]
```

## 步骤 6：生成组件清单

创建 `aidlc-docs/inception/reverse-engineering/component-inventory.md`：

```markdown
# Component Inventory

## Application Packages
- [Package name] - [Purpose]

## Infrastructure Packages
- [Package name] - [CDK/Terraform] - [Purpose]

## Shared Packages
- [Package name] - [Models/Utilities/Clients] - [Purpose]

## Test Packages
- [Package name] - [Integration/Load/Unit] - [Purpose]

## Total Count
- **Total Packages**: [Number]
- **Application**: [Number]
- **Infrastructure**: [Number]
- **Shared**: [Number]
- **Test**: [Number]
```

## 步骤 7：生成技术栈文档

创建 `aidlc-docs/inception/reverse-engineering/technology-stack.md`：

```markdown
# Technology Stack

## Programming Languages
- [Language] - [Version] - [Usage]

## Frameworks
- [Framework] - [Version] - [Purpose]

## Infrastructure
- [Service] - [Purpose]

## Build Tools
- [Tool] - [Version] - [Purpose]

## Testing Tools
- [Tool] - [Version] - [Purpose]
```

## 步骤 8：生成依赖文档

创建 `aidlc-docs/inception/reverse-engineering/dependencies.md`：

```markdown
# Dependencies

## Internal Dependencies
[Mermaid diagram showing package dependencies]

### [Package A] depends on [Package B]
- **Type**: [Compile/Runtime/Test]
- **Reason**: [Why dependency exists]

## External Dependencies
### [Dependency Name]
- **Version**: [Version]
- **Purpose**: [Why used]
- **License**: [License type]
```

## 步骤 9：生成代码质量评估

创建 `aidlc-docs/inception/reverse-engineering/code-quality-assessment.md`：

```markdown
# Code Quality Assessment

## Test Coverage
- **Overall**: [Percentage or Good/Fair/Poor/None]
- **Unit Tests**: [Status]
- **Integration Tests**: [Status]

## Code Quality Indicators
- **Linting**: [Configured/Not configured]
- **Code Style**: [Consistent/Inconsistent]
- **Documentation**: [Good/Fair/Poor]

## Technical Debt
- [Issue description and location]

## Patterns and Anti-patterns
- **Good Patterns**: [List]
- **Anti-patterns**: [List with locations]
```

## 步骤 10：创建时间戳文件

创建 `aidlc-docs/inception/reverse-engineering/reverse-engineering-timestamp.md`：

```markdown
# Reverse Engineering Metadata

**Analysis Date**: [ISO timestamp]
**Analyzer**: AI-DLC
**Workspace**: [Workspace path]
**Total Files Analyzed**: [Number]

## Artifacts Generated
- [x] architecture.md
- [x] code-structure.md
- [x] api-documentation.md
- [x] component-inventory.md
- [x] technology-stack.md
- [x] dependencies.md
- [x] code-quality-assessment.md
```

## 步骤 11：更新状态跟踪

更新 `aidlc-docs/aidlc-state.md`：

```markdown
## Reverse Engineering Status
- [x] Reverse Engineering - Completed on [timestamp]
- **Artifacts Location**: aidlc-docs/inception/reverse-engineering/
```

## 步骤 12：向用户呈现完成消息

```markdown
# 🔍 Reverse Engineering Complete

[AI-generated summary of key findings from analysis in the form of bullet points]

> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the reverse engineering artifacts at: `aidlc-docs/inception/reverse-engineering/`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the reverse engineering analysis if required
> ✅ **Approve & Continue** - Approve analysis and proceed to **Requirements Analysis**
```

## 步骤 13：等待用户批准

- **强制（MANDATORY）**：在用户明确批准之前不得继续
- **强制（MANDATORY）**：在 audit.md 中记录用户的回复，包含完整的原始输入
