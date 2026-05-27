# CIForce Deployment Topology v1

**日期**: 2026-05-26  
**版本**: v0.1  
**状态**: Draft

---

## 1. Goal

本文件用于定义 CIForce 第一版正式部署拓扑，确保以下目标清晰：

1. 本地开发怎么跑
2. 单台云服务器怎么部署
3. Docker 多副本和负载均衡如何演进
4. 什么时候进入 Kubernetes
5. 如何保证 `workspace-first` 模型在部署层不被破坏

本文件是对基础设施文档的部署化展开版本。

---

## 2. Environment

### Local

面向：

- 本地开发
- 联调
- 架构验证

### Staging

面向：

- 接近生产的功能验收
- schema 迁移验证
- worker / streaming / storage 联调

### Production

面向：

- 外部访问
- 真实任务执行
- 多副本、高可用、可观测性

---

## 3. Components

CIForce 第一版部署建议至少拆出以下组件：

- `Frontend`
  - Web UI
- `API Gateway`
  - FastAPI 主入口
  - 鉴权、workspace API、task API、streaming API
- `Runtime / Worker`
  - VEGA / LangGraph 执行
  - 后台异步任务
- `Queue / Cache`
  - Redis
- `Database`
  - Postgres
- `Object Storage`
  - R2 / S3 / MinIO
- `Sandbox Provider`
  - E2B 或自建执行隔离
- `Observability`
  - Langfuse / OpenTelemetry / logs
  - Prometheus / Grafana / alerts

---

## 4. Topology

### 4.1 Local Topology

```text
Browser
  -> Frontend Dev Server
      -> FastAPI API
          -> Local Redis
          -> Managed Postgres or local Postgres
          -> Managed R2/S3 or local MinIO
```

特点：

- 适合快速开发
- 可以先保留托管数据库，降低本地复杂度
- 若需要离线联调，可换成本地 Postgres + MinIO

### 4.2 Single-Server Cloud Topology

```text
Internet
  -> Caddy / Traefik
      -> Frontend Container
      -> API Container
      -> Worker Container

API / Worker
  -> Managed Postgres
  -> Managed Redis
  -> Managed Object Storage
  -> Managed / Remote Sandbox
  -> OTel Collector
  -> Langfuse
  -> Prometheus / Grafana
```

特点：

- 第一版线上推荐形态
- 应用在一台云服务器容器化
- 数据和状态尽量放到外部托管服务

### 4.3 Multi-Replica Docker Topology

```text
Internet
  -> Traefik / Caddy
      -> Frontend x 2
      -> API x 2
      -> Worker x N

API
  -> Postgres
  -> Redis
  -> Object Storage

Worker
  -> Redis queues / streams
  -> Postgres task_runs
  -> Object Storage
  -> Sandbox Provider
  -> OTel Collector

Observability
  -> Prometheus
  -> Grafana
  -> Langfuse
```

特点：

- 适合稳定对外服务
- 前后端与 worker 能独立扩容
- 负载均衡不再依赖单点 API 进程

### 4.4 Kubernetes Topology

```text
Internet
  -> Cloud Load Balancer
      -> Ingress Controller
          -> Frontend Deployment
          -> API Deployment
          -> Streaming Endpoints

Worker Deployment
  -> Queue
  -> Sandbox Provider
  -> Object Storage

External Managed State
  -> Postgres
  -> Redis
  -> Object Storage
  -> Observability Stack
```

特点：

- 适合长期生产
- worker / api 可以独立自动扩缩容
- 适合多环境、多团队协作治理

---

## 5. State Placement

### 5.1 允许本地临时存在的状态

以下内容可以存在容器本地临时目录：

- worker 执行临时文件
- sandbox 中间产物
- 非关键缓存
- 构建产物

这些内容都不应被视为系统主状态。

### 5.2 必须外部化的状态

以下状态不能依赖本机磁盘：

- `workspaces`
- `workspace_files` 元数据
- `task_runs`
- `runtime_threads`
- `memory_refs`
- 审计日志
- 持久任务事件
- 正式文件产物
- 绩效聚合快照
- token / cost 汇总结果

推荐分别放在：

- Postgres
- Redis
- Object Storage

### 5.3 必须保持无状态的服务

以下服务建议无状态：

- frontend
- API gateway
- streaming gateway
- worker 容器

这样才能支持：

- 多副本
- 重启恢复
- 负载均衡
- 蓝绿或滚动发布

---

## 6. Scaling Strategy

### Frontend

- 本质无状态
- 可直接水平扩容
- CDN 和静态缓存优先

### API

- API 应尽量只做请求处理、权限校验、状态编排入口
- 不在进程内持久保存关键任务状态
- 支持多副本后由负载均衡器分流

### Worker

- 最适合按负载扩容
- 与 API 独立伸缩
- 可以按任务类型拆 worker pool
- 应上报统一 metrics / traces

例如：

- `research-workers`
- `media-workers`
- `tool-job-workers`

### Sandbox

- 早期走托管 sandbox
- 中后期若自建，应与 API 和 worker 分层
- 不建议将 sandbox 生命周期强耦合在单个 API 进程中

---

## 7. Failure Domains

### 7.1 Single Point Of Failure

在单机部署阶段，主要单点包括：

- 反向代理
- 单台云服务器
- 单个 API 进程

解决方向：

- API 与 worker 分容器
- 主状态外部化
- 尽快进入多副本部署

### 7.2 Retry Behavior

建议：

- API 请求失败可快速重试
- worker job 采用幂等任务设计
- tool 调用采用明确 retry policy
- 与外部 agent 通信需要 timeout + retry + circuit breaker

### 7.3 Recovery Behavior

恢复原则：

- 从 `task_runs` 恢复业务执行状态
- 从 `runtime_threads` 恢复执行引擎 thread 映射
- 从对象存储恢复文件
- 从 Postgres 恢复 workspace 主状态
- 从 observability backend 回查失败链路与性能瓶颈

---

## 8. Security Boundary

### 8.1 Auth Entry

认证建议统一从 API Gateway 进入。

不要让：

- worker 直接暴露公网入口
- sandbox 直接暴露公网入口

### 8.2 Internal Network

建议：

- API、worker、queue、sandbox 走内网
- 对象存储和数据库优先使用私网连接或受限访问

### 8.3 Secret Management

建议不要把核心密钥散落在容器环境变量管理之外。

建议：

- 本地：`.env`
- 云上：平台 secret manager
- k8s：`Secret` + external secret manager

### 8.4 File Access

所有文件访问都应以：

- `tenant_id`
- `workspace_id`
- `task_run_id`

作为权限和路径边界，而不是以 thread 为边界。

---

## 9. Operations

### 9.1 Deploy Method

推荐演进：

1. 本地：`docker compose`
2. 单机线上：`docker compose` 或简单 CI/CD
3. 多副本：Swarm 或多机 Compose + 反向代理
4. 长期：Kubernetes

### 9.2 Rollback Method

回滚建议至少分三层：

- 应用镜像回滚
- 数据库 migration 回滚
- 配置回滚

并要求：

- task schema 变更前先做 staging 验证
- object storage key 结构保持向后兼容

### 9.3 Health Checks

建议至少包含：

- `/healthz` 基础健康
- 数据库连接检查
- Redis 连接检查
- 对象存储写读检查
- sandbox provider 可用性检查

### 9.4 Observability

建议至少打通：

- request logs
- task run logs
- worker execution logs
- tool call logs
- tracing
- error alerts
- token usage
- cost usage
- queue depth
- SSE active connections
- agent performance rollups

推荐部署职责：

- `OpenTelemetry Collector`
  - 独立组件
- `Prometheus`
  - service / infra metrics
- `Grafana`
  - dashboard / alerting
- `Langfuse`
  - LLM / agent traces

---

## 10. Recommended Phase Plan

### Phase A: Local + Managed Data

适合：

- 当前开发阶段

推荐：

- frontend 本地
- api 本地
- worker 本地
- Postgres 托管
- Redis 托管
- Object Storage 托管

### Phase B: Single-Server Production

适合：

- MVP 上线
- 小团队对外试运行

推荐：

- 一台云服务器
- `Caddy / Traefik`
- `frontend + api + worker` 容器化
- 托管数据服务继续保留
- 加入 `otel-collector`
- 加入基础 `Prometheus / Grafana`

### Phase C: Multi-Replica Production

适合：

- 需要高可用
- 有持续任务流量

推荐：

- frontend 多副本
- api 多副本
- worker 独立多副本
- 事件与状态外部化
- 统一 observability pipeline

### Phase D: Kubernetes

适合：

- 中高并发
- 多团队协作
- 持续扩缩容
- 更复杂的调度和治理

---

## 11. Recommended Stack By Stage

### Stage 1

- Reverse Proxy: `Caddy`
- Runtime: `FastAPI + LangGraph`
- Queue / Cache: `Upstash Redis`
- DB: `Supabase Postgres`
- Storage: `Cloudflare R2`
- Sandbox: `E2B`
- LLM Observability: `Langfuse`
- Metrics Pipeline: `OpenTelemetry + Prometheus + Grafana`

### Stage 2

- Reverse Proxy: `Traefik`
- Frontend replicas: `2`
- API replicas: `2`
- Worker replicas: `N`
- DB / Redis / Storage: managed
- Collector: dedicated `otel-collector`

### Stage 3

- Ingress: `Kubernetes Ingress`
- Autoscaling: `HPA`
- Worker pools by workload type
- Optional self-hosted sandbox provider
- Prometheus Operator
- centralized observability stack

---

## 12. Open Questions

- 任务队列最终是否保持 Redis-based，还是后续拆为更独立的 job system
- sandbox 是否要完全自建，还是长期混合托管
- `runtime_threads.state_snapshot` 是否需要独立事件表
- streaming 事件是否要单独落 `task_run_events`

---

## 13. Final Recommendation

如果今天就要定第一版部署拓扑，推荐：

- 本地开发：`docker compose + managed data services`
- 第一版线上：`single server + reverse proxy + frontend/api/worker containers`
- 主状态全部外部化到：`Postgres + Redis + Object Storage`
- 任务执行与流事件不要只存在 API 进程内存
- 当流量稳定增长后，优先做 `API / worker` 多副本，再考虑 Kubernetes

一句话总结：

`先让部署层服务于 Workspace-first 模型，再做弹性和复杂调度；不要让运行时便利性破坏平台主状态边界。`
