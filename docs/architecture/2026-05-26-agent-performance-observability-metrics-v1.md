# CIForce Agent Performance, ROI, And Observability v1

**日期**: 2026-05-26  
**版本**: v0.1  
**状态**: Draft

---

## 1. 文档目标

本文件用于设计 CIForce 中“数字劳动力绩效与可观测性模块”，回答以下问题：

1. 如何评估 agent / worker 的成功、失效、投入、产出、ROI
2. 如何监控 token、请求量、流量、耗时、失败率
3. 这些数据应该挂在 `Workspace / TaskRun / Agent` 的哪一层
4. 后续如何支持：
   - agent 排名
   - agent 淘汰 / 优选
   - 业务板块能力评估
   - 计费与预算控制

---

## 2. 核心结论

### 2.1 绩效不能只看“任务成功”

CIForce 的 agent 绩效评估必须至少分四层：

- `Execution Metrics`
- `Quality Metrics`
- `Business Metrics`
- `Efficiency / ROI Metrics`

也就是说：

- 跑完了，不等于成功
- 成功了，不等于划算
- 划算了，不等于对业务有价值

### 2.2 指标主归属关系

推荐归属如下：

- `TaskRun`: 一次执行的原始观测数据
- `AgentRun`: 某个 agent / worker 在一次任务中的表现
- `Workspace`: 项目级聚合表现
- `BusinessSector`: 业务板块级聚合表现
- `Agent Profile`: 跨 workspace 的长期绩效画像

### 2.3 指标必须分“原始事件”和“聚合结果”

推荐分两层存：

- 原始层：事件、token、tool call、状态变更、流量
- 聚合层：成功率、平均耗时、平均成本、ROI、质量得分

不要只存最终 dashboard 数字，否则后面无法回溯和重算。

### 2.4 推荐技术框架

CIForce 在绩效与可观测性模块上，推荐采用分层技术栈：

- `OpenTelemetry`
  - 统一采集 traces / metrics / logs
- `Langfuse`
  - LLM / agent / prompt / eval 观测
- `Prometheus`
  - 基础运行指标与时间序列
- `Grafana`
  - 统一 dashboard 与告警视图
- `Postgres`
  - task / agent / ROI 业务事实与聚合结果
- `Redis`
  - 短期事件缓冲与异步聚合协调

原则是：

- 平台业务事实放 `Postgres`
- 基础运行指标放 `Prometheus`
- LLM 链路与 trace 放 `Langfuse + OpenTelemetry`
- 展示和告警尽量统一收敛到 `Grafana`

---

## 3. 为什么要单独做这个模块

CIForce 不是单纯聊天产品，而是数字劳动力协作平台。

既然平台上会存在：

- 多个 agent
- 多个业务板块
- 多个 workspace
- 多种 task 类型
- 多种工具调用

那么平台迟早要回答这些问题：

- 哪个 agent 真正有用
- 哪个 agent 成本太高
- 哪个 agent 在哪个业务板块表现最好
- 哪类任务最费 token
- 哪类流程最容易失败
- 哪个 workspace 的 ROI 最高

所以绩效与观测模块不是“附属报表”，而是平台治理能力的一部分。

---

## 4. 指标分层模型

### 4.1 Execution Metrics

用于判断“有没有跑通”：

- task run count
- success count
- fail count
- cancel count
- timeout count
- retry count
- average duration
- p95 duration
- tool error count

### 4.2 Resource Metrics

用于判断“投入了多少资源”：

- input tokens
- output tokens
- cached tokens
- request count
- SSE stream size
- file bytes in
- file bytes out
- tool invocation count
- sandbox session minutes

### 4.3 Cost Metrics

用于判断“花了多少钱”：

- model cost
- tool cost
- external api cost
- sandbox cost
- storage cost estimate
- total run cost

### 4.4 Quality Metrics

用于判断“结果好不好”：

- VEGA review score
- user feedback score
- output completeness score
- format compliance score
- rerun needed flag
- accepted on first pass rate

### 4.5 Business Metrics

用于判断“有没有业务价值”：

- report delivered
- asset published
- lead generated
- listing improved
- conversion uplift
- campaign ROI
- decision support usefulness

注意：

业务指标不一定能实时拿到，因此需要允许延迟回填。

### 4.6 ROI Metrics

用于判断“值不值”：

`ROI = (业务收益 - 总成本) / 总成本`

在早期无法拿到精确收益时，可以先采用代理指标：

- 人工节省工时
- 替代外包成本
- 缩短交付周期
- 首轮通过率提升

---

## 5. 绩效对象模型

### 5.1 TaskRun 是最小原始观测单位

一次任务应记录：

- 是否成功
- 执行了多久
- 消耗了多少 token
- 用了哪些 tool
- 最终成本多少
- 最终输出是否被接受

### 5.2 AgentRun 是 agent 绩效的最小分析单位

由于一个 `TaskRun` 里可能跑多个 worker / agent，因此应引入：

`TaskRun -> AgentRun`

一个 `AgentRun` 代表：

- 某个 agent 在某次任务中的单次贡献
- 它自己的 token、耗时、工具调用、状态、质量分

### 5.3 Workspace 是项目级聚合单位

用于回答：

- 这个项目最近用了哪些 agent
- 哪个 agent 最稳定
- 哪类任务最花钱
- 当前 workspace 的执行效率是否在变好

### 5.4 BusinessSector 是能力域聚合单位

用于回答：

- 亚马逊增长板块下哪个 agent 表现最好
- 视频分镜类任务的成功率如何
- 哪类业务板块最耗 token

### 5.5 Agent Profile 是长期绩效画像

用于回答：

- 某个 agent 在全平台的成功率
- 某个 agent 在特定业务板块的 ROI
- 某个 agent 是否值得继续保留 / 推荐 / 涨价

---

## 6. 推荐的数据表扩展

在现有 schema 基础上，建议后续新增以下表：

### 6.1 agent_runs

Purpose:

记录某个 agent / worker 在一次 `task_run` 中的表现。

关键字段建议：

- `id`
- `task_run_id`
- `workspace_id`
- `business_sector_id`
- `agent_key`
- `status`
- `started_at`
- `completed_at`
- `duration_ms`
- `input_tokens`
- `output_tokens`
- `cached_tokens`
- `tool_call_count`
- `model_cost_usd`
- `tool_cost_usd`
- `total_cost_usd`
- `quality_score`
- `accepted_first_pass`
- `error_type`

### 6.2 task_run_events

Purpose:

记录任务执行过程中的结构化事件流。

关键字段建议：

- `id`
- `task_run_id`
- `agent_run_id`
- `event_type`
- `event_ts`
- `payload`

事件类型示例：

- `task.started`
- `task.completed`
- `agent.started`
- `agent.completed`
- `tool.called`
- `tool.failed`
- `stream.chunk_sent`
- `review.scored`

### 6.3 token_usage_rollups

Purpose:

按日 / 周 / 月聚合 token 使用。

关键维度：

- tenant
- workspace
- business sector
- agent
- model
- day

### 6.4 agent_performance_snapshots

Purpose:

存放周期性聚合结果，便于 dashboard 秒开。

关键指标：

- success_rate
- failure_rate
- avg_duration_ms
- avg_total_cost_usd
- avg_quality_score
- avg_roi
- p95_duration_ms
- first_pass_accept_rate

### 6.5 business_outcome_links

Purpose:

把 `TaskRun / AgentRun` 与延迟到来的业务结果关联起来。

例如：

- 某次亚马逊优化任务关联到 14 天后的转化提升
- 某次视频脚本任务关联到投放点击率

---

## 7. 指标口径设计

### 7.1 成功

建议至少区分：

- `technical_success`
  - 运行未报错，流程完成
- `workflow_success`
  - VEGA 认为流程完成且产出有效
- `business_success`
  - 后续被业务采纳或产生业务价值

### 7.2 失效

建议区分：

- `runtime_failure`
  - 模型调用、tool、超时、异常
- `quality_failure`
  - 输出质量不达标
- `business_failure`
  - 虽然完成，但没有业务效果

### 7.3 投入

投入建议统一换算为：

- token 成本
- tool 成本
- sandbox 成本
- 人工参与分钟数

### 7.4 产出

产出建议两层表示：

- 直接产出
  - 报告、脚本、图片、分析、代码等
- 业务产出
  - 节省时间、提升转化、提高上线速度、提高通过率

### 7.5 ROI

早期先做两种 ROI：

- `Operational ROI`
  - 侧重效率收益
- `Business ROI`
  - 侧重真实业务结果

这样即便你早期没有完整业务闭环，也能先跑起来。

---

## 8. Token、流量与观测设计

### 8.0 推荐观测架构

建议把观测链路拆成五层：

```text
Application Layer
  -> OpenTelemetry SDK
  -> Langfuse SDK / integration

Collection Layer
  -> OpenTelemetry Collector

Storage Layer
  -> Prometheus
  -> Postgres
  -> Langfuse storage

Aggregation Layer
  -> rollup jobs
  -> snapshot jobs

Visualization Layer
  -> Grafana
  -> Langfuse UI
  -> CIForce internal dashboards
```

其中：

- `OpenTelemetry SDK` 负责统一埋点入口
- `OpenTelemetry Collector` 负责解耦采集与导出
- `Langfuse` 更适合看 agent / LLM 维度
- `Prometheus` 更适合看系统和服务维度
- `Postgres` 更适合做 ROI、业务聚合和平台报表

### 8.1 Token 监控维度

建议记录：

- model name
- prompt tokens
- completion tokens
- cached tokens
- reasoning tokens
- total tokens
- unit price
- total model cost

推荐采集来源：

- LLM SDK 原始 usage
- worker runtime 汇总
- task run 完成时回写

### 8.2 流量监控维度

建议记录：

- API request count
- SSE connection count
- SSE total bytes sent
- upload bytes
- artifact download bytes
- external API call count
- external API latency

推荐通过两种方式同时采集：

- API / gateway 层 HTTP metrics
- 应用层业务事件计数

### 8.3 Tool 观测维度

建议记录：

- tool name
- tool category
- call count
- success rate
- avg latency
- p95 latency
- failure type
- cost contribution

### 8.4 运行链路观测维度

建议记录：

- trace_id
- task_run_id
- agent_run_id
- runtime_thread_id
- workspace_id
- model
- tool span

这样便于接 `Langfuse / OpenTelemetry`。

### 8.5 推荐组件职责

#### OpenTelemetry

适合负责：

- trace 上下文传播
- service / endpoint / worker span
- tool call span
- queue / async job span
- 统一导出到多后端

#### Langfuse

适合负责：

- prompt / completion 级观测
- agent run trace
- score / eval
- model cost 与 usage
- LLM 应用侧调试

#### Prometheus

适合负责：

- API QPS
- error rate
- latency
- worker concurrency
- queue depth
- sandbox usage gauge
- SSE active connections

#### Grafana

适合负责：

- 平台运营 dashboard
- infra dashboard
- alerting
- 多数据源联查视图

#### Postgres

适合负责：

- task_runs
- agent_runs
- ROI facts
- accepted-first-pass
- business outcome links

---

## 9. 推荐部署方式

### 9.1 Local / MVP

推荐：

- `Langfuse Cloud` 或轻量自托管
- `Prometheus + Grafana` 可选本地
- 应用直接接 `OpenTelemetry SDK`

目标：

- 先拿到 task / agent / token / cost 基础观测

### 9.2 Single-Server Production

推荐：

- 应用容器中接入 OpenTelemetry SDK
- 单独起 `otel-collector`
- `Prometheus + Grafana` 同机或托管
- `Langfuse Cloud` 或独立自托管

拓扑示意：

```text
API / Worker
  -> OTel SDK
  -> OTel Collector
      -> Prometheus
      -> Langfuse
      -> logs backend
```

### 9.3 Multi-Replica Production

推荐：

- 每个 API / worker 实例统一上报到 Collector
- Collector 再导出到 Prometheus / Langfuse / logs
- 聚合计算 job 独立部署

重点：

- 不要让每个 worker 各自直写所有观测后端
- 统一走 Collector 更容易治理

### 9.4 Kubernetes

推荐：

- `OpenTelemetry Collector` 作为独立 deployment 或 daemonset
- `Prometheus Operator`
- `Grafana`
- `Langfuse` 视规模决定 cloud 或 self-hosted

适合：

- 多服务
- 多副本
- 跨 namespace
- 统一告警与 tracing

---

## 10. Dashboard 设计建议

### 9.1 平台级 Dashboard

面向平台运营和管理者：

- 总任务量
- 成功率
- token 消耗
- 总成本
- agent 排名
- 高失败率 agent
- 高成本业务板块

### 9.2 Business Sector Dashboard

面向业务板块 owner：

- 该板块 agent 成功率
- 平均成本
- 平均质量分
- 平均 ROI
- 常见失败原因

### 9.3 Workspace Dashboard

面向项目 owner：

- 最近任务表现
- 文件 / 任务 / memory 增长
- 当前花费
- 当前最佳 agent
- 本项目最耗资源的流程

### 9.4 Agent Profile Dashboard

面向平台治理与人才市场：

- agent 成功率
- 平均耗时
- 平均 token 成本
- first-pass accept rate
- ROI 排名
- 适用业务板块
- 近期趋势

---

## 11. 推荐的计算流程

### 10.1 在线写入

在运行过程中实时写入：

- `task_runs`
- `agent_runs`
- `task_run_events`

### 10.2 离线聚合

周期性 job 聚合：

- token rollups
- cost rollups
- performance snapshots

### 10.3 延迟回填业务结果

当后续拿到业务结果时：

- 回填 `business_outcome_links`
- 重算 ROI
- 更新 agent performance snapshot

---

## 12. 和现有模型怎么接

### 11.1 与 Workspace-first 模型关系

必须坚持：

- 绩效原始数据跟 `task_run` 走
- 项目表现跟 `workspace` 聚合
- thread 只作为执行技术维度

不要把绩效分析直接挂在 thread 上。

### 11.2 与 VEGA Runtime 关系

VEGA 后续需要在每次调度时带上：

- `task_run_id`
- `workspace_id`
- `business_sector_id`
- `billing_tags`
- `trace_id`

worker 完成时回写：

- token usage
- cost
- status
- quality score
- trace metadata
- tool metrics summary

### 11.3 与 Tool Contract 关系

每个 tool 最好都返回标准化观测字段：

- `latency_ms`
- `success`
- `error_type`
- `cost_usd`
- `bytes_in`
- `bytes_out`

### 12.4 与部署体系关系

绩效与观测模块在部署上应遵循：

- 采集路径统一
- 存储职责分层
- 聚合任务独立运行
- dashboard 不直接依赖 runtime 内存

也就是说：

- runtime 负责产出原始事实
- collector 负责传输
- metric / trace backend 负责存储
- rollup jobs 负责重算
- dashboard 负责展示

---

## 13. 推荐的落地顺序

### 第一阶段

先补原始运行观测：

- `task_runs` 增加 token / cost 基础字段
- 新增 `agent_runs`
- 新增 `task_run_events`
- 接入 OpenTelemetry SDK
- 接入 Langfuse

### 第二阶段

做平台级 dashboard 指标：

- success rate
- fail rate
- avg duration
- token usage
- cost by agent
- Prometheus + Grafana 基础看板

### 第三阶段

做质量与 accepted-first-pass 体系：

- VEGA review score
- user feedback score
- output acceptance
- Alerting 与异常阈值

### 第四阶段

做 ROI 体系：

- operational ROI
- business ROI
- business outcome backfill
- 多维聚合快照

---

## 14. Final Recommendation

这个模块最好的设计方式不是“再加一个统计表”，而是把它当成平台治理层来建设。

推荐结构是：

- `TaskRun`: 原始任务观测
- `AgentRun`: 单 agent 绩效观测
- `TaskRunEvents`: 事件流
- `Rollups / Snapshots`: 聚合结果
- `BusinessOutcomeLinks`: ROI 回填
- `OpenTelemetry`: 统一采集
- `Langfuse`: LLM / agent 观测
- `Prometheus + Grafana`: 系统指标与告警

一句话总结：

`先把每次执行的原始事实记清楚，再在 Workspace、Business Sector、Agent 三层做聚合，最后再做 ROI 和排名。`
