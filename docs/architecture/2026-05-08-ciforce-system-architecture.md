# CIForce 系统架构文档

**版本**: v1.4  
**日期**: 2026-05-11  
**最近对齐**: 2026-05-26  
**状态**: L0 总览草稿；Workspace / Runtime / 数据库 / 部署 / Metrics / 配置中心细节以 2026-05-26 canonical docs 为准

---

## 0.0 2026-05-26 架构对齐补充

本文件仍作为 CIForce 的 L0 总体架构与产品哲学说明，但 2026-05-26 之后，平台主模型已经明确切换为 **Workspace-first runtime model**。因此，本文中早期关于 VEGA、Session、Pipeline、Agent-first 视角的描述，需要按本节进行解释和校正。

### 0.0.1 当前 canonical 关系

当前平台主关系固定为：

```text
Business Sector -> Workspace -> TaskRun -> Runtime Thread
```

含义如下：

1. `Business Sector` 是业务分类、模板和默认能力边界。
2. `Workspace` 是平台主上下文容器，也是文件、画布、任务、Memory 的默认归属。
3. `TaskRun` 是一次执行、审计、计费和绩效观测单位。
4. `Runtime Thread` 是 LangGraph / DeerFlow / 其他执行引擎的运行态会话容器，只服务 checkpoint、resume、stream，不作为平台主对象。

### 0.0.2 VEGA 边界修正

本文后续出现的“Boss 只和 VEGA 说话。VEGA 决定一切。”应理解为产品体验叙事，而不是硬系统边界。

当前边界为：

- 平台层负责 UI/UX、SSO/RBAC、业务板块、Workspace、文件、Memory、RAG、计费、Metrics、配置中心、审计和治理。
- VEGA 负责执行编排入口、任务分解、worker 路由、运行态协调、质量检查和结果汇总。
- LangGraph 是当前执行内核，负责图状态、节点流转、checkpoint 与恢复。
- Worker / Agent 是数字劳动力资源池，可以是内置 worker、平台工具封装，也可以是外部合作伙伴 agent。
- DeerFlow 只作为执行层设计参考，借鉴 skills、sandbox、sub-agent、streaming、memory、gateway 等能力，不照搬 thread-first 或 chat-first 产品模型。

### 0.0.3 UI 与产品主视角

CIForce 当前更适合被定义为 **数字劳动力协作平台**，不是通用 agent builder，也不是单纯 super agent 聊天产品。

UI 主视角应保持：

```text
先选业务板块 -> 再选 Workspace -> 在 Workspace 画布中调度数字劳动力
```

设计约束：

- Workspace 是用户真正工作的项目现场。
- 无限画布属于 Workspace，不应作为全局共享画布。
- 文件、任务运行记录、Memory 默认归属 Workspace。
- 数字工位 / 数字劳动力是资源池、侧栏、抽屉或可调度能力，不应压过 Workspace 成为主容器。
- 业务板块与 Workspace 是模板级联动，不是运行态强绑定；业务板块模板更新不应静默覆盖已有 Workspace。

### 0.0.4 后端与基础设施基线

当前后端基线为：

- `Postgres` 承载 Workspace、TaskRun、AgentRun、事件、配置、绩效聚合等平台业务事实。
- `Object Storage` 承载用户上传文件、任务产物、报告、图片、视频等二进制资产。
- `Redis` 后续用于队列、缓存、短期事件流、限流与并发控制。
- `LangGraph checkpoint` 只保存运行态恢复所需状态，不替代平台业务数据库。
- Docker Compose 是本地和单机云部署基线，后续可演进到反向代理、负载均衡、独立 worker、对象存储和托管数据库。

Metrics 与可观测性基线为：

- 平台业务事实进入 `Postgres`。
- LLM 链路和 trace 使用 `Langfuse + OpenTelemetry`。
- 系统资源、服务健康和运行指标使用 `Prometheus + Grafana`。
- Token、成本、成功率、失败率、耗时、ROI 需要同时支持原始事件和聚合快照。

### 0.0.5 配置中心与数字劳动力分配

不要使用单一“大配置表”管理所有 agent 行为。当前推荐模型是：

```text
配置模板中心 + 数字劳动力分配关系 + 运行时配置解析器
```

配置覆盖顺序为：

```text
Global -> Capability Profile -> Worker -> Business Sector -> Workspace -> TaskRun Override
```

这意味着同一个数字劳动力在不同业务板块、不同 Workspace 中可以拥有不同模型策略、工具权限、预算、Prompt、观测策略和输出合约。

### 0.0.6 本文中过时或需重读的假设

| 旧表述 | 当前解释 |
|---|---|
| `LangGraph thread_id = Session` | `thread_id` 是 Runtime Thread，不是平台 Session 或 Workspace |
| `VEGA 决定一切` | VEGA 协调执行；平台层拥有上下文、治理、权限、计费和观测 |
| `Agent-first / lead-agent-first` | 数字劳动力是资源池；Workspace 才是产品主容器 |
| `Pipeline 执行引擎` | 当前实现优先以 LangGraph runtime + TaskRun + worker 协议落地 |
| `Agent Contract` | 继续保留，但需扩展为 worker manifest、tool protocol、remote agent contract 和配置中心绑定 |

### 0.0.7 对齐参考文档

- [2026-05-26-digital-labor-execution-framework.md](2026-05-26-digital-labor-execution-framework.md)
- [2026-05-26-workspace-canvas-ui-data-model.md](2026-05-26-workspace-canvas-ui-data-model.md)
- [2026-05-26-workspace-runtime-database-schema-v1.md](2026-05-26-workspace-runtime-database-schema-v1.md)
- [2026-05-26-backend-infrastructure-workspace-tools-deployment.md](2026-05-26-backend-infrastructure-workspace-tools-deployment.md)
- [2026-05-26-agent-performance-observability-metrics-v1.md](2026-05-26-agent-performance-observability-metrics-v1.md)
- [2026-05-26-config-center-worker-assignment-v1.md](2026-05-26-config-center-worker-assignment-v1.md)
- [2026-05-26-runtime-extension-schema-v1.md](2026-05-26-runtime-extension-schema-v1.md)
- [adr/0001-workspace-first-runtime-model.md](adr/0001-workspace-first-runtime-model.md)

---

## 0. 核心哲学

> **Boss 只和 VEGA 说话。VEGA 决定一切。**

CIForce 的架构围绕一个核心原则构建：Boss（用户）不直接管理 Agent，而是通过数字 COO **VEGA** 完成所有委托。VEGA 是唯一的原生 Orchestrator，负责任务分解、Agent 调度、质量控制和结果汇报。

这个设计解决了 AI 生产力工具的两个根本问题：
1. **认知负担** — 用户不需要知道哪个 Agent 做什么，只需要描述目标
2. **协调成本** — Agent 之间的协议对齐、数据传递、异常处理全由 VEGA 托管

---

## 0.1 平台战略：我们造什么，不造什么

### 不造 Agent 基座

造 agent 基座意味着与 Dify、Coze、LangChain 正面竞争——它们已经解决了 LLM 调用、工具链、记忆、RAG 等基础设施问题。CIForce 的护城河不在「怎么跑一个 LLM」，而在中间的协调层：

```
企业业务目标
      ↕
 CIForce 协调层  ← 我们的位置
  pipeline 调度 · 数据合约 · VEGA 编排 · 业务度量
      ↕
各种 Agent（无论谁造的）
      ↕
底层 LLM / 工具
```

供应商生态越繁荣，CIForce 平台越值钱——这是正确的飞轮。

### 我们造的三件事

**① Pipeline 执行引擎**（核心 IP）
```
DAG 调度 → 按拓扑顺序执行节点 → 节点间数据传递 → 失败重试与自愈
```

**② Agent 接入协议（Agent Contract）**

任何 Agent 想上平台必须实现：

```typescript
interface AgentContract {
  id: string
  name: string
  capabilities: string[]

  // 数据合约（最关键）：上游 output schema 必须匹配下游 input schema
  inputSchema:  JSONSchema
  outputSchema: JSONSchema

  run(input: Input, context: PipelineContext): AsyncStream<Output>
  onStatus(cb: (s: AgentStatus) => void): void
  cost(): { tokens: number; usd: number }
}
```

有了合约，小王可以是 Dify agent，数据侠可以是供应商爬虫，LING 可以是 DeepL 包一层——CIForce 不管里面怎么实现，只管 input/output 和状态。

**③ 业务成果度量层**

```
Agent 产出 → 绑定业务指标（发布量/转化率/ROI）→ 反哺 pipeline 优化
```

供应商 agent 只关心自己那一步，没人关心整条链路的业务结果，CIForce 来关心。

---

## 1. 整体架构分层

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                      │
│  React Frontend (CIForce App)                           │
│  XState UI State  ←──  WebSocket / SSE Stream           │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS REST + WebSocket
┌────────────────────────▼────────────────────────────────┐
│  API GATEWAY (FastAPI)                                   │
│  /vega/chat      → 向 VEGA 下达目标                     │
│  /task/{id}      → 查询任务状态                         │
│  /task/{id}/stream → SSE 实时输出流                     │
│  /agent/hire     → 入职新 Agent                         │
│  /pipeline/      → 管理协作链路                         │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  VEGA ORCHESTRATION LAYER  ← 核心层                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  VEGA Agent (LangGraph Supervisor)               │   │
│  │                                                  │   │
│  │  输入: Boss 的自然语言目标                       │   │
│  │  能力:                                           │   │
│  │    ① 意图理解 & 任务分解                        │   │
│  │    ② Agent 选择 & 路由                          │   │
│  │    ③ Pipeline 编排（串行/并行）                 │   │
│  │    ④ 输出质量审核                               │   │
│  │    ⑤ 异常检测 & 自愈                            │   │
│  │    ⑥ Human-in-the-Loop 升级                     │   │
│  │    ⑦ 结果汇报 & 归档                            │   │
│  │                                                  │   │
│  │  底层: LangGraph thread_id = Session             │   │
│  └──────────────────────────────────────────────────┘   │
│                         │ route                          │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │  WORKER AGENT POOL                              │    │
│  │  小王(Writer)  小陈(Editor)  LING(Translator)  │    │
│  │  数据侠(Analyst)  代码禅师(Developer)  ...      │    │
│  │                                                  │    │
│  │  每个 Worker = LangGraph Node + Tool Set         │    │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  TASK QUEUE (Celery + Redis)                     │   │
│  │  异步执行，优先级调度，支持并发                  │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  MEMORY & STORAGE LAYER                                  │
│                                                          │
│  PostgreSQL     — 任务记录、输出存档、Agent 配置         │
│  Redis          — 实时状态、任务队列、Session 缓存       │
│  Neo4j (Graphfy)— 执行知识图谱（见第4节）               │
│  Object Storage — 文件输出（视频、PDF、图片）            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. VEGA：原生 Orchestrator 设计

### 2.1 为什么 VEGA 是 Orchestrator

VEGA 不只是一个"助手 Agent"，她是整个数字劳动力的**运营操作系统**：

```
传统方案:  Boss → Agent A → Boss → Agent B → Boss（高摩擦）
CIForce:   Boss → VEGA → [A, B, C 并行] → VEGA → Boss（零摩擦）
```

VEGA 的 COO 职能天然对应 LangGraph 的 **Supervisor Architecture**：

```python
# VEGA 的决策图 (伪代码)
class VEGASupervisor:
    def route(self, state: TaskState) -> str:
        """
        VEGA 决定下一步调用哪个 Worker
        返回: worker_name | "FINALIZE" | "ESCALATE_TO_BOSS"
        """
        if state.needs_human_approval:
            return "ESCALATE_TO_BOSS"
        
        next_worker = self.llm.decide(
            goal=state.goal,
            completed=state.completed_tasks,
            available_agents=state.hired_agents,
            graphfy_context=self.graphfy.query(state.goal)
        )
        return next_worker

# LangGraph 图结构
graph = StateGraph(TaskState)
graph.add_node("vega", vega_supervisor)
graph.add_node("xiaowang", xiaowang_agent)
graph.add_node("xiaochen", xiaochen_agent)
graph.add_node("data_analyst", data_agent)

# 所有 Worker 完成后都回到 VEGA
graph.add_edge("xiaowang", "vega")
graph.add_edge("xiaochen", "vega")
graph.add_edge("data_analyst", "vega")

# VEGA 根据状态路由
graph.add_conditional_edges("vega", vega_router)
```

### 2.2 VEGA 的决策能力

```
Boss 说: "帮我分析一下竞品，出一份报告，顺便做个宣传视频"

VEGA 内部执行:
  Step 1: 意图分解
    → 子任务 A: 竞品数据采集（数据侠）
    → 子任务 B: 报告撰写（基于 A 的输出）（小王 or GPT Researcher）
    → 子任务 C: 宣传视频制作（基于 B 的输出）（小陈）
  
  Step 2: 依赖分析
    → A 可以立即执行
    → B 依赖 A 完成
    → C 依赖 B 完成
    → 执行顺序: A → B → C（串行 DAG）
  
  Step 3: Agent 选择
    → 查询 Graphfy: 历史上类似任务哪个 Agent 效果最好？
    → 选择 ROI 最高的 Agent 组合
  
  Step 4: 执行 & 监控
    → 每个步骤完成后 VEGA 审核输出质量
    → 如果质量不达标：重试或降级处理
    → 如果 Agent 阻塞：自动切换备选方案
  
  Step 5: 汇报
    → "Boss，报告和视频已就绪。竞品分析显示..."
```

### 2.3 VEGA 的 Human-in-the-Loop 触发条件

VEGA 知道什么时候应该打断 Boss：

| 触发条件 | VEGA 行为 |
|---------|----------|
| 任务模糊，无法分解 | 向 Boss 提问澄清 |
| 输出质量低于阈值（连续2次） | 暂停并请求 Boss 样本反馈 |
| Agent 阻塞超过 SLA 时间 | 告警 + 提供 3 个解决方案 |
| 预算/成本超出预设上限 | 暂停并请求授权 |
| 涉及敏感操作（删除/发布） | 强制二次确认 |

---

## 3. 任务与 Session 模型

### 3.1 核心概念映射

```
CIForce 概念          LangGraph 概念           数据库
─────────────────────────────────────────────────────
任务 (Task)      →    Graph Run                tasks 表
会话 (Session)   →    thread_id                sessions 表
Pipeline         →    Multi-node Graph         pipelines 表
Agent 状态       →    Node State               agent_states 表
输出 (Output)    →    Checkpointed State       outputs 表
```

### 3.2 任务生命周期

```
Boss 下达目标
      │
      ▼
[CREATED] ──── VEGA 接收，生成 thread_id
      │
      ▼
[PLANNING] ─── VEGA 分解任务，生成 DAG
      │
      ▼
[EXECUTING] ── Worker Agents 并发/串行执行
      │         每步完成后 checkpoint 到 PostgreSQL
      ├── [BLOCKED] ─── 等待人工干预或自动重试
      │
      ▼
[REVIEWING] ── VEGA 质量审核
      │
      ├── [REJECTED] ─── VEGA 自动重试或降级
      │
      ▼
[COMPLETED] ── 输出归档，通知 Boss
```

### 3.3 Session 持久化

每个 LangGraph `thread_id` 对应一个可恢复的 Session：

```python
# 创建任务
result = await vega.ainvoke(
    {"goal": "分析竞品，出报告"},
    config={"configurable": {"thread_id": "task-uuid-001"}}
)

# 任务中断后恢复（例如重启服务器后）
result = await vega.ainvoke(
    None,  # 从 checkpoint 恢复，无需重新输入
    config={"configurable": {"thread_id": "task-uuid-001"}}
)
```

这解决了长任务的可靠性问题——任何时候中断都能从最近的 checkpoint 继续。

---

## 4. Graphfy：VEGA 的认知底层

Graphfy 是 VEGA 的长期记忆，以**知识图谱**形式存储所有执行历史：

### 4.1 图结构

```
节点类型:
  (Task)     — 任务记录，含目标、结果、耗时
  (Agent)    — Agent 实例，含角色、工具、历史绩效
  (Output)   — 输出内容，含质量分、类型
  (Tool)     — 使用的工具和参数
  (Topic)    — 任务涉及的业务主题

关系类型:
  (Task)-[:ASSIGNED_TO]->(Agent)
  (Task)-[:PRODUCED]->(Output)
  (Agent)-[:USED]->(Tool)
  (Output)-[:ABOUT]->(Topic)
  (Task)-[:DEPENDS_ON]->(Task)
  (Agent)-[:COLLABORATES_WITH]->(Agent)
```

### 4.2 VEGA 如何使用 Graphfy

```python
# VEGA 在选择 Agent 前查询 Graphfy
def select_best_agent(task_goal: str, task_type: str) -> Agent:
    query = """
    MATCH (a:Agent)-[:ASSIGNED_TO]->(t:Task)-[:ABOUT]->(topic:Topic)
    WHERE topic.name = $task_type
    WITH a, 
         avg(t.quality_score) as avg_quality,
         avg(t.duration_minutes) as avg_duration,
         count(t) as task_count
    WHERE task_count > 3  // 有足够历史数据
    RETURN a.name, avg_quality, avg_duration
    ORDER BY avg_quality DESC, avg_duration ASC
    LIMIT 1
    """
    return graphfy.run(query, task_type=task_type)

# VEGA 执行后更新 Graphfy
def record_execution(task_id, agent_id, output, quality_score):
    graphfy.create_relationships(task_id, agent_id, output, quality_score)
    # 图谱越来越丰富，VEGA 的决策越来越准
```

### 4.3 Graphfy 赋能 VEGA 的能力进化

| 阶段 | VEGA 能力 | Graphfy 数据量 |
|------|----------|---------------|
| 初始 | 基于规则路由 | 0 |
| 1周  | 基于初步历史优化 Agent 选择 | 50+ 任务 |
| 1月  | 预测任务耗时、识别最佳 Agent 组合 | 500+ 任务 |
| 3月  | 主动建议 Boss 优化工作流 | 5000+ 任务 |

---

## 5. VEGA 工作流智能层：Coach → Auto 评估系统

VEGA 不仅是路由器，也是工作流成熟度的持续评估官。
**Coach → Auto 的切换不由用户手动决定，而由 VEGA 基于数据分析主动建议。**

### 5.1 核心理念

```
传统方案：Boss 感觉差不多了 → 手动拨 Auto → 祈祷不出错

CIForce：VEGA 持续监测 5 个维度 → 量化打分 → 
          条件具备时主动说"这条 Pipeline 可以上 Auto 了，理由如下"
          → Boss 一键授权
```

VEGA 对每一条 Pipeline（工作流）维护独立的**自动化就绪度评分（Auto-Readiness Score, ARS）**，0-100 分，≥ 80 分时主动向 Boss 发起建议。

### 5.2 五维评分模型

```python
class AutoReadinessScore(BaseModel):
    pipeline_id: str
    total: float          # 0-100，加权总分
    
    # 五个维度，各有权重
    output_consistency: float    # 权重 25%：输出质量的稳定性
    intervention_rate: float     # 权重 25%：需要人工干预的频率
    preference_convergence: float # 权重 20%：Boss 偏好是否收敛
    self_recovery_rate: float    # 权重 20%：VEGA 自主处理异常的能力
    sla_compliance: float        # 权重 10%：SLA 达标率

    # 诊断信息（VEGA 向 Boss 解释用）
    blocking_conditions: list[str]   # 当前不满足的条件
    ready_conditions: list[str]      # 已满足的条件
    recommendation: str              # VEGA 的建议文本
    estimated_tasks_to_ready: int    # 预计还需几次带教
```

#### 维度 1：输出一致性（output_consistency，权重 25%）

衡量最近 N 次输出的质量是否稳定可预期。

```python
def compute_output_consistency(pipeline_id: str, window: int = 10) -> float:
    recent_scores = graphfy.query("""
        MATCH (t:Task {pipeline_id: $pid})-[:PRODUCED]->(o:Output)
        ORDER BY t.created_at DESC LIMIT $window
        RETURN o.quality_score
    """, pid=pipeline_id, window=window)
    
    if len(recent_scores) < window:
        return 0  # 样本不足，不可评估
    
    mean = statistics.mean(recent_scores)
    std  = statistics.stdev(recent_scores)
    
    # 均值高、方差低 = 高分
    # 例：均值 4.2/5，标准差 0.3 → ~85分
    consistency_score = (mean / 5) * 100 - (std * 30)
    return max(0, min(100, consistency_score))
```

#### 维度 2：人工干预率（intervention_rate，权重 25%）

衡量多少任务不需要 Boss 参与就能完成。

```python
def compute_intervention_rate(pipeline_id: str, window: int = 20) -> float:
    stats = graphfy.query("""
        MATCH (t:Task {pipeline_id: $pid})
        ORDER BY t.created_at DESC LIMIT $window
        RETURN 
            count(t) as total,
            sum(CASE WHEN t.required_human_input THEN 1 ELSE 0 END) as interventions
    """, pid=pipeline_id)
    
    auto_rate = 1 - (stats.interventions / stats.total)
    return auto_rate * 100  # 80% 自动完成 → 80分
```

#### 维度 3：偏好收敛度（preference_convergence，权重 20%）

衡量 Boss 的反馈模式是否趋于稳定——VEGA 是否已"摸透"Boss 的品味。

```python
def compute_preference_convergence(pipeline_id: str) -> float:
    # 分析 Boss 的历史反馈，看偏好是否趋于一致
    feedback_vectors = graphfy.query("""
        MATCH (t:Task {pipeline_id: $pid})-[:RECEIVED_FEEDBACK]->(f:Feedback)
        ORDER BY t.created_at DESC LIMIT 15
        RETURN f.preference_embedding  // Boss 偏好的向量表示
    """, pid=pipeline_id)
    
    if len(feedback_vectors) < 5:
        return 0
    
    # 计算最近5次偏好向量的余弦相似度
    # 相似度越高 = 偏好越稳定 = 分越高
    recent = feedback_vectors[-5:]
    similarities = [cosine_sim(recent[i], recent[i+1]) for i in range(4)]
    return statistics.mean(similarities) * 100
```

#### 维度 4：自愈成功率（self_recovery_rate，权重 20%）

衡量 VEGA 自主处理异常的能力，不需要 Boss 介入。

```python
def compute_self_recovery_rate(pipeline_id: str, window: int = 30) -> float:
    stats = graphfy.query("""
        MATCH (t:Task {pipeline_id: $pid})-[:HAD_ERROR]->(e:Error)
        ORDER BY t.created_at DESC LIMIT $window
        RETURN 
            count(e) as total_errors,
            sum(CASE WHEN e.resolved_by = 'vega' THEN 1 ELSE 0 END) as vega_resolved
    """, pid=pipeline_id)
    
    if stats.total_errors == 0:
        return 100  # 没出过错，满分
    
    return (stats.vega_resolved / stats.total_errors) * 100
```

#### 维度 5：SLA 达标率（sla_compliance，权重 10%）

```python
def compute_sla_compliance(pipeline_id: str) -> float:
    # 最近20次是否在预期时间内完成
    ...
```

### 5.3 VEGA 建议触发逻辑

```python
class VEGAWorkflowAdvisor:
    
    AUTO_READY_THRESHOLD = 80      # 总分达到此值 → 建议 Auto
    AUTO_PAUSE_THRESHOLD = 60      # Auto 模式下低于此值 → 自动回退 Coach
    MIN_SAMPLE_SIZE = 10           # 至少执行N次才开始评估
    
    async def evaluate_pipeline(self, pipeline_id: str) -> AdvisoryResult:
        ars = self.compute_ars(pipeline_id)
        current_mode = await self.get_pipeline_mode(pipeline_id)
        
        # 场景 1: Coach 模式，条件成熟 → 建议升级
        if current_mode == "coach" and ars.total >= self.AUTO_READY_THRESHOLD:
            return AdvisoryResult(
                action="SUGGEST_AUTO",
                message=self._build_ready_message(ars),
                requires_boss_approval=True
            )
        
        # 场景 2: Auto 模式，质量下滑 → 自动降级
        if current_mode == "auto" and ars.total < self.AUTO_PAUSE_THRESHOLD:
            await self.pause_auto_mode(pipeline_id)
            return AdvisoryResult(
                action="AUTO_PAUSED",
                message=f"Pipeline 质量评分下降至 {ars.total:.0f}，已自动切回 Coach 模式。{ars.recommendation}",
                requires_boss_approval=False  # VEGA 自主决定，事后通知
            )
        
        # 场景 3: Coach 模式，还差一点 → 给出具体指导
        if current_mode == "coach" and ars.total >= 60:
            return AdvisoryResult(
                action="COACH_GUIDANCE",
                message=self._build_progress_message(ars),
                requires_boss_approval=False
            )
        
        return AdvisoryResult(action="CONTINUE_COACH", message=None)
    
    def _build_ready_message(self, ars: AutoReadinessScore) -> str:
        return f"""Boss，"{ars.pipeline_name}" 已达到自动化就绪标准（{ars.total:.0f}/100）。

✓ 输出一致性 {ars.output_consistency:.0f}分：最近10次质量均值稳定
✓ 人工干预率 {ars.intervention_rate:.0f}分：{100-ars.intervention_rate:.0f}%的任务无需您介入
✓ 偏好收敛度 {ars.preference_convergence:.0f}分：我已充分理解您的风格偏好
✓ 自愈成功率 {ars.self_recovery_rate:.0f}分：常见异常我可以自主处理

授权后，我将全程监控并在质量下滑时自动暂停。"""
    
    def _build_progress_message(self, ars: AutoReadinessScore) -> str:
        blocking = "\n".join([f"⚠ {c}" for c in ars.blocking_conditions])
        return f""""{ars.pipeline_name}" 自动化就绪度 {ars.total:.0f}/100，还差一些：

{blocking}

预计再完成 {ars.estimated_tasks_to_ready} 次带教任务即可达标。"""
```

### 5.4 Auto 模式下的 VEGA 持续监控循环

进入 Auto 模式不意味着 VEGA 放手不管，她在后台持续运行监控循环：

```python
async def vega_auto_monitor_loop(pipeline_id: str):
    """每次任务完成后触发"""
    
    while pipeline.mode == "auto":
        # 1. 评估最新任务质量
        latest_task = await get_latest_task(pipeline_id)
        quality = await evaluate_output_quality(latest_task)
        
        # 2. 更新 Graphfy
        await graphfy.record_execution(latest_task, quality)
        
        # 3. 重新评估 ARS
        ars = await evaluate_pipeline(pipeline_id)
        
        # 4. 判断是否需要介入
        if ars.total < AUTO_PAUSE_THRESHOLD:
            # 质量下滑，自动降级并通知 Boss
            await pause_auto_mode(pipeline_id)
            await notify_boss(f"VEGA 已暂停 {pipeline.name} 的自动模式：{ars.recommendation}")
            break
        
        if any_critical_error_unresolved():
            # 严重错误无法自愈，立即升级
            await escalate_to_boss(pipeline_id, error_context)
            break
        
        # 5. 定期汇报（不打扰 Boss，只写入 VEGA 简报）
        await update_vega_brief(pipeline_id, ars)
        
        await asyncio.sleep(MONITOR_INTERVAL)
```

### 5.5 前端展示：Pipeline 就绪度卡片

Dashboard 工作台中，每条 Pipeline 旁边显示 ARS 进度条和 VEGA 的建议状态：

```
┌─────────────────────────────────────────────────────┐
│ ⬡ Pipeline: 小王 → 小陈                             │
│                                                     │
│ 自动化就绪度  ████████████████░░░░  76/100          │
│                                                     │
│ ✓ 输出一致性   88  ✓ 自愈成功率    90              │
│ ✓ 干预率       82  ⚠ 偏好收敛度   65              │
│                     ⚠ SLA 达标率  58              │
│                                                     │
│ VEGA: 再完成 4-6 次带教，重点确认视频风格偏好       │
│       [查看完整分析]                [继续带教]       │
└─────────────────────────────────────────────────────┘

vs. 已就绪的 Pipeline:

┌─────────────────────────────────────────────────────┐
│ ⬡ Pipeline: 小王 → LING                             │
│                                                     │
│ 自动化就绪度  ████████████████████  87/100  ✦ 就绪  │
│                                                     │
│ VEGA: 此 Pipeline 已达到自动化标准，建议开启 Auto   │
│                                     [授权 Auto →]   │
└─────────────────────────────────────────────────────┘
```

---

## 6. Worker Agent 设计规范

每个 Worker Agent 必须实现以下接口，才能被 VEGA 调度：

### 5.1 Agent Manifest（语义握手协议）

```python
class AgentManifest(BaseModel):
    agent_id: str
    name: str
    role: str
    
    # IO 协议（前端显示用）
    input_expectation: list[str]   # 接受的输入类型
    output_promise: list[str]      # 承诺的输出类型
    unsupported_scenarios: list[str]
    
    # 执行规范
    max_duration_minutes: int      # SLA 上限
    requires_human_approval: bool  # 是否需要 Boss 审核
    cost_per_task: float           # 计费
    
    # 工具声明
    tools: list[str]               # ["web_search", "file_write", ...]
```

### 5.2 Worker 执行接口

```python
class WorkerAgent(ABC):
    @abstractmethod
    async def execute(
        self,
        task: TaskInput,
        context: dict,          # 上游 Agent 的输出
        stream_callback: Callable  # 流式输出回调 → SSE → 前端
    ) -> TaskOutput:
        pass
    
    @abstractmethod
    async def health_check(self) -> AgentStatus:
        pass
```

### 5.3 第一个真实 Worker：数据侠 (GPT Researcher)

```python
class DataAnalystAgent(WorkerAgent):
    """
    基于 gpt-researcher 的报告生成 Agent
    对应 CIForce 中的"数据侠"角色
    """
    
    manifest = AgentManifest(
        agent_id="data-analyst-v1",
        name="数据侠",
        role="市场趋势分析",
        input_expectation=["行业关键词", "时间范围", "竞品列表（可选）"],
        output_promise=["Markdown 研究报告", "关键指标摘要", "行动建议"],
        unsupported_scenarios=["实时股价", "个人隐私数据"],
        max_duration_minutes=15,
        requires_human_approval=False,
        cost_per_task=15.0,
        tools=["web_search", "file_write", "data_extract"]
    )
    
    async def execute(self, task, context, stream_callback):
        from gpt_researcher import GPTResearcher
        
        researcher = GPTResearcher(
            query=task.input,
            report_type="research_report"
        )
        
        # 流式输出到前端
        async for chunk in researcher.stream():
            await stream_callback(chunk)
        
        report = await researcher.write_report()
        return TaskOutput(content=report, format="markdown")
```

---

## 6. Frontend ↔ Backend 通信协议

### 6.1 下达任务

```http
POST /vega/chat
{
  "message": "帮我分析一下防晒市场，出一份报告",
  "session_id": "optional-resume-session"
}

Response:
{
  "task_id": "task-uuid-001",
  "thread_id": "lg-thread-001",
  "vega_reply": "好的 Boss，我已分解为3个子任务，预计25分钟完成...",
  "plan": [
    {"step": 1, "agent": "数据侠", "action": "市场数据采集"},
    {"step": 2, "agent": "小王",   "action": "报告撰写"},
  ]
}
```

### 6.2 实时输出流 (SSE)

```
GET /task/task-uuid-001/stream

data: {"type": "agent_start",   "agent": "数据侠", "step": 1}
data: {"type": "content_chunk", "content": "正在搜索防晒市场数据..."}
data: {"type": "content_chunk", "content": "发现12个竞品品牌..."}
data: {"type": "agent_done",    "agent": "数据侠", "output_id": "out-001"}
data: {"type": "agent_start",   "agent": "小王", "step": 2}
data: {"type": "content_chunk", "content": "# 2026防晒市场分析报告\n\n"}
data: {"type": "task_complete",  "task_id": "task-uuid-001"}
```

### 6.3 前端 XState 与后端状态同步

```
后端 Task Status    →    前端 XState State
─────────────────────────────────────────
CREATED            →    idle
PLANNING           →    idle (VEGA 思考中)
EXECUTING          →    working
BLOCKED            →    blocked
REVIEWING          →    working (VEGA 审核)
AWAITING_HUMAN     →    blocked (需要 Boss)
COMPLETED          →    idle (有新输出)
FAILED             →    offline
```

---

## 7. 部署拓扑

### 7.1 开发环境（Phase 0 — 当前）

```
本地:
  Frontend (Vite:3000) ── Mock API (MSW)
  无真实 Agent 执行
```

### 7.2 最小可用产品（Phase 1 — 下一步）

```
Vercel / Railway:
  Frontend (Next.js)
      │
  FastAPI (单容器)
      ├── VEGA (LangGraph + GPT Researcher)
      ├── PostgreSQL (Supabase Free)
      └── Redis (Upstash Free)

目标: 数据侠真实跑通报告生成
成本: ~$20/月
```

### 7.3 生产环境（Phase 2）

```
Kubernetes (或 Railway Pro):
  ┌─────────────────────────────────────┐
  │  Ingress (Cloudflare)               │
  ├─────────────────────────────────────┤
  │  API Gateway (FastAPI × 2)          │
  ├──────────────┬──────────────────────┤
  │  VEGA        │  Worker Pool         │
  │  (×1, 有状态)│  (×N, 无状态, 弹性) │
  ├──────────────┴──────────────────────┤
  │  Celery Workers (任务队列)           │
  ├─────────────────────────────────────┤
  │  PostgreSQL │ Redis │ Neo4j         │
  └─────────────────────────────────────┘
```

---

## 8. 开发路线图

### Phase 0（当前）— 前端原型
- [x] 4幕 VEGA 引导（含叙事）
- [x] 工作台 / 人才市场 / 开发商控制台
- [x] VEGA TopBar 图标 + 简报抽屉
- [ ] 工作台手动区真实交互（待做）

### Phase 1 — 最小真实 Agent（2-3周）
- [ ] FastAPI 后端骨架
- [ ] LangGraph VEGA Supervisor 基础版
- [ ] 数据侠接入 GPT Researcher
- [ ] SSE 流式输出到前端
- [ ] 任务状态实时同步

### Phase 2 — VEGA 完整编排（4-6周）
- [ ] 多 Worker Agent（小王/小陈/LING）
- [ ] Pipeline DAG 执行
- [ ] Graphfy Neo4j 集成
- [ ] Human-in-the-Loop 中断/恢复
- [ ] Agent Manifest 市场化接入

### Phase 3 — 生产化（8-12周）
- [ ] 多租户隔离
- [ ] 计费系统
- [ ] 开发商 SDK（第三方 Agent 接入）
- [ ] Graphfy 可视化（前端 Dashboard）

---

## 9. 关键设计决策记录

| 决策 | 选择 | 备选 | 原因 |
|------|------|------|------|
| Orchestration 框架 | LangGraph | AutoGen, CrewAI | thread 持久化最成熟，支持 human-in-the-loop |
| Worker 框架 | LangChain Agents | 纯 API 调用 | 工具生态最丰富，可复用大量现有工具 |
| 第一个真实 Agent | GPT Researcher | 自研 | 开源成熟，2周可接入，验证架构 |
| 知识图谱 | Neo4j | PostgreSQL+pgvector | 图查询天然适合 Agent 关系网络 |
| 实时通信 | SSE | WebSocket | 单向流式输出足够，实现更简单 |
| 任务队列 | Celery+Redis | BullMQ | Python 生态，与 LangGraph 无缝集成 |
| VEGA 是否独立服务 | 是 | 合并到 API | VEGA 有状态（Graphfy 连接），需要独立生命周期 |

---

## 附录：参考资源

- [LangGraph Supervisor Pattern](https://langchain-ai.github.io/langgraph/tutorials/multi_agent/agent_supervisor/)
- [GPT Researcher GitHub](https://github.com/assafelovic/gpt-researcher)
- [LangGraph Human-in-the-Loop](https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/)
- [Neo4j + LangChain GraphRAG](https://python.langchain.com/docs/integrations/graphs/neo4j_cypher/)
