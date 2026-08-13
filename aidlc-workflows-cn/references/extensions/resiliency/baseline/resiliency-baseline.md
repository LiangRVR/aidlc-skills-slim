# 基线弹性规则

## 概述
这些弹性规则是适用于所有 AI-DLC 阶段的强制性（MANDATORY）横切约束。它们源自成熟的云可靠性框架（例如 AWS Well-Architected Reliability Pillar 和弹性最佳实践），并适用于任何云提供商上的工作负载。规则按六大支柱组织：业务目标（Business Goals）、变更管理与自动化（Change Management & Automation）、集成可观测性（Integrated Observability）、高可用性（High Availability）、灾难恢复（Disaster Recovery）和持续改进（Continuous Improvement）。

**强制执行（Enforcement）**：在每个适用阶段，模型在向用户呈现阶段完成消息之前，必须核验是否符合这些规则。

### 阻断性弹性发现行为
**阻断性弹性发现（blocking resiliency finding）** 意味着：
1. 该发现必须在阶段完成消息的 "Resiliency Findings" 部分下列出，并附上 RESILIENCY 规则编号和描述
2. 在所有阻断性发现解决之前，阶段不得提供 "Continue to Next Stage"（继续到下一阶段）选项
3. 模型只能提供 "Request Changes"（请求变更）选项，并清楚说明需要变更的内容
4. 该发现必须记录到 `aidlc-docs/audit.md` 中，并附上 RESILIENCY 规则编号、描述和阶段上下文

如果某条 RESILIENCY 规则不适用于当前项目（例如没有有状态数据时的 RESILIENCY-07），请在合规性摘要中将其标记为 **N/A** —— 这不属于阻断性发现。

### 默认强制执行
本文档中的所有规则默认都是**阻断性**的。如果任何规则的核验标准未满足，即为阻断性弹性发现 —— 请遵循上述阻断性发现行为。

### 核验标准格式
本文档中的核验项是描述合规性检查的普通要点，不同于阶段计划文件中用于进度跟踪的 `- [ ]` / `- [x]` 复选框。审查期间，每个条目都应评估为合规或不合规。

### 用户决策点（模型必须提问，不得自行决定）
本扩展遵循 AI-DLC 原则：架构和流程决策属于用户，而非 LLM。模型必须提出下方规则中定义的澄清问题并使用用户的回答 —— 不得替用户默默做选择。明确交由用户决策的事项如下：

| 决策 | 规则 | 提出的问题 |
|---|---|---|
| RTO/RPO 目标与灾难恢复策略 | RESILIENCY-02 | 灾难恢复策略选择（备份与恢复 → 双活） |
| 变更管理流程 | RESILIENCY-03 | 使用现有组织流程 vs 提议新流程 vs 豁免 |
| CI/CD 工具链 | RESILIENCY-04 | 使用现有流水线 vs 提议新流水线 |
| 回滚机制 | RESILIENCY-04 | 版本重新部署 / 蓝绿 / 金丝雀 / 数据库感知 / 现有方式 |
| 部署风格 | RESILIENCY-04 | 直接 / 滚动 / 蓝绿 / 金丝雀 |
| 区域拓扑 | RESILIENCY-08 | 单区域多可用区 vs 多区域主备/双活 |
| 事件响应流程 | RESILIENCY-15 | 使用现有组织流程 vs 提议新流程 |
| 弹性测试方法 | RESILIENCY-14 | 使用现有实践 vs 提议新实践 vs 推迟到运维阶段 |

当组织已有既定流程（变更管理、CI/CD、事件响应、灾难恢复测试）时，模型必须引用并遵循该流程，而不是发明新流程。

---

## 支柱 1：业务目标（PILLAR 1: BUSINESS GOALS）

---

## 规则 RESILIENCY-01：关键工作负载识别与优先级划分

**规则**：每个项目都必须识别并记录其关键工作负载及其业务影响：
- **工作负载分类**：每个可部署组件都必须按业务关键性分类（关键 Critical、高 High、中 Medium、低 Low）
- **业务影响分析**：必须记录每个组件不可用所造成的影响（收入损失、用户影响、监管后果）
- **依赖映射**：必须识别并记录关键工作负载的上游和下游依赖

**核验**：
- 设计文档中包含每个组件的工作负载关键性分类
- 对关键和高优先级组件记录了不可用时的业务影响
- 存在显示上游和下游服务关系的依赖图

---

## 规则 RESILIENCY-02：可用性与恢复目标

**规则**：每个生产工作负载都必须定义与业务期望一致的可用性和恢复目标：
- **SLA 定义**：必须定义目标可用性百分比（例如 99.9%、99.99%）
- **RTO（恢复时间目标）**：必须为每个关键工作负载定义最大可接受停机时间
- **RPO（恢复点目标）**：必须为每个具有持久状态的工作负载定义最大可接受的数据丢失窗口
- **一致性**：可用性目标必须对照业务需求进行验证 —— 过度设计和设计不足都属于发现项

**核验**：
- 每个关键工作负载都有已记录的 SLA 目标
- 每个关键工作负载都定义并记录了 RTO
- 每个具有持久数据的工作负载都定义并记录了 RPO
- 目标由业务需求证明合理（而非随意设定）

**后续问题（在最终确定需求之前提出）**：

在最终确定需求阶段之前，模型必须向用户提出以下澄清问题，以获取恢复目标并确立灾难恢复策略。用户的回答直接驱动 RESILIENCY-11 中的灾难恢复策略选择和 RESILIENCY-12 中的数据保护决策。

```markdown
## Question: RTO/RPO Goals and Disaster Recovery Strategy
What are your Recovery Time Objective (RTO) and Recovery Point Objective (RPO) goals? These determine the appropriate Disaster Recovery strategy and infrastructure redundancy level.

A) RPO/RTO: Hours — Backup & Restore strategy. Lowest cost ($). Data backed up, no services deployed. Redeploy from IaC and restore from backups on failure. Suitable for non-critical workloads.

B) RPO/RTO: 10s of minutes — Pilot Light strategy. Cost: $$. Data live, services idle. Infrastructure deployed but not running, scaled up on failover. Suitable for important workloads.

C) RPO/RTO: Minutes — Warm Standby strategy. Cost: $$$. Data live, services run at reduced capacity. Scaled up during failover. Suitable for business-critical applications.

D) RPO/RTO: Near real-time — Multi-site Active/Active strategy. Highest cost ($$$$). Data live, live services in multiple regions simultaneously. Suitable for mission-critical, zero-downtime requirements.

E) N/A — Single-region deployment is acceptable, no cross-region DR needed. Rely on multi-zone availability within one region.

X) Other (please describe after [Answer]: tag below)

[Answer]: 
```

用户选择的 RTO/RPO 目标必须记录在需求输出中，并传播到所有下游阶段（应用设计 Application Design、NFR 需求 NFR Requirements、NFR 设计 NFR Design、基础设施设计 Infrastructure Design）。

---

## 支柱 2：变更管理与自动化（PILLAR 2: CHANGE MANAGEMENT & AUTOMATION）

---

## 规则 RESILIENCY-03：变更管理流程

**规则**：每个项目都必须与一个能将变更引发故障的风险降至最低的变更管理流程集成。默认预期是组织**已经拥有**变更管理流程 —— 本规则指导项目识别并遵循该流程，而不是发明新流程。

**澄清问题（在需求阶段提出；不要假设答案）**：

```markdown
## Question: Change Management Process
How should production changes for this workload be governed? AI-DLC will conform the design to your answer rather than inventing a process.

A) Use our existing organizational change management process — provide the name/tool (e.g., ServiceNow, Jira Change, internal CAB). AI-DLC will reference it and ensure deployable artifacts fit that process (change records, approval gates).

B) No formal process exists yet — AI-DLC should propose a lightweight change management process (change record + approval + rollback note) for the team to adopt.

C) N/A — this workload is exempt from formal change management (e.g., internal tooling). Document the exemption rationale.

X) Other (describe after [Answer]: tag below)

[Answer]: 
```

**核验**：
- 变更管理流程已按名称识别（现有组织流程），或根据用户的回答明确提议/豁免
- 生产变更引用已识别的流程来获得批准和变更记录
- 已识别变更历史记录机制（现有工具或提议的工具）

**注意**：如果用户选择 A，模型不得重新定义该流程 —— 只能引用它，并确保制品（例如部署配置、runbook）与之兼容。

---

## 规则 RESILIENCY-04：自动化部署与回滚

**规则**：所有生产部署理想情况下都应自动化，并且回滚方式必须由用户明确选择 —— 而非由模型推断。如果组织已有 CI/CD 工具链和部署约定，项目必须加以复用。

**定义**（消除歧义）：
- **回滚**：在部署失败后将运行中的工作负载恢复到其最后一个已知良好状态的定义机制。本规则不假定特定机制 —— 由用户从下方选择。
- **部署风格**：用于发布变更的策略（直接/原地、滚动、蓝绿或金丝雀）。

**澄清问题（在需求阶段或 NFR 设计阶段提出；不要假设答案）**：

```markdown
## Question: CI/CD and Deployment Tooling
What CI/CD tooling and deployment process should this workload use?

A) Use our existing CI/CD pipeline — provide the tool (e.g., GitHub Actions, GitLab CI, Jenkins, CodePipeline). AI-DLC will produce artifacts compatible with it.

B) No pipeline exists — AI-DLC should propose a CI/CD pipeline definition appropriate to the chosen IaC and runtime.

X) Other (describe after [Answer]: tag below)

[Answer]: 

## Question: Rollback Mechanism
How should a failed production deployment be rolled back?

A) Redeploy previous IaC/artifact version (version-pinned rollback)

B) Blue/green swap back to the previous environment

C) Canary auto-rollback on health/metric regression

D) Database-aware rollback required (schema/data migration reversal) — flag for explicit design

E) Use our organization's existing rollback procedure — provide reference

X) Other (describe after [Answer]: tag below)

[Answer]: 

## Question: Deployment Style
What deployment strategy is acceptable for this workload's risk profile?

A) Direct / in-place (lowest cost, highest blast radius) — acceptable for non-critical workloads

B) Rolling (gradual instance replacement)

C) Blue/green (zero-downtime cutover, higher cost)

D) Canary (progressive traffic shift with automated rollback)

X) Other (describe after [Answer]: tag below)

[Answer]: 
```

**核验**：
- 已识别 IaC 工具（现有组织标准或用户选择的工具）
- 已识别 CI/CD 流水线（现有），或根据用户的回答提议新流水线
- 回滚机制由用户明确选择并记录（而非推断）
- 部署风格由用户明确选择，并与 RESILIENCY-01 中的工作负载关键性相匹配
- 对于数据库感知的回滚（问题 2 的选项 D），记录了迁移逆转方案

---

## 支柱 3：集成可观测性（PILLAR 3: INTEGRATED OBSERVABILITY）

---

## 规则 RESILIENCY-05：关键工作负载的监控与告警

**规则**：每个已部署的工作负载都必须围绕可观测性的三大支柱配置监控 —— 指标、日志和追踪：
- **指标**：必须为每个组件收集关键运维指标（延迟、错误率、吞吐量、饱和度）
- **日志**：必须配置结构化日志，并将其路由到集中的日志服务
- **追踪**：对于包含多个服务的分布式系统，必须配置分布式追踪，以跨服务边界跟踪请求
- **仪表盘**：必须定义显示工作负载关键健康指标的监控仪表盘

**核验**：
- 每个组件都配置了指标收集（使用云原生或第三方可观测性平台）
- 结构化日志被路由到集中式服务
- 为多服务架构配置了分布式追踪（单服务场景标记为 N/A）
- 存在用于运维健康监控的仪表盘定义或配置

---

## 规则 RESILIENCY-06：健康检查

**规则**：每个生产组件都必须实现能够准确反映其承载流量能力的健康检查：
- **浅层健康检查**：每个服务都必须暴露一个基本健康端点，用于确认进程正在运行
- **深度健康检查**：关键服务必须实现深度健康检查，以验证与下游依赖（数据库、缓存、外部 API）的连接性
- **负载均衡器集成**：健康检查必须与负载均衡器或服务发现集成，以便将流量自动从不健康实例路由走
- **合成监控**：面向公众的端点应该（SHOULD）配置合成金丝雀监控，从用户视角检测可用性问题

**核验**：
- 每个服务都暴露健康检查端点
- 深度健康检查验证关键服务的下游依赖连接性
- 健康检查与负载均衡器或路由机制集成
- 面向公众的端点配置了合成监控（或记录为不适用）

---

## 规则 RESILIENCY-07：弹性监控

**规则**：必须主动监控已部署工作负载的弹性态势：
- **弹性评估**：工作负载应该（SHOULD）注册到弹性评估工具（云提供商原生或第三方），用于持续评估弹性态势
- **告警配置**：必须针对指示弹性劣化的条件配置告警（例如单可用区运行、复制滞后、备份失败）
- **容量监控**：必须监控自动扩缩指标和容量利用率，以便在容量限制导致中断之前发现这些限制

**核验**：
- 配置了弹性专属告警（不只是运维告警）
- 监控容量和扩缩指标
- 弹性评估工具已配置，或记录为未来的改进项

---

## 支柱 4：高可用性（PILLAR 4: HIGH AVAILABILITY）

---

## 规则 RESILIENCY-08：多可用区与多区域部署

**规则**：生产工作负载必须具有明确选择的故障隔离拓扑。多可用区基线与多区域决策之间的取舍（由 RESILIENCY-02 中 RTO/RPO 的回答驱动）必须由用户决定，而非由模型推断。

**多可用区基线（生产必需）**：
- **计算**：计算资源（虚拟机、容器集群）必须分布在至少 2 个可用区。无服务器服务通常默认多可用区。
- **数据存储**：数据库和缓存必须使用多可用区配置（复制、集群或全球分布）
- **负载均衡**：必须使用负载均衡器或基于 DNS 的路由在各可用区间分配流量
- **静态稳定性**：如果某个可用区不可用，架构必须继续运行，且无需控制平面操作即可恢复

**多区域决策（用户驱动 —— 不要推断）**：

选择单区域多可用区还是多区域是一个成本/复杂度权衡，必须由用户决定。如果 RESILIENCY-02 的回答是 D（双活）或 C（跨区域范围的热备用），则隐含多区域 —— 与用户确认。否则请提问：

```markdown
## Question: Regional Topology
Does this workload require multi-region deployment, or is single-region with multi-zone redundancy sufficient?

A) Single-region, multi-zone — tolerates zone failure, not full-region failure. Lower cost. (Aligns with RTO/RPO options A/B/E.)

B) Multi-region active-passive — survives region failure with failover. Higher cost. (Aligns with Warm Standby / Pilot Light cross-region.)

C) Multi-region active-active — survives region failure with no downtime. Highest cost. (Aligns with Active/Active.)

X) Other (describe after [Answer]: tag below)

[Answer]: 
```

**核验**：
- 计算资源部署在 2 个以上可用区（或使用本身多可用区的无服务器服务）
- 数据存储使用多可用区配置
- 负载均衡在各可用区间分配流量
- 多区域拓扑由用户明确选择，并与 RESILIENCY-02 中的 RTO/RPO 目标一致
- 架构文档确认静态稳定性（可用区故障转移不依赖控制平面）

---

## 规则 RESILIENCY-09：自动扩缩与容量管理

**规则**：生产工作负载必须实现自动扩缩，以应对负载变化并防止容量引发的中断：
- **自动扩缩策略**：计算资源必须配置自动扩缩并带有适当的扩缩触发器（CPU、内存、请求数、自定义指标）
- **扩缩限制**：必须定义最小和最大容量限制，以防止供应不足和失控扩缩
- **预热**：对于具有可预测流量模式的工作负载，应该（SHOULD）配置定时扩缩或预热
- **无服务器限制**：无服务器函数必须配置并发限制，以防止下游服务过载
- **服务配额意识**：团队必须识别云提供商与该工作负载相关的服务配额和限制（例如函数并发、API 请求速率、存储请求限制），并记录任何需要在生产启动前提升的配额。配额利用率应该（SHOULD）被监控并在 80% 阈值时发出告警。

**核验**：
- 计算资源配置了自动扩缩（或使用无服务器）
- 定义了最小和最大扩缩限制
- 扩缩触发器适合工作负载模式
- 在适用处配置了无服务器并发限制
- 识别并记录了相关的云提供商服务配额
- 针对预期负载下可能超出的任何限制，规划了配额提升请求

---

## 规则 RESILIENCY-10：依赖隔离与熔断

**规则**：应用程序必须实现相应模式，防止依赖故障引发级联故障：
- **超时**：所有外部调用（HTTP、数据库、缓存）都必须配置显式超时 —— 不允许无限等待
- **熔断器**：调用外部依赖的服务应该（SHOULD）实现熔断器模式，以便在依赖不健康时快速失败
- **舱壁隔离**：关键工作负载应该（SHOULD）隔离依赖池（连接池、线程池），防止单个故障依赖耗尽共享资源
- **优雅降级**：当非关键依赖不可用时，应用程序必须定义降级模式下的行为

**核验**：
- 所有外部调用都配置了显式超时
- 为关键外部依赖实现了熔断器模式（或记录为不适用）
- 记录非关键依赖故障时的优雅降级行为
- 配置连接池和资源限制以防止资源耗尽

---

## 支柱 5：灾难恢复（PILLAR 5: DISASTER RECOVERY）

---

## 规则 RESILIENCY-11：灾难恢复策略选择

**规则**：每个具有持久状态的生产工作负载都必须有与其 RTO/RPO 目标相匹配的已记录灾难恢复策略：
- **策略选择**：基于业务需求从成熟的灾难恢复策略中选择：
  - 备份与恢复（Backup & Restore，RTO/RPO：小时级）—— 成本最低
  - 照明灯（Pilot Light，RTO/RPO：数十分钟）—— 数据在线，服务空闲
  - 热备用（Warm Standby，RTO/RPO：分钟级）—— 数据在线，服务以降低的容量运行
  - 冷备用/主备（Hot Standby / Active-Passive，RTO/RPO：分钟级）—— 数据在线，服务就绪
  - 双活（Active/Active，RTO/RPO：实时）—— 成本最高，零停机
- **成本一致性**：灾难恢复策略的成本必须由停机造成的业务影响证明合理
- **文档**：所选灾难恢复策略必须记录清晰的故障转移和故障回切流程

**核验**：
- 为每个关键工作负载选择并记录了灾难恢复策略
- 该策略与已定义的 RTO/RPO 目标（RESILIENCY-02）一致
- 记录了故障转移和故障回切流程
- 灾难恢复策略的成本对照业务影响证明合理

---

## 规则 RESILIENCY-12：数据备份与复制

**规则**：所有持久数据都必须按照已定义的 RPO 进行备份和/或复制：
- **自动化备份**：必须使用托管备份服务或定时任务实现数据库和存储备份的自动化（例如自动数据库快照、对象存储版本控制或等效方案）
- **跨区域复制**：关键数据应该（SHOULD）复制到辅助区域，以应对区域性灾难场景
- **备份验证**：必须通过测试性恢复定期验证备份完整性
- **保留策略**：必须定义备份保留期限，并与业务和合规要求保持一致
- **加密**：备份在静态时（at rest）必须加密

**核验**：
- 为所有持久数据存储配置了自动化备份
- 为关键数据配置了跨区域复制（或记录为不需要并附理由）
- 定义了备份保留策略
- 启用了备份加密
- 记录了备份验证流程（即使是手动的）

---

## 规则 RESILIENCY-13：故障转移与恢复流程

**规则**：每个灾难恢复策略都必须具有已记录并测试的故障转移和恢复流程：
- **Runbook**：必须记录逐步的故障转移和故障回切 Runbook
- **自动化**：故障转移流程在可行时应尽量自动化（例如基于 DNS 健康检查的路由、托管数据库全球复制、专用灾难恢复服务）
- **沟通计划**：必须定义灾难恢复事件期间与利益相关方的沟通计划
- **恢复验证**：必须记录故障转移后的验证步骤，以确认工作负载在灾难恢复环境中正常运行

**核验**：
- 存在带逐步流程的故障转移 Runbook
- 记录了故障回切流程
- 在适用处配置了自动化故障转移机制
- 定义了故障转移后的验证步骤

---

## 支柱 6：持续改进（PILLAR 6: CONTINUOUS IMPROVEMENT）

---

## 规则 RESILIENCY-14：混沌工程与灾难恢复测试

**规则**：弹性机制必须具有已定义的测试方法。如果组织已有灾难恢复测试或混沌工程实践，本规则指导项目引用这些实践，而不是发明新的实践。

**澄清问题（在 NFR 设计阶段提出；不要假设答案）**：

```markdown
## Question: Resiliency Testing Approach
How will resiliency mechanisms (failover, recovery) be validated?

A) Use our existing DR testing / game day / chaos engineering practice — provide the reference. AI-DLC will document test scenarios that fit it.

B) No practice exists — AI-DLC should propose a DR testing schedule and chaos experiment plan for adoption.

C) Defer to the Operations phase — capture test scenarios now, execute during Operations.

X) Other (describe after [Answer]: tag below)

[Answer]: 
```

**核验**：
- 已识别弹性测试方法（现有实践、提议的计划，或根据用户的回答推迟到运维阶段）
- 为所选灾难恢复策略（RESILIENCY-11）记录了灾难恢复测试场景
- 已识别测试结果跟踪机制（现有或提议）

**注意**：混沌实验和灾难恢复演练的执行是运维阶段的活动。本规则确保测试场景和时间表在设计阶段就被捕获，以便运维有一个明确的起点。

---

## 规则 RESILIENCY-15：事件响应与错误纠正

**规则**：每个项目都必须与事件响应流程集成。与变更管理一样，默认预期是组织**已经拥有**事件响应流程 —— 本规则指导项目引用并遵循该流程。

**澄清问题（在需求阶段或 NFR 设计阶段提出；不要假设答案）**：

```markdown
## Question: Incident Response Process
How are production incidents handled for this workload?

A) Use our existing incident response process — provide the reference (e.g., PagerDuty runbooks, internal IR/on-call process). AI-DLC will align alerting and runbooks to it.

B) No formal process exists — AI-DLC should propose a lightweight incident response and Correction of Errors (COE) process for adoption.

X) Other (describe after [Answer]: tag below)

[Answer]: 
```

**核验**：
- 事件响应流程已按名称识别（现有），或根据用户的回答提议新流程
- 已识别 COE/事后复盘机制（现有组织实践或提议）
- RESILIENCY-05 中的告警路由到已识别的事件响应流程
- 已识别纠正措施跟踪机制

**注意**：如果用户选择 A，模型必须引用现有流程，并确保可观测性/告警与之集成 —— 而不是重新定义它。

---

## 强制集成

这些规则是适用于每个 AI-DLC 阶段的横切约束。在每个阶段：
- 针对产出的制品评估所有 RESILIENCY 规则的核验标准
- 在阶段完成摘要中包含 "Resiliency Compliance"（弹性合规性）部分，将每条规则列为合规、不合规或 N/A
- 如果任何规则不合规，即为阻断性弹性发现 —— 遵循概述中定义的阻断性发现行为
- 在设计文档、基础设施模板和测试说明中包含弹性规则引用

---

## 附录：可靠性支柱映射（AWS Well-Architected）

下表将每条规则映射到 AWS Well-Architected Reliability Pillar 中的对应概念。此映射仅供参考，用于展示与最成熟的云可靠性框架之一的一致性。规则本身与云提供商无关。

| RESILIENCY Rule | Reliability Concept |
|---|---|
| RESILIENCY-01 | Workload architecture — understand business impact |
| RESILIENCY-02 | Design for availability — define recovery objectives |
| RESILIENCY-03 | Change management — control changes |
| RESILIENCY-04 | Deployment automation — automate changes |
| RESILIENCY-05 | Monitor workload resources — observability |
| RESILIENCY-06 | Design interactions to prevent failures — health checks |
| RESILIENCY-07 | Monitor workload resources — resiliency posture |
| RESILIENCY-08 | Use fault isolation — multi-zone |
| RESILIENCY-09 | Design for horizontal scaling — auto-scaling |
| RESILIENCY-10 | Design interactions to prevent failures — circuit breaking |
| RESILIENCY-11 | Plan for disaster recovery — strategy selection |
| RESILIENCY-12 | Back up data — automated backups |
| RESILIENCY-13 | Design for recovery — failover procedures |
| RESILIENCY-14 | Test reliability — chaos engineering and DR testing |
| RESILIENCY-15 | Operate and observe — incident response and learning |

## 附录：弹性就绪度支柱映射（AWS RRR）

下表将每条规则映射到 AWS Resilience Readiness Review (RRR) 框架中的支柱。此映射仅供参考；这些规则适用于任何云提供商。

| Resiliency Assessment Area | RESILIENCY Rules |
|---|---|
| Business Goals | RESILIENCY-01, RESILIENCY-02 |
| Change Management & Automation | RESILIENCY-03, RESILIENCY-04 |
| Integrated Observability | RESILIENCY-05, RESILIENCY-06, RESILIENCY-07 |
| High Availability | RESILIENCY-08, RESILIENCY-09, RESILIENCY-10 |
| Disaster Recovery | RESILIENCY-11, RESILIENCY-12, RESILIENCY-13 |
| Continuous Improvement | RESILIENCY-14, RESILIENCY-15 |
