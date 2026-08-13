# 内容验证规则

## 强制要求：文件创建前的内容验证

**关键**：所有生成的内容在写入文件前都必须经过验证，以防止解析错误。

## ASCII 图表标准

**关键**：在创建任何含 ASCII 图表的文件之前：

1. **加载** `ascii-diagram-standards.md`
2. **验证**每个图表：
   - 逐行统计字符数（所有行宽度必须相同）
   - 仅使用：`+` `-` `|` `^` `v` `<` `>` 和空格
   - 无 Unicode 制表符字符
   - 仅使用空格（无制表符）
3. **测试**通过验证方框角落垂直对齐来检查对齐

**模式与验证检查清单参见 `ascii-diagram-standards.md`。**

## Mermaid 图表验证

### 必需验证步骤
1. **语法检查**：在文件创建前验证 Mermaid 语法
2. **字符转义**：确保特殊字符被正确转义
3. **回退内容**：如果 Mermaid 验证失败，提供文本替代

### Mermaid 验证规则
```markdown
## BEFORE creating any file with Mermaid diagrams:

1. Check for invalid characters in node IDs (use alphanumeric + underscore only)
2. Escape special characters in labels: " → \" and ' → \'
3. Validate flowchart syntax: node connections must be valid
4. Test diagram parsing with simple validation

## FALLBACK: If Mermaid validation fails, use text-based workflow representation
```

### 实施模式
```markdown
## Workflow Visualization

### Mermaid Diagram (if syntax valid)
```mermaid
[validated diagram content]
```

### Text Alternative (always include)
```
Phase 1: INCEPTION
- Stage 1: Workspace Detection (COMPLETED)
- Stage 2: Requirements Analysis (COMPLETED)
[continue with text representation]
```
```

## 通用内容验证

### 创建前验证检查清单
- [ ] 验证嵌入的代码块（Mermaid、JSON、YAML）
- [ ] 检查特殊字符转义
- [ ] 验证 Markdown 语法正确性
- [ ] 测试内容解析兼容性
- [ ] 为复杂元素包含回退内容

### 错误预防规则
1. **在使用工具/命令写文件前始终验证**：绝不写入未验证的内容
2. **转义特殊字符**：特别是在图表和代码块中
3. **提供替代方案**：包含视觉内容的文本版本
4. **测试语法**：验证复杂内容结构

## 验证失败处理

### 当验证失败时
1. **记录错误**：记录什么未通过验证
2. **使用回退内容**：切换到基于文本的替代方案
3. **继续工作流**：不要让内容验证失败阻塞流程
4. **告知用户**：提及因解析限制而使用了简化内容
