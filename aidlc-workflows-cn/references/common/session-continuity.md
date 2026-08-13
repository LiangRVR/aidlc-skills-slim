# 会话连续性模板

## 欢迎回来提示模板
当用户返回继续处理现有的 AI-DLC 项目时，呈现此提示：

```markdown
**Welcome back! I can see you have an existing AI-DLC project in progress.**

Based on your aidlc-state.md, here's your current status:
- **Project**: [project-name]
- **Current Phase**: [INCEPTION/CONSTRUCTION/OPERATIONS]
- **Current Stage**: [Stage Name]
- **Last Completed**: [Last completed step]
- **Next Step**: [Next step to work on]

**What would you like to work on today?**

A) Continue where you left off ([Next step description])

B) Review a previous stage ([Show available stages])

[Answer]: 
```

## 强制要求：会话连续性指令
1. **检测到现有项目时，始终先读取 aidlc-state.md**
2. **从工作流文件解析当前状态**以填充提示
3. **强制要求：加载先前子阶段制品** - 在恢复任何子阶段之前，自动读取先前子阶段的所有相关制品：
   - **逆向工程**：读取 architecture.md、code-structure.md、api-documentation.md
   - **需求分析**：读取 requirements.md、requirement-verification-questions.md
   - **用户故事**：读取 stories.md、personas.md、story-generation-plan.md
   - **应用设计**：读取应用设计制品（components.md、component-methods.md、services.md）
   - **设计（工作单元）**：读取 unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md
   - **按单元设计**：按单元制品位于 `aidlc-docs/construction/{unit-name}/` 下的 `functional-design/`、`nfr-requirements/`、`nfr-design/` 和 `infrastructure-design/` 子目录中。恢复时，从 `aidlc-state.md` 确定进行中的工作单元，并加载该单元的设计制品，以及它依赖的任何单元的设计制品（依据 `unit-of-work-dependency.md`）。每个子目录中的确切文件由相应的 CONSTRUCTION 子阶段规则枚举。
   - **代码子阶段**：读取所有代码文件、计划以及所有先前制品
4. **按子阶段智能加载上下文**：
   - **早期子阶段（工作区检测、逆向工程）**：加载工作区分析
   - **需求/故事**：加载逆向工程 + 需求制品
   - **设计子阶段**：加载需求 + 故事 + 架构 + 设计制品
   - **代码子阶段**：加载所有制品 + 现有代码文件
5. **根据架构选择和当前阶段调整选项**
6. **显示具体的下一步**，而非泛泛的描述
7. **在 audit.md 中记录连续性提示**并带时间戳
8. **上下文摘要**：加载制品后，简要总结加载了什么，让用户知晓
9. **提问**：始终通过将问题放入 .md 文件来提出澄清或用户反馈问题。不要将多项选择题放在聊天的对话流中。

## 错误处理
如果在会话恢复期间制品缺失或损坏，关于恢复流程的指导参见 [error-handling.md](error-handling.md)。
