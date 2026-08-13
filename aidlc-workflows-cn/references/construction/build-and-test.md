# 构建与测试

**目的**：构建所有单元并执行全面的测试策略

## 前置条件
- 所有单元的代码生成必须完成
- 所有代码制品必须已生成
- 项目已准备好进行构建和测试

---

## 第 1 步：分析测试需求

分析项目以确定合适的测试策略：
- **单元测试**：在代码生成期间已按单元生成
- **集成测试**：测试单元/服务之间的交互
- **性能测试**：负载、压力和可扩展性测试
- **端到端测试**：完整的用户工作流
- **契约测试**：服务之间的 API 契约验证
- **安全测试**：漏洞扫描、渗透测试

---

## 第 2 步：生成构建说明

创建 `aidlc-docs/construction/build-and-test/build-instructions.md`：

```markdown
# Build Instructions

## Prerequisites
- **Build Tool**: [Tool name and version]
- **Dependencies**: [List all required dependencies]
- **Environment Variables**: [List required env vars]
- **System Requirements**: [OS, memory, disk space]

## Build Steps

### 1. Install Dependencies
\`\`\`bash
[Command to install dependencies]
# Example: npm install, mvn dependency:resolve, pip install -r requirements.txt
\`\`\`

### 2. Configure Environment
\`\`\`bash
[Commands to set up environment]
# Example: export variables, configure credentials
\`\`\`

### 3. Build All Units
\`\`\`bash
[Command to build all units]
# Example: mvn clean install, npm run build, brazil-build
\`\`\`

### 4. Verify Build Success
- **Expected Output**: [Describe successful build output]
- **Build Artifacts**: [List generated artifacts and locations]
- **Common Warnings**: [Note any acceptable warnings]

## Troubleshooting

### Build Fails with Dependency Errors
- **Cause**: [Common causes]
- **Solution**: [Step-by-step fix]

### Build Fails with Compilation Errors
- **Cause**: [Common causes]
- **Solution**: [Step-by-step fix]
```

---

## 第 3 步：生成单元测试执行说明

创建 `aidlc-docs/construction/build-and-test/unit-test-instructions.md`：

```markdown
# Unit Test Execution

## Run Unit Tests

### 1. Execute All Unit Tests
\`\`\`bash
[Command to run all unit tests]
# Example: mvn test, npm test, pytest tests/unit
\`\`\`

### 2. Review Test Results
- **Expected**: [X] tests pass, 0 failures
- **Test Coverage**: [Expected coverage percentage]
- **Test Report Location**: [Path to test reports]

### 3. Fix Failing Tests
If tests fail:
1. Review test output in [location]
2. Identify failing test cases
3. Fix code issues
4. Rerun tests until all pass
```

---

## 第 4 步：生成集成测试说明

创建 `aidlc-docs/construction/build-and-test/integration-test-instructions.md`：

```markdown
# Integration Test Instructions

## Purpose
Test interactions between units/services to ensure they work together correctly.

## Test Scenarios

### Scenario 1: [Unit A] → [Unit B] Integration
- **Description**: [What is being tested]
- **Setup**: [Required test environment setup]
- **Test Steps**: [Step-by-step test execution]
- **Expected Results**: [What should happen]
- **Cleanup**: [How to clean up after test]

### Scenario 2: [Unit B] → [Unit C] Integration
[Similar structure]

## Setup Integration Test Environment

### 1. Start Required Services
\`\`\`bash
[Commands to start services]
# Example: docker-compose up, start test database
\`\`\`

### 2. Configure Service Endpoints
\`\`\`bash
[Commands to configure endpoints]
# Example: export API_URL=http://localhost:8080
\`\`\`

## Run Integration Tests

### 1. Execute Integration Test Suite
\`\`\`bash
[Command to run integration tests]
# Example: mvn integration-test, npm run test:integration
\`\`\`

### 2. Verify Service Interactions
- **Test Scenarios**: [List key integration test scenarios]
- **Expected Results**: [Describe expected outcomes]
- **Logs Location**: [Where to check logs]

### 3. Cleanup
\`\`\`bash
[Commands to clean up test environment]
# Example: docker-compose down, stop test services
\`\`\`
```

---

## 第 5 步：生成性能测试说明（如适用）

创建 `aidlc-docs/construction/build-and-test/performance-test-instructions.md`：

```markdown
# Performance Test Instructions

## Purpose
Validate system performance under load to ensure it meets requirements.

## Performance Requirements
- **Response Time**: < [X]ms for [Y]% of requests
- **Throughput**: [X] requests/second
- **Concurrent Users**: Support [X] concurrent users
- **Error Rate**: < [X]%

## Setup Performance Test Environment

### 1. Prepare Test Environment
\`\`\`bash
[Commands to set up performance testing]
# Example: scale services, configure load balancers
\`\`\`

### 2. Configure Test Parameters
- **Test Duration**: [X] minutes
- **Ramp-up Time**: [X] seconds
- **Virtual Users**: [X] users

## Run Performance Tests

### 1. Execute Load Tests
\`\`\`bash
[Command to run load tests]
# Example: jmeter -n -t test.jmx, k6 run script.js
\`\`\`

### 2. Execute Stress Tests
\`\`\`bash
[Command to run stress tests]
# Example: gradually increase load until failure
\`\`\`

### 3. Analyze Performance Results
- **Response Time**: [Actual vs Expected]
- **Throughput**: [Actual vs Expected]
- **Error Rate**: [Actual vs Expected]
- **Bottlenecks**: [Identified bottlenecks]
- **Results Location**: [Path to performance reports]

## Performance Optimization

If performance doesn't meet requirements:
1. Identify bottlenecks from test results
2. Optimize code/queries/configurations
3. Rerun tests to validate improvements
```

---

## 第 6 步：生成附加测试说明（按需）

根据项目需求，生成额外的测试说明文件：

### 契约测试（适用于微服务）
创建 `aidlc-docs/construction/build-and-test/contract-test-instructions.md`：
- 服务之间的 API 契约验证
- 消费者驱动的契约测试
- Schema 验证

### 安全测试
创建 `aidlc-docs/construction/build-and-test/security-test-instructions.md`：
- 漏洞扫描
- 依赖安全检查
- 身份验证/授权测试
- 输入验证测试

### 端到端测试
创建 `aidlc-docs/construction/build-and-test/e2e-test-instructions.md`：
- 完整的用户工作流测试
- 跨服务场景
- UI 测试（如适用）

---

## 第 7 步：生成测试总结

创建 `aidlc-docs/construction/build-and-test/build-and-test-summary.md`：

```markdown
# Build and Test Summary

## Build Status
- **Build Tool**: [Tool name]
- **Build Status**: [Success/Failed]
- **Build Artifacts**: [List artifacts]
- **Build Time**: [Duration]

## Test Execution Summary

### Unit Tests
- **Total Tests**: [X]
- **Passed**: [X]
- **Failed**: [X]
- **Coverage**: [X]%
- **Status**: [Pass/Fail]

### Integration Tests
- **Test Scenarios**: [X]
- **Passed**: [X]
- **Failed**: [X]
- **Status**: [Pass/Fail]

### Performance Tests
- **Response Time**: [Actual] (Target: [Expected])
- **Throughput**: [Actual] (Target: [Expected])
- **Error Rate**: [Actual] (Target: [Expected])
- **Status**: [Pass/Fail]

### Additional Tests
- **Contract Tests**: [Pass/Fail/N/A]
- **Security Tests**: [Pass/Fail/N/A]
- **E2E Tests**: [Pass/Fail/N/A]

## Overall Status
- **Build**: [Success/Failed]
- **All Tests**: [Pass/Fail]
- **Ready for Operations**: [Yes/No]

## Next Steps
[If all pass]: Ready to proceed to Operations phase for deployment planning
[If failures]: Address failing tests and rebuild
```

---

## 第 8 步：更新状态跟踪

更新 `aidlc-docs/aidlc-state.md`：
- 将构建和测试阶段标记为完成
- 更新当前状态

---

## 第 9 步：向用户呈现结果

按以下结构呈现完成消息：
     1. **完成公告**（必需）：始终以此开头：

```markdown
# 🔨 Build and Test Complete
```

     2. **AI 摘要**（可选）：提供构建和测试结果的结构化要点摘要
        - 格式："构建和测试已完成，结果如下："
        - 列出构建状态和制品
        - 按类别（单元、集成、性能等）列出测试结果
        - 列出生成的说明文件
        - 不要包含工作流指令（"请审阅"、"请告知"、"进入下一阶段"、"在我们继续之前"）
        - 保持事实性和内容导向
     3. **格式化工作流消息**（必需）：始终以此精确格式结尾：

```markdown
> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the build and test summary at: `aidlc-docs/construction/build-and-test/build-and-test-summary.md`



> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the build and test instructions based on your review
> ✅ **Approve & Continue** - Approve build and test results and proceed to **Operations**

---
```

---

## 第 10 步：记录交互

**强制要求**：在 `aidlc-docs/audit.md` 中记录阶段完成情况：

```markdown
## Build and Test Stage
**Timestamp**: [ISO timestamp]
**Build Status**: [Success/Failed]
**Test Status**: [Pass/Fail]
**Files Generated**:
- build-instructions.md
- unit-test-instructions.md
- integration-test-instructions.md
- performance-test-instructions.md
- build-and-test-summary.md

---
```
