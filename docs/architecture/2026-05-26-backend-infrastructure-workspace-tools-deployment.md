# CIForce Backend Infrastructure Recommendation

**日期**: 2026-05-26  
**版本**: v0.1  
**状态**: Draft

---

## 1. 文档目标

本文件用于回答 CIForce 在以下问题上的技术选型与部署建议：

1. `Workspace` 主数据和文件资产适合用什么后端产品
2. `Tools` 与执行沙箱适合用什么技术路线
3. 未来部署到云服务器、Docker、负载均衡场景时，架构应该如何扩展

本文件是基础设施视角，不替代：

- 产品与执行定位文档
- Workspace / 画布 / 数据模型文档

关联文档：

- `docs/architecture/README.md`
- `docs/architecture/2026-05-26-digital-labor-execution-framework.md`
- `docs/architecture/2026-05-26-workspace-canvas-ui-data-model.md`
- `docs/architecture/2026-05-26-workspace-runtime-database-schema-v1.md`
- `docs/architecture/2026-05-26-deployment-topology-v1.md`
- `docs/architecture/2026-05-26-agent-performance-observability-metrics-v1.md`
- `docs/architecture/2026-05-08-ciforce-system-architecture.md`

---

## 2. 核心结论

### 2.1 Workspace 主后端推荐

CIForce 的 `Workspace` 主后端优先推荐：

`Postgres + Object Storage + Redis`

而不是先采用：

- 纯文档数据库
- 纯聊天线程存储
- 仅本地文件系统

原因是 `Workspace` 承载的是强关系业务对象：

- `Business Sector`
- `Workspace`
- `Canvas`
- `Task Run`
- `File Metadata`
- `Memory Ref`
- `Billing / Audit`

这类对象天然更适合关系型建模。

### 2.2 推荐产品组合

当前最平衡的一套组合：

- `Supabase`: Postgres + Auth + Storage + Realtime
- `Upstash Redis`: 缓存、队列、轻量事件分发
- `Cloudflare R2`: 文件与产物对象存储
- `pgvector`: Workspace 级 memory / RAG
- `Langfuse`: tracing / cost / debug
- `OpenTelemetry`: traces / metrics / logs 采集标准
- `Prometheus`: 基础设施和服务级指标
- `Grafana`: dashboard 与 alerting
- `LangGraph`: 执行编排内核
- `E2B` 或自建 sandbox: tool 执行隔离

### 2.3 部署结论

建议分三层演进：

1. `Managed Hybrid`
   CIForce 应用跑在云服务器 / Docker，数据库和存储先用托管服务
2. `Single Region HA`
   API、worker、gateway 容器化并支持多副本和负载均衡
3. `Cluster / Kubernetes`
   当任务量、并发和团队协作规模上来后，再引入 k8s / autoscaling

同时建议把 metrics / observability 作为正式子系统处理，而不是只在应用里临时打印日志。

---

## 3. 为什么 Workspace 更适合 Postgres 体系

### 3.1 Workspace 不是聊天线程

CIForce 的 `Workspace` 是长期项目容器，不是一次性对话。

它至少包含：

- 所属业务板块
- 当前画布
- 文件列表
- 任务运行历史
- 共享知识 / Memory
- 成员权限
- 计费标签

这意味着它更像：

- 项目空间
- 业务实体
- 协作上下文容器

而不是：

- 聊天消息流
- 松散 JSON 文档

### 3.2 Postgres 的优势

对于你这个平台，Postgres 体系的优势是：

- 强关系与事务一致性
- 很适合做 `workspace_id` 主外键归属
- 容易做权限过滤与审计
- 容易做分页、聚合、统计
- 容易扩展 `pgvector`
- 容易和对象存储元数据、任务表、费用表联动

---

## 4. Workspace 后端技术推荐

### 4.1 首选方案：Supabase

如果当前目标是快速落地并兼顾后续扩展，优先推荐 `Supabase`。

适用原因：

- 自带完整 `Postgres`
- 自带 `Storage`
- 自带 `Auth`
- 自带 `Realtime`
- 支持 `pgvector`
- 适合快速做多租户、RLS、文件权限

推荐在 CIForce 中承接：

- `business_sectors`
- `workspaces`
- `workspace_members`
- `workspace_files`
- `task_runs`
- `memory_refs`
- `audit_logs`

### 4.2 第二方案：Neon + 自选周边

如果更偏工程化组合、需要开发分支数据库体验，可以选：

- `Neon` 作为 Postgres
- `R2 / S3` 作为文件
- `Clerk / 自建 Auth / 现有 auth`
- `Upstash Redis`

适用场景：

- 你想保持基础设施更自由
- 你很看重数据库分支、环境隔离、preview workflow
- 你不希望 auth / storage 和数据库强耦合在同一家

### 4.3 为什么暂不推荐 Mongo 类主库

不推荐把 Mongo 一类文档库作为 `Workspace` 主库。

原因：

- 业务板块、Workspace、任务、文件、记忆之间有清晰关联
- 后续权限、计费、审计、统计查询都更像关系模型
- 你不是在做“任意 schema 的内容管理器”，而是在做“有明确业务归属的平台”

---

## 5. 文件、产物与对象存储设计

### 5.1 推荐产品

文件资产推荐：

- 云上优先：`Cloudflare R2`
- 可替代：`AWS S3`
- 本地 / 私有化：`MinIO`

### 5.2 为什么对象存储和数据库分开

数据库应存：

- 文件元数据
- bucket key
- 文件类型
- 所属 workspace
- 创建人 / 上传时间

对象存储应存：

- 原始文件
- 生成报告
- 图片 / 视频
- 中间产物

这样可以避免：

- 大文件撑爆数据库
- 备份恢复复杂
- 应用容器和文件生命周期耦合

### 5.3 推荐的 key 结构

```text
/tenants/{tenant_id}/workspaces/{workspace_id}/uploads/{file_id}/{filename}
/tenants/{tenant_id}/workspaces/{workspace_id}/artifacts/{task_run_id}/{filename}
/tenants/{tenant_id}/workspaces/{workspace_id}/exports/{export_id}/{filename}
```

原则：

- 路径上显式携带 `tenant_id`
- 归属以 `workspace_id` 为主
- 执行产物再落到 `task_run_id`

---

## 6. Memory / RAG / 检索推荐

### 6.1 早期推荐：pgvector

当前阶段推荐直接把向量检索放在 Postgres 中，用 `pgvector` 承接：

- workspace memory
- 文件切片 embedding
- 业务板块公共知识引用

原因：

- 架构简单
- 权限边界清晰
- 便于和业务表联查
- 足以支撑当前阶段的量级

### 6.2 什么时候再拆独立向量库

当出现以下条件时，再考虑 `Qdrant` 之类独立向量库：

- embedding 数据量明显大于业务表
- 检索成为独立高负载服务
- 需要更复杂的向量检索调优
- 需要跨业务线做专门检索集群

在那之前，`pgvector` 更适合。

---

## 7. Tools 技术路线推荐

### 7.1 Tools 需要和 Agent 分层

CIForce 中的 `tool` 不应等于 `agent`。

推荐区分：

- `worker / agent`: 负责业务推理与执行编排
- `tool`: 负责能力调用

### 7.2 Tools 的四类划分

推荐把 tools 分成四类：

#### A. 平台内建工具

例如：

- `workspace_file_list`
- `workspace_file_attach`
- `memory_read`
- `memory_write`
- `knowledge_search`
- `task_run_create`

特点：

- 强权限
- 强审计
- 强 workspace 归属

#### B. 外部连接器工具

例如：

- Amazon 数据接口
- Notion
- Slack
- Airtable
- Feishu

特点：

- 以 API 调用为主
- 需要凭证与租户隔离

#### C. 重任务工具

例如：

- crawl job
- report export
- video render
- batch file parse

特点：

- 耗时长
- 建议异步 job 化
- 不适合阻塞单次 LLM 调用

#### D. 远程 Agent 工具

例如：

- 合作伙伴垂类 agent
- 第三方分析服务

特点：

- 平台只关心 contract
- 不要求对方内部也使用 LangGraph

### 7.3 Tool Manifest 推荐字段

```ts
interface ToolManifest {
  key: string
  name: string
  description: string
  category: 'platform' | 'connector' | 'job' | 'remote-agent'
  inputSchema: object
  outputSchema: object
  workspaceScoped: boolean
  authScope?: string[]
  timeoutSeconds?: number
  retryPolicy?: {
    attempts: number
    backoffSeconds: number
  }
  billingMode?: 'free' | 'metered'
}
```

---

## 8. Tool 执行环境推荐

### 8.1 早期推荐：托管 Sandbox

如果 tools 需要：

- 跑脚本
- 读写文件
- 文档解析
- 浏览器操作
- 生成中间文件

推荐早期采用托管 sandbox 方案，例如 `E2B` 类型能力。

适合原因：

- 上手快
- 隔离清晰
- 对 agent 执行场景友好
- 可以先验证产品逻辑，不必一开始自建复杂容器调度

### 8.2 中后期推荐：自建 Sandbox Provider

当进入以下阶段，可以演进为自建：

- 企业私有化部署
- 有更严格的数据合规要求
- tool 执行并发显著提升
- 希望控制成本

推荐方向：

- 统一 `SandboxProvider` 抽象
- 提供 `host-local`、`container`、`remote` 三类 provider
- 让 VEGA / tools 层只依赖抽象接口

### 8.3 推荐隔离边界

CIForce 的隔离边界推荐是：

- 长期归属：`workspace`
- 单次运行：`task_run`
- 临时执行目录：`sandbox session`

也就是：

```text
workspace
  ├─ uploads
  ├─ memory cache
  ├─ shared artifacts
  └─ task_run
       ├─ temp input
       ├─ temp output
       └─ execution sandbox
```

---

## 8.5 Metrics / Observability 技术栈

推荐职责拆分：

- `OpenTelemetry`
  - 统一埋点与 trace 传播
- `Langfuse`
  - LLM、agent、prompt、eval、cost
- `Prometheus`
  - API、worker、queue、sandbox、SSE 运行指标
- `Grafana`
  - 统一 dashboard 和告警
- `Postgres`
  - task_runs、agent_runs、ROI 与业务事实

不建议只依赖某一个系统承载全部观测需求。

原因：

- LLM 观测和系统指标不是一类数据
- ROI 与业务绩效更适合存关系型事实
- 系统告警更适合 Prometheus / Grafana

---

## 9. 推荐的云与 Docker 部署路线

### 9.1 第一阶段：Managed Hybrid

这是当前最推荐的上线方式。

结构：

- 应用层自己部署到云服务器或 Docker
- 数据层先用托管服务

推荐组合：

- 应用：`FastAPI + Worker + Frontend`
- 数据库：`Supabase` 或 `Neon`
- Redis：`Upstash`
- 对象存储：`R2`
- Tracing：`Langfuse Cloud` 或自托管
- Metrics: `Prometheus + Grafana`

优点：

- 快速上线
- 维护成本低
- 后续容器化迁移平滑

### 9.2 第二阶段：单区域高可用

当开始需要稳定线上流量时，推荐进入：

`API 多副本 + Worker 独立扩容 + Gateway 负载均衡`

推荐拓扑：

```text
Internet
  -> Caddy / Traefik / Nginx
      -> frontend replicas
      -> api replicas
      -> worker scheduler / job API

api replicas
  -> Postgres
  -> Redis
  -> Object Storage
  -> Sandbox Provider

worker replicas
  -> Redis queues
  -> Postgres task_runs
  -> Object Storage
  -> OTel Collector

observability
  -> Prometheus
  -> Grafana
  -> Langfuse
```

### 9.3 第三阶段：Kubernetes / Cluster

当出现以下情况再进入：

- 多个 API 副本长期运行
- worker 数量要按负载自动伸缩
- 需要更成熟的灰度、滚动发布、HPA
- 需要多环境、多团队协作治理
- 需要统一 metrics / trace / alerting 平台

---

## 10. Docker、负载均衡与云服务器建议

### 10.1 本地开发

推荐：

- `docker compose`
- 单机运行 API、frontend、Redis、可选本地 MinIO

本地目标是：

- 快速启动
- 接近生产依赖
- 方便联调

### 10.2 单台云服务器

如果先部署到一台云服务器，推荐：

- `Docker Compose`
- `Caddy` 或 `Traefik` 做反向代理
- 应用层容器化
- 数据层尽量先外部托管
- 可选单独部署 `otel-collector`

推荐原因：

- 成本低
- 简单
- 比全都塞在主机进程里更容易迁移

### 10.3 多台云服务器 + Docker

如果明确要用 Docker 集群并需要负载均衡，有两条路线：

#### 路线 A：Docker Swarm 过渡

适合：

- 团队希望先用纯 Docker
- 运维复杂度要低于 k8s
- 希望有基础 service discovery 和负载均衡

可以实现：

- 多副本 service
- overlay network
- ingress routing mesh
- 滚动更新

但它更适合作为过渡方案。

#### 路线 B：Kubernetes 正式方案

适合：

- 长期生产
- 需要 HPA、Ingress、细粒度服务治理
- 未来 worker / sandbox / API 都会独立扩缩容

推荐入口：

- `Ingress / Gateway`
- `Deployment`
- `HorizontalPodAutoscaler`
- 独立 worker deployment
- `OpenTelemetry Collector`
- `Prometheus Operator`

### 10.4 反向代理推荐

推荐优先级：

1. `Traefik`
   适合 Docker / k8s，动态发现友好
2. `Caddy`
   适合单机或简单集群，HTTPS 很省心
3. `Nginx`
   适合团队已有成熟经验

---

## 11. 推荐的部署拓扑

### 11.1 最小线上版

```text
User
  -> Reverse Proxy
      -> Frontend container
      -> API container

API
  -> Supabase / Neon
  -> Upstash Redis
  -> Cloudflare R2
  -> Langfuse
  -> OTel Collector
  -> Prometheus / Grafana
```

适合：

- MVP
- 单团队
- 低并发

### 11.2 Docker 高可用版

```text
User
  -> Traefik / Caddy
      -> frontend x 2
      -> api x 2
      -> worker x N

api / worker
  -> managed Postgres
  -> managed Redis
  -> managed Object Storage
  -> sandbox provider
  -> otel collector
```

适合：

- 真正对外提供服务
- 有持续任务执行
- 需要基础容灾与副本扩展

### 11.3 Kubernetes 版

```text
User
  -> Cloud Load Balancer
      -> Ingress Controller
          -> frontend deployment
          -> api deployment
          -> event / stream endpoints

worker deployment
  -> queue
  -> sandbox provider
  -> storage
  -> otel collector

stateful services
  -> managed Postgres
  -> managed Redis
  -> object storage
  -> Prometheus / Grafana / Langfuse
```

适合：

- 中高并发
- 多环境治理
- 持续扩缩容

---

## 12. 负载均衡与扩容原则

### 12.1 哪些服务应该无状态

推荐无状态化：

- API 层
- SSE / streaming 网关层
- frontend
- worker 执行容器

这样才能方便：

- 横向扩容
- 容器重启
- 负载均衡

### 12.2 哪些状态不要放在本机

不应该依赖本机磁盘保存：

- Workspace 核心文件
- 任务状态主记录
- 长期 memory
- 审计日志

这些都应放入：

- Postgres
- Redis
- Object Storage

### 12.3 SSE / 流式输出要注意什么

CIForce 未来有大量运行流事件，因此需要注意：

- 连接保持时间较长
- 反向代理要正确配置超时
- 事件状态最好可回放
- worker 输出不要只存在单机内存里

推荐方式：

- 实时流走 SSE
- 关键事件同时写入 Redis stream 或任务事件表
- SSE 连接数、字节数、断流率应纳入 Prometheus 监控

---

## 13. 推荐的落地顺序

### 第一阶段

先落最小可用基础设施：

- Supabase
- Upstash
- R2
- FastAPI + LangGraph
- Docker Compose
- Langfuse
- OpenTelemetry

### 第二阶段

把应用容器化并拆出 worker：

- API
- frontend
- worker
- reverse proxy

### 第三阶段

增加：

- task queue
- tool manifest
- sandbox provider 抽象
- tracing
- Prometheus + Grafana
- agent performance rollups

### 第四阶段

根据业务规模决定：

- Docker Swarm 过渡
- 或直接 Kubernetes

---

## 14. 最终建议

如果今天就拍板，推荐的基础设施方案是：

### 14.1 当前推荐方案

- `Workspace 主库`: Supabase Postgres
- `向量 / Memory`: pgvector
- `缓存 / 事件 / 轻队列`: Upstash Redis
- `文件 / 产物`: Cloudflare R2
- `执行编排`: LangGraph
- `API`: FastAPI
- `LLM 观测`: Langfuse
- `统一采集`: OpenTelemetry
- `系统指标与告警`: Prometheus + Grafana
- `Tools 执行`: 托管 sandbox 起步，自建 provider 演进
- `部署`: Docker Compose 起步，Traefik / Caddy 做入口

### 14.2 中期推荐方案

- API 多副本
- Worker 独立伸缩
- 托管数据库与对象存储继续保留
- 负载均衡接入 Traefik / Ingress

### 14.3 长期推荐方案

- Workspace-first 平台模型不变
- 执行层逐步标准化 tool / worker / remote-agent contract
- 部署层逐步从单机 Docker 演进到高可用 Docker 或 Kubernetes

一句话总结：

`先把状态放对地方，再做副本和负载均衡；先让 Workspace 模型稳定，再让执行层和部署层扩起来。`
