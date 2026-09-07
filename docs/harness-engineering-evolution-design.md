# AI-DLC Workflows × Harness Engineering 演进设计文档

**日期**：2026-09-04
**状态**：待评审（设计稿，未实施）
**核心约束**：**所有改造只允许新增 `references/extensions/` 目录下的扩展文件，不修改亚马逊原始 AI-DLC 的任何内容**（SKILL.md、common/、inception/、construction/、operations/ 均保持原样）。

---

## 1. 背景：Harness Engineering（2025–2026）

Harness engineering 将编码智能体定义为 **Agent = Model + Harness**：harness 是围绕模型的持久软件层，负责上下文管理、工具、记忆、编排、验证、安全门与反馈回路。该概念由 Anthropic 生态推广、OpenAI 2026 年 2 月工程文章赋予制度化地位；LangChain、Cursor、Claude Code、OpenHands 等系统已各自落地 harness 架构。

aidlc-workflows 本质上是一个**纯提示词驱动的 harness**（规则文件即 harness 代码），其演进可直接对标 harness engineering 最佳实践。

**主要参考**：
- Wikipedia: Agent harness
- LangChain: *The Anatomy of an Agent Harness*
- arXiv 2602.14690: *Harness Engineering for Agentic AI Coding Tools*
- arXiv 2604.14228: *Dive into Claude Code: The Design Space of Today's and Future AI Coding Agents*
- arXiv 2603.25723: *Natural-Language Agent Harnesses*
- Cursor Cloud agents harness 架构分析（五层：interface / orchestration / execution / verification / output）
- OpenAI 2026-02 harness engineering 工程文章
- github.com/ai-boost/awesome-harness-engineering

## 2. 现状优势（保持不变的部分）

| 现有资产 | 对标的 harness 最佳实践 |
|---|---|
| `.opt-in.md` 延迟加载扩展机制 | Progressive disclosure / 上下文按需加载 |
| audit.md 原始输入 append-only + AUD 归属字段 | Instrumentation & auditability |
| APG 审批门语义分类（approve-hold / approve-continue） | Human escalation gates（比主流工具更精细） |
| AM-01~09 自主模式（触发检测/审查白名单/暂停/持久化） | Tunable autonomy |
| 自适应阶段深度（minimal/standard/comprehensive） | Planner-first 与 reactive 混合编排 |
| QT 组 question 工具流 | 结构化人机交互协议 |

## 3. 扩展化可行性

扩展规则启用后即为硬约束，可像 autonomous-mode 覆盖 APG/QT 一样，对既有阶段施加新义务或覆盖既有行为，**无需编辑任何原始文件**。每个扩展沿用现有约定：

- `*.opt-in.md` 轻量 stub：Requirements Analysis 时呈现 opt-in 问题；工作流启动时只加载 stub
- 同名 `.md` 全量规则：用户 opt-in 后延迟加载
- 规则含 **Rule 定义 + Verification + blocking finding 行为 + Enforcement Integration 表**（参照 property-based-testing.md 的成熟格式）
- 启用状态记录于 `aidlc-docs/aidlc-state.md` 的 `## Extension Configuration`

## 4. 差距分析与扩展设计

### G1（P0）：上下文可扩展性 —— Context Checkpointing

**状态：✅ 已实施（2026-09-04；2026-09-07 修订：明确 checkpoint 属 DOC-01 扫描范围）** —— `references/extensions/context/checkpointing/`（opt-in stub 29 行 + 规则 82 行）

**问题**：audit.md 无限追加；session-continuity.md 要求恢复时全量加载历史产物（"Code Stages: Load ALL artifacts"），长项目必然 context rot。2026 趋势：分层记忆 + context folding + 检查点压缩。

**扩展**：`references/extensions/context/checkpointing/`
- `checkpointing.opt-in.md` + `checkpointing.md`
- 规则组 **CTX-01~04**：
  - **CTX-01 阶段检查点**：每个 phase（Inception 结束、Construction 每个 unit 完成）结束时，写 `aidlc-docs/checkpoints/{phase-or-unit}-checkpoint.md`（≤200 行：关键决策、产物清单、核心约束、未完成项）；checkpoint 是当前状态快照而非历史记录（DOC-04 不适用），属 DOC-01 一致性扫描范围——变更波及时须同交互内就地更新
  - **CTX-02 恢复加载策略覆盖**：启用后**覆盖** session-continuity 的全量加载行为（参照 AM 覆盖 APG 的先例写法）——默认只加载最近 checkpoint + 当前阶段产物 + aidlc-state.md；全量产物仅在 checkpoint 标注缺失/冲突时按需回退加载
  - **CTX-03 audit.md 折叠**：每个 phase 结束追加压缩摘要条目；恢复时默认不全量读取 audit.md
  - **CTX-04 上下文预算**：每个阶段开始时声明本阶段最小必需上下文清单
- Enforcement Integration：Workspace Detection、Session Resumption、每个 phase 收尾

### G2（P0）：子智能体编排 —— Delegation

**问题**：所有阶段由主 agent 顺序执行，无分工。2026 趋势：planner/executor/verifier 分离、reviewer 子智能体、后台 agent。opencode 原生 task/subagent 机制可直接承载。

**扩展**：`references/extensions/workflow/delegation/`
- 规则组 **DEL-01~05**：
  - **DEL-01 逆向工程委派**：Reverse Engineering 的代码扫描委派 explore 类子智能体，主 agent 只做业务综合
  - **DEL-02 独立审查**：Construction 各阶段完成后可委派 reviewer 子智能体独立审查产出物，blocking 问题回退
  - **DEL-03 并行单元执行**：无依赖的 Units 可并行委派 executor 子智能体执行 Code Generation（≤5）
  - **DEL-04 结果回收**：子智能体返回摘要而非全文；委派与结果摘要记入 audit.md
  - **DEL-05 失败兜底**：子智能体失败最多重试一次，之后主 agent 接管
- 与 Autonomous Mode 正交：DEL 管"谁执行"，AM 管"要不要等审批"

### G3（P1）：评估闭环 —— Artifact Quality Evaluation

**问题**：Build & Test 只验证代码，不评估工作流产出物（需求/设计文档）质量。2026 标配三层评估：确定性检查 + LLM-as-judge + 人工抽样（SWE-Bench/AgencyBench 方法论）。

**扩展**：`references/extensions/evaluation/artifact-quality/`
- 规则组 **EVA-01~04**：
  - **EVA-01 确定性检查**：复用 content-validation + DOC-01 一致性扫描结果
  - **EVA-02 LLM-as-judge 清单**：阶段完成时按清单自评（需求可测试性、故事验收标准完整性、设计与需求追溯性），评分写入阶段完成消息
  - **EVA-03 人工抽样**：Autonomous Mode 下每 N 个自动批准的阶段提示用户抽样审查（防"自动批准漂移"）
  - **EVA-04 指标落盘**：评分与抽查结果记入 audit.md，形成质量时间线
- 待评审：EVA-02 自评是否形式主义？可简化为只做 EVA-03

### G4（P1）：连续验证 —— Continuous Verification

**问题**：验证集中在 Build & Test 末尾，错误发现太晚。趋势：verify-at-every-step。

**扩展**：`references/extensions/testing/continuous-verification/`
- 规则组 **CV-01~03**：
  - **CV-01 步骤级验证**：Code Generation Part 2 的每个计划步骤完成后，立即运行该步骤的最小验证（编译/lint/相关单测），通过后才允许勾选 `[x]`
  - **CV-02 失败即修**：验证失败须先修复再推进，禁止"先勾选后补修"
  - **CV-03 与 DOC-03 协同**：呼应"Code-green is not completion-green"，将验证前移到步骤级
- 参照 PBT 对 Code Generation 阶段追加义务的模式，纯扩展可实现

### G5（P2）：生产就绪 —— Production Readiness

**问题**：Operations 阶段是占位符。在不修改 operations.md 的前提下，以扩展形式提供部署前价值。

**扩展**：`references/extensions/operations/production-readiness/`
- 规则组 **PR-01~04**：
  - **PR-01 检查清单生成**：Build & Test 完成后生成 `aidlc-docs/operations/production-readiness-checklist.md`（构建产物、配置外部化、密钥管理、日志/监控埋点、回滚方案）
  - **PR-02 扩展联动**：启用 security/resiliency 扩展时，检查清单自动纳入对应基线条目
  - **PR-03 逐项确认**：检查清单各项需标记 Ready / N/A / Blocked 并附理由
  - **PR-04 审计**：清单完成情况记入 audit.md

### G6（P2）：项目回顾 —— Retrospective

**问题**：项目结束后经验不沉淀。趋势：harness 自优化（此处采用人工把关的安全版本）。

**扩展**：`references/extensions/workflow/retrospective/`
- 规则组 **RET-01~03**：
  - **RET-01 回顾触发**：Build & Test 完成后（可选）执行回顾：哪些深度选错、哪些问题反复问、哪些扩展应默认开启
  - **RET-02 经验沉淀**：结论追加到项目根 `AGENTS.md` 的 "Lessons Learned" 区，供后续会话的 harness 使用
  - **RET-03 只增不改**：只追加、不改写历史经验（对齐 DOC-04）

### G7（P3，暂缓）：权限/回滚模型、OpenSpec 互操作

- 权限模型依赖执行环境（opencode 已有 permission 配置），技能层重复定义价值低；如需，仅在 security 扩展补"破坏性操作须可逆"原则
- OpenSpec 互操作待实际双系统并用需求出现时再做

## 5. 目标目录结构（全部新增，零修改原始文件）

```text
references/extensions/
├── context/
│   └── checkpointing/
│       ├── checkpointing.opt-in.md      # 新增
│       └── checkpointing.md             # 新增
├── workflow/
│   ├── autonomous-mode/                 # 既有，不动
│   ├── workflow-conventions/            # 既有，不动
│   ├── delegation/
│   │   ├── delegation.opt-in.md         # 新增
│   │   └── delegation.md                # 新增
│   └── retrospective/
│       ├── retrospective.opt-in.md      # 新增
│       └── retrospective.md             # 新增
├── evaluation/
│   └── artifact-quality/
│       ├── artifact-quality.opt-in.md   # 新增
│       └── artifact-quality.md          # 新增
├── testing/
│   ├── property-based/                  # 既有，不动
│   └── continuous-verification/
│       ├── continuous-verification.opt-in.md  # 新增
│       └── continuous-verification.md         # 新增
└── operations/
    └── production-readiness/
        ├── production-readiness.opt-in.md     # 新增
        └── production-readiness.md            # 新增
```

**注意**：SKILL.md 的 Extensions Loading 机制按目录递归扫描 `*.opt-in.md`，新扩展**自动被发现**，无需修改 SKILL.md。

## 6. 实施路线图

| 批次 | 内容 | 规模 |
|---|---|---|
| Batch 1 | G1 checkpointing + G2 delegation | 4 个新文件 |
| Batch 2 | G4 continuous-verification + G3 artifact-quality | 4 个新文件 |
| Batch 3 | G5 production-readiness + G6 retrospective | 4 个新文件 |

每批完成后：用真实项目走一遍工作流验证扩展被正确发现、opt-in、加载与执行；按需更新本仓库 README/AGENTS 相关说明。

## 7. 待评审决议点

1. **CTX-02 语义覆盖**：checkpoint 优先 + 按需回退，是对 session-continuity 恢复行为的覆盖（仅启用扩展时生效），是否接受？
2. **EVA-02 LLM-as-judge 自评**是否形式主义？可否简化为只做 EVA-03 人工抽样？
3. **DEL-03 并行单元执行**在交互式会话中价值有限（主要受益者是 Autonomous Mode），是否保留？
4. 批次划分是否合适，还是先只做 Batch 1 看效果？
