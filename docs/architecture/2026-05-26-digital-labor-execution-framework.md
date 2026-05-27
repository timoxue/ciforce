# CIForce 数字劳动力平台与执行框架设计

**日期**: 2026-05-26  
**版本**: v0.1  
**状态**: Draft

---

## 1. 文档目标

本文件用于沉淀 CIForce 在以下三个问题上的统一判断：

1. 平台是否应该以“数字劳动力”作为核心产品概念
2. 后端执行框架与工具体系应该如何选型
3. 开源框架 `DeerFlow` 是否适合直接承接当前平台

本文件不替代 `Workspace / 画布 / 数据模型` 文档，而是作为其上层的执行架构与平台定位说明。

关联文档：

- `docs/architecture/README.md`
- `docs/architecture/2026-05-26-workspace-canvas-ui-data-model.md`
- `docs/architecture/2026-05-26-backend-infrastructure-workspace-tools-deployment.md`
- `docs/architecture/2026-05-08-ciforce-system-architecture.md`

---

## 2. 核心结论

### 2.1 产品定位结论

CIForce 更适合定义为：

`数字劳动力协作平台`

而不是：

- 通用聊天助手
- 单一超级 Agent 产品
- 传统 Agent Builder

原因是平台的核心对象不是“对话”，而是：

- `业务板块`
- `Workspace`
- `画布`
- `数字工位`
- `任务 / 文件 / Memory`

这套结构天然指向“组织数字劳动力完成业务工作”，而不是“让一个 AI 和用户聊天”。

### 2.2 执行框架结论

CIForce 当前继续采用 `LangGraph` 作为执行内核是合理的。

推荐策略不是“换掉 LangGraph”，而是：

`保留 LangGraph 作为 runtime core + 在其上建立 CIForce 自己的平台层`

### 2.3 DeerFlow 适配结论

`DeerFlow` 对 CIForce 是“执行层局部适配”，不是“平台层整套适配”。

更准确地说：

- 适合借鉴：`skills`、`sandbox`、`sub-agent`、`streaming`、`memory`、`gateway`
- 不适合直接照搬：`thread-first` 的主模型、chat-first 的产品结构、lead-agent-first 的运行视角

---

## 3. 为什么 CIForce 更适合“数字劳动力”

### 3.1 平台的主对象不是对话

如果一个系统的核心对象是：

- 会话
- 提问
- 回答
- 聊天线程

那么它更像 AI Assistant。

而 CIForce 当前的主对象是：

- `业务板块`: 业务能力域
- `Workspace`: 项目执行现场
- `画布`: 协作编排界面
- `数字工位`: 可调用执行资源

这说明平台更接近“数字组织系统”。

### 3.2 数字劳动力是更贴切的前台叙事

推荐对外表达：

- 平台上有一组可调用、可协作、可追踪的数字劳动力
- 用户不是在找一个聊天 bot，而是在组织数字劳动力完成业务目标
- VEGA 不是普通助手，而是数字劳动力调度与协作中枢

### 3.3 但后台实现不要拟人化过度

“数字劳动力”适合作为产品概念，不适合作为所有技术对象的唯一抽象。

推荐分层表达：

- 前台产品语言：`数字劳动力`、`数字工位`
- 中台能力语言：`agent`、`tool`、`workflow node`
- 后台执行语言：`task`、`worker`、`runtime`、`state`

这样既保留产品表达力，也避免把后端建模做乱。

---

## 4. 平台边界与执行层边界

### 4.1 平台层负责什么

CIForce 平台层负责：

- UI / UX
- 身份鉴权与 RBAC
- 业务板块管理
- Workspace 管理
- 画布管理
- 文件资产管理
- 长期 Memory 与知识引用
- 计费、审计、监控
- 任务记录与结果归档

### 4.2 执行层负责什么

执行层负责：

- 接收任务目标与上下文
- 选择 worker / agent / tool
- 执行多步推理与编排
- 维护运行态 state
- 处理 checkpoint / resume
- 输出中间结果与最终结果

### 4.3 一个关键原则

`Workspace 是平台主上下文容器，LangGraph thread 只是执行会话容器。`

这句话很关键。

不能让：

- thread 反过来定义 workspace
- runtime 反过来定义平台数据模型

正确关系应该是：

`Business Sector -> Workspace -> Task Run -> LangGraph Thread`

---

## 5. 当前执行框架的推荐选型

### 5.1 保留 LangGraph 作为执行内核

结合当前仓库中的实现：

- `backend/vega/state.py`
- `backend/vega/graph.py`
- `backend/vega/supervisor.py`
- `backend/vega/registry.py`
- `backend/vega/workers/runtime.py`

可以看出 CIForce 已经有以下雏形：

- `StateGraph`
- `Supervisor -> Worker` 路由
- 统一 worker registry
- 统一文本型 worker runtime
- checkpoint / resume 能力

因此当前最优策略不是推翻，而是增强。

### 5.2 推荐的后端基础组合

推荐组合如下：

- `LangGraph`: 多步任务编排与状态流转
- `FastAPI`: API、SSE、鉴权接入
- `PostgreSQL`: Workspace、TaskRun、审计、结构化持久化
- `Redis`: 队列、缓存、事件分发
- `Object Storage / MinIO / S3`: 文件与产物
- `pgvector`: workspace 级 RAG / memory retrieval
- `OpenTelemetry + Langfuse/LangSmith`: tracing、成本与调试

### 5.3 当前不建议优先引入更重的工作流引擎

例如 `Temporal`、复杂 BPM 引擎等，不是当前第一优先级。

原因：

- CIForce 已经有 `LangGraph` 编排主线
- 当前主要短板在平台化分层，而不是编排能力缺失
- 过早引入第二套中心编排系统，容易职责重叠

---

## 6. 推荐的分层架构

### 6.1 四层模型

```text
Platform Layer
  ├─ Business Sector
  ├─ Workspace
  ├─ Canvas
  ├─ Files / Memory / Billing / Auth

Execution Runtime Layer
  ├─ VEGA Supervisor
  ├─ LangGraph State / Checkpoint / Resume
  ├─ Worker Runtime
  ├─ Task Run

Tooling Layer
  ├─ RAG Search
  ├─ File Parse
  ├─ External SaaS Connectors
  ├─ Browser / Crawl / Render / Export Tools

External Agent Layer
  ├─ Internal Workers
  ├─ Partner Vertical Agents
  ├─ Remote Agent Services
```

### 6.2 各层职责

`Platform Layer`

- 描述“谁在做事、在哪个项目里做事、数据归属到哪里”

`Execution Runtime Layer`

- 描述“这次任务怎么跑、跑到哪一步、能否恢复”

`Tooling Layer`

- 描述“执行时可调用哪些能力”

`External Agent Layer`

- 描述“有哪些可被调度的数字劳动力”

---

## 7. DeerFlow 是否适配 CIForce

### 7.1 适配的部分

从 `deer-flow/backend` 当前结构看，DeerFlow 在以下方面对 CIForce 很有参考价值：

- `skills` 体系
- `sandbox` 与文件系统隔离
- `sub-agent` 委派与并行执行
- `memory` 注入与长期记忆
- `streaming` 事件输出
- `gateway + embedded runtime` 分层

这些能力本质上都属于“执行层基础设施”。

### 7.2 不适配的部分

DeerFlow 的核心上下文单位是 `thread`，而 CIForce 的核心上下文单位应该是 `workspace`。

因此以下地方不宜直接照搬：

- thread-first 的数据归属模型
- chat-first 的产品主视图
- lead-agent-first 的主交互结构
- 把文件、memory、artifact 默认都绑死到 thread

### 7.3 对 DeerFlow 的正确使用方式

推荐把 DeerFlow 视为：

- 参考架构
- 可借鉴模块来源
- 某些执行能力的实现样板

而不是：

- 平台主数据模型
- 平台最终产品结构
- 业务板块 / workspace 的替代品

### 7.4 一句话判断

`DeerFlow 适合做 CIForce 的发动机参考，不适合直接做整车。`

---

## 8. CIForce 应该吸收 DeerFlow 的哪些能力

### 8.1 Skills 机制

CIForce 当前已有 `registry + worker` 基础，但未来会遇到一个问题：

单纯注册 worker，不足以表达复杂领域能力包。

可以吸收 DeerFlow 的经验，把垂类能力包装成更高层的能力单元，例如：

- 亚马逊竞品分析 skill
- 视频分镜 skill
- 数字劳动力入职配置 skill

这些 skill 不一定直接等于一个 worker，也可以是一组：

- prompt 约束
- tool 组合
- 输入输出约定
- 文件模板
- memory 规则

### 8.2 Sandbox 机制

如果未来 agent 要：

- 读写文件
- 跑脚本
- 转换文档
- 处理图片 / 报表 / 导出

那么 sandbox 思路非常值得吸收。

但 CIForce 应该把隔离边界从 `thread` 提升为：

- 主归属：`workspace`
- 单次运行隔离：`task run`

### 8.3 Sub-agent 机制

CIForce 的很多任务天然适合拆分：

- 竞品搜集
- 评论聚类
- 报告撰写
- 视频脚本生成

未来可以在 VEGA 下支持：

- 主 worker 继续拆 sub-agents
- 或者 VEGA 直接下发多个 worker 并行执行

### 8.4 Streaming 与事件标准化

DeerFlow 在流式输出与运行事件上比较完整，这一点非常适合借鉴。

CIForce 后续应统一事件模型，例如：

- `status`
- `tool_call`
- `tool_result`
- `worker_output`
- `final`
- `error`

这样前端画布、任务面板、运行日志面板都能复用。

---

## 9. CIForce 不应直接照搬 DeerFlow 的部分

### 9.1 不要把 thread 当成顶层业务容器

正确关系是：

- workspace 承载长期上下文
- task run 承载一次执行记录
- thread 承载 LangGraph 的可恢复运行态

而不是反过来。

### 9.2 不要把 chat 界面当主入口

CIForce 的主入口更应该是：

- 工作台
- 业务板块
- Workspace
- 画布
- 任务与文件面板

聊天只是其中一种操作入口，不应是唯一入口。

### 9.3 不要把 lead agent 视角压过 workspace

DeerFlow 是以“超级 agent”为中心组织体验。

CIForce 更应该以“项目执行现场”为中心组织体验。

也就是：

- DeerFlow 的主角是 agent
- CIForce 的主角是 workspace 中的数字劳动力协作

---

## 10. 对当前 VEGA 的演进建议

### 10.1 从文本 worker runtime 升级为统一执行协议

当前 `backend/vega/workers/runtime.py` 更接近：

`text generation runtime`

后续建议演进为统一的 worker runtime，至少支持四类：

```text
text      - 文本型分析 / 生成
tool      - 工具型即时调用
job       - 长耗时异步任务
remote    - 外部合作伙伴 agent 服务
```

### 10.2 TaskState 增加 workspace-first 上下文

当前后端 runtime 需要补齐以下字段：

```py
goal: str
user_id: str | None
tenant_id: str | None
business_sector_id: str | None
workspace_id: str | None
workspace_name: str | None
task_run_id: str | None
memory_refs: list[dict]
knowledge_refs: list[dict]
file_refs: list[dict]
billing_tags: dict[str, str]
```

原则是：

- 执行引擎只消费上下文
- 上下文归属仍由平台层控制

### 10.3 平台需要统一工具协议

工具不应再只是“某个 Python 函数能调用”，而应该有统一 contract。

推荐字段：

```ts
interface ToolManifest {
  key: string
  name: string
  description: string
  inputSchema: object
  outputSchema: object
  authScope?: string[]
  workspaceScoped?: boolean
  costMode?: 'free' | 'metered'
  timeoutSeconds?: number
}
```

### 10.4 平台需要统一远程 Agent 接入协议

合作伙伴的垂类智能体不一定也用 LangGraph。

因此平台只需要统一远程接入协议，不要求统一内部实现。

推荐最小 contract：

```ts
interface RemoteAgentContract {
  manifest: object
  inputSchema: object
  outputSchema: object
  run: string
  stream?: string
  status?: string
  cancel?: string
}
```

---

## 11. 推荐的落地路线

### 第一阶段

先稳住 CIForce 自己的平台主模型：

- `Business Sector`
- `Workspace`
- `Canvas`
- `Files / Tasks / Memory`

### 第二阶段

增强 VEGA runtime：

- 给 `TaskState` 增加 workspace context
- 给路由层传入 `workspace_id`
- 让任务执行结果稳定落到 `TaskRun`

### 第三阶段

抽象统一 worker / tool / remote-agent contract：

- 内部 worker 先统一
- 再支持外部合作伙伴 agent 接入

### 第四阶段

选择性吸收 DeerFlow 能力：

- skills
- sandbox
- sub-agents
- event streaming

注意是“吸收执行能力”，不是“替换平台主模型”。

---

## 12. 最终判断

CIForce 的正确方向不是：

`做一个更像 DeerFlow 的 super agent 产品`

而是：

`做一个以 Workspace 为中心、以数字劳动力为产品概念、以 LangGraph 为执行内核的平台`

最终结构应当是：

- 前台：数字劳动力协作平台
- 中台：业务板块 + Workspace + 画布
- 后台：VEGA + LangGraph Runtime + Tools + Memory + Files

这条路线既保留了你平台现在最有辨识度的部分，也能吸收 DeerFlow 这类框架已经验证过的执行能力。
