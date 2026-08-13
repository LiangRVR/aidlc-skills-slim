# 问题格式指南

## 强制要求：所有问题必须使用此格式

### 规则：绝不在聊天中提问
**关键**：你绝不能直接在聊天中提问。所有问题必须放在专门的问题文件中。

### 问题文件格式

#### 文件命名约定
- 使用描述性名称：`{phase-name}-questions.md`
- 示例：
  - `classification-questions.md`
  - `requirements-questions.md`
  - `story-planning-questions.md`
  - `design-questions.md`

#### 问题结构
每个问题必须包含有意义的选项，外加作为最后一个选项的"其他"：

```markdown
## Question [Number]
[Clear, specific question text]

A) [First meaningful option]

B) [Second meaningful option]

[...additional options as needed...]

X) Other (please describe after [Answer]: tag below)

[Answer]: 
```

**关键**：
- 每个问题的**最后一个选项**必须是"其他"（强制要求）
- 只包含有意义的选项——不要编造选项来填空位
- 选项数量按需而定，可多可少（最少 2 个有意义的选项 + 其他）
- **每个选项之间必须用空行分隔**，这样严格的 CommonMark 渲染器（IntelliJ、PyCharm 等）会将它们显示在不同的行上，而不是折叠成一个段落

### 完整示例

```markdown
# Requirements Clarification Questions

Please answer the following questions to help clarify the requirements.

## Question 1
What is the primary user authentication method?

A) Username and password

B) Social media login (Google, Facebook)

C) Single Sign-On (SSO)

D) Multi-factor authentication

E) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 2
Will this be a web or mobile application?

A) Web application

B) Mobile application

C) Both web and mobile

D) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 3
Is this a new project or existing codebase?

A) New project (greenfield)

B) Existing codebase (brownfield)

C) Other (please describe after [Answer]: tag below)

[Answer]: 
```

### 用户响应格式
用户将通过在 [Answer]: 标签后填写字母选项来回答：

```markdown
## Question 1
What is the primary user authentication method?

A) Username and password

B) Social media login (Google, Facebook)

C) Single Sign-On (SSO)

D) Multi-factor authentication

[Answer]: C
```

### 读取用户响应
在用户确认完成后：
1. 读取问题文件
2. 提取 [Answer]: 标签后的答案
3. 验证所有问题都已回答
4. 基于响应继续分析

### 多项选择指南

#### 选项数量
- 最少：2 个有意义的选项 + "其他"（A、B、C）
- 典型：3-4 个有意义的选项 + "其他"（A、B、C、D、E）
- 最多：5 个有意义的选项 + "其他"（A、B、C、D、E、F）
- **关键**：不要为了填空位而编造选项——只包含有意义的选择

#### 选项质量
- 使选项互斥
- 覆盖最常见的场景
- 只包含有意义、现实的选项
- **始终包含"其他"作为最后一个选项**（强制要求）
- 要具体清晰
- **不要编造选项来填充 A、B、C、D 空位**

#### 好示例：
```markdown
## Question 5
What database technology will be used?

A) Relational (PostgreSQL, MySQL)

B) NoSQL Document (MongoDB, DynamoDB)

C) NoSQL Key-Value (Redis, Memcached)

D) Graph Database (Neo4j, Neptune)

E) Other (please describe after [Answer]: tag below)

[Answer]: 
```

#### 坏示例（应避免）：
```markdown
## Question 5
What database will you use?

A) Yes

B) No

C) Maybe

[Answer]: 
```

### 工作流集成

#### 第 1 步：创建问题文件
```markdown
Create aidlc-docs/{phase-name}-questions.md with all questions
```

#### 第 2 步：告知用户
```
"I've created {phase-name}-questions.md with [X] questions. 
Please answer each question by filling in the letter choice after the [Answer]: tag. 
If none of the options match your needs, choose the last option (Other) and describe your preference. Let me know when you're done."
```

#### 第 3 步：等待确认
等待用户说"done"、"completed"、"finished"或类似的话。

#### 第 4 步：读取并分析
```
Read aidlc-docs/{phase-name}-questions.md
Extract all answers
Validate completeness
Proceed with analysis
```

### 错误处理

#### 答案缺失
如果任何 [Answer]: 标签为空：
```
"I noticed Question [X] is not answered. Please provide an answer using one of the letter choices 
for all questions before proceeding."
```

#### 无效答案
如果答案不是有效的字母选项：
```
"Question [X] has an invalid answer '[answer]'. 
Please use only the letter choices provided in the question."
```

#### 含糊答案
如果用户提供的是解释而不是字母：
```
"For Question [X], please provide the letter choice that best matches your answer. 
If none match, choose 'Other' and add your description after the [Answer]: tag."
```

### 矛盾与歧义检测

**强制要求**：读取用户响应后，必须检查矛盾与歧义。

#### 检测矛盾
寻找逻辑上不一致的答案：
- 范围不匹配："缺陷修复"但"影响整个代码库"
- 风险不匹配："低风险"但"破坏性变更"
- 时间线不匹配："快速修复"但"多个子系统"
- 影响不匹配："单组件"但"重大架构变更"

#### 检测歧义
寻找不清晰或处于边缘的响应：
- 可能符合多个分类的答案
- 缺乏具体性的响应
- 跨多个问题的冲突指标

#### 创建澄清问题
如果检测到矛盾或歧义：

1. **创建澄清文件**：`{phase-name}-clarification-questions.md`
2. **解释问题**：清楚地说明检测到了什么矛盾/歧义
3. **提出针对性问题**：使用多项选择格式解决问题
4. **引用原始问题**：显示哪些问题的答案存在冲突

**示例**：
```markdown
# [Phase Name] Clarification Questions

I detected contradictions in your responses that need clarification:

## Contradiction 1: [Brief Description]
You indicated "[Answer A]" (Q[X]:[Letter]) but also "[Answer B]" (Q[Y]:[Letter]).
These responses are contradictory because [explanation].

### Clarification Question 1
[Specific question to resolve contradiction]

A) [Option that resolves toward first answer]

B) [Option that resolves toward second answer]

C) [Option that provides middle ground]

D) [Option that reframes the question]

[Answer]: 

## Ambiguity 1: [Brief Description]
Your response to Q[X] ("[Answer]") is ambiguous because [explanation].

### Clarification Question 2
[Specific question to clarify ambiguity]

A) [Clear option 1]

B) [Clear option 2]

C) [Clear option 3]

D) [Clear option 4]

[Answer]: 
```

#### 澄清工作流

1. **检测**：分析所有响应中的矛盾/歧义
2. **创建**：如果发现问题，生成澄清问题文件
3. **告知**：告诉用户问题和澄清文件
4. **等待**：在用户提供澄清之前不要继续
5. **重新验证**：澄清后，再次检查一致性
6. **继续**：仅在解决所有矛盾后前进

#### 示例用户消息
```
"I detected 2 contradictions in your responses:

1. Bug fix scope vs. codebase impact (Q1 vs Q2)
2. Low risk vs. breaking changes (Q7 vs Q4)

I've created classification-clarification-questions.md with 2 questions to resolve these.
Please answer these clarifying questions before I can proceed with classification."
```

### 最佳实践

1. **要具体**：问题应清晰无歧义
2. **要全面**：覆盖所有必要信息
3. **要简洁**：保持问题聚焦于一个主题
4. **要实用**：选项应现实且可操作
5. **要一致**：在所有问题文件中使用相同格式

### 特定子阶段示例

#### 2 个有意义的选项示例：
```markdown
## Question 1
Is this a new project or existing codebase?

A) New project (greenfield)

B) Existing codebase (brownfield)

C) Other (please describe after [Answer]: tag below)

[Answer]: 
```

#### 3 个有意义的选项示例：
```markdown
## Question 2
What is the deployment target?

A) Cloud (AWS, Azure, GCP)

B) On-premises servers

C) Hybrid (both cloud and on-premises)

D) Other (please describe after [Answer]: tag below)

[Answer]: 
```

#### 4 个有意义的选项示例：
```markdown
## Question 3
What architectural pattern should be used?

A) Monolithic architecture

B) Microservices architecture

C) Serverless architecture

D) Event-driven architecture

E) Other (please describe after [Answer]: tag below)

[Answer]: 
```

## 总结

**记住**：
- ✅ 始终创建问题文件
- ✅ 始终使用多项选择格式
- ✅ **始终包含"其他"作为最后一个选项（强制要求）**
- ✅ 只包含有意义的选项——不要编造选项来填空位
- ✅ 始终使用 [Answer]: 标签
- ✅ 始终等待用户完成
- ✅ 始终验证响应中的矛盾
- ✅ 需要时始终创建澄清文件
- ✅ 始终在继续前解决矛盾
- ❌ 绝不在聊天中提问
- ❌ 绝不编造选项只是为了凑齐 A、B、C、D
- ❌ 绝不在没有答案的情况下继续
- ❌ 绝不带着未解决的矛盾继续
- ❌ 绝不对含糊的响应做出假设
