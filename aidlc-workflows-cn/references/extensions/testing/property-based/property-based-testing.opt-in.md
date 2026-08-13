# 基于属性的测试 — 选择加入（Opt-In）

**扩展**：基于属性的测试

## 选择加入提示

加载此扩展后，以下问题会自动包含在需求分析（Requirements Analysis）的澄清问题中：

```markdown
## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: 
```
