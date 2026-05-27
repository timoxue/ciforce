# CIForce Runtime Extension Schema v1

**日期**: 2026-05-26  
**版本**: v0.1  
**状态**: Draft

---

## 1. Scope

本文件用于补充 `Workspace Runtime Database Schema v1` 中尚未展开的两类扩展表：

- 绩效与观测扩展
  - `agent_runs`
  - `task_run_events`
  - `token_usage_rollups`
  - `agent_performance_snapshots`
  - `business_outcome_links`
- 配置中心与数字劳动力分配扩展
  - `config_profiles`
  - `capability_profiles`
  - `worker_profiles`
  - `config_bindings`
  - `worker_assignments`
  - `runtime_resolved_configs`

本文件是主 schema 文档的扩展，不替代主 schema。

---

## 2. Canonical References

- `docs/architecture/2026-05-26-workspace-runtime-database-schema-v1.md`
- `docs/architecture/2026-05-26-agent-performance-observability-metrics-v1.md`
- `docs/architecture/2026-05-26-config-center-worker-assignment-v1.md`
- `docs/architecture/adr/0001-workspace-first-runtime-model.md`

---

## 3. Design Principles

### 3.1 仍然坚持 workspace-first

这些扩展表虽然看起来更偏运行态、绩效、配置，但主归属原则不变：

`Business Sector -> Workspace -> TaskRun -> Runtime Thread`

### 3.2 原始事实和聚合结果分开

推荐：

- 原始事实表：`agent_runs`、`task_run_events`
- 聚合结果表：`token_usage_rollups`、`agent_performance_snapshots`

### 3.3 配置定义和分配关系分开

推荐：

- 配置定义：`config_profiles`
- 分配关系：`config_bindings`、`worker_assignments`
- 运行时解析结果：`runtime_resolved_configs`

---

## 4. Performance And Observability Extension Tables

### Table: agent_runs

Purpose:

记录某个数字劳动力在某次 `task_run` 中的单次表现。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| business_sector_id | uuid | no |  | fk -> business_sectors.id |
| workspace_id | uuid | no |  | fk -> workspaces.id |
| task_run_id | uuid | no |  | fk -> task_runs.id |
| runtime_thread_id | uuid | yes |  | fk -> runtime_threads.id |
| worker_profile_id | uuid | yes |  | fk -> worker_profiles.id |
| agent_key | text | no |  | worker / agent key |
| parent_agent_run_id | uuid | yes |  | self fk for sub-agent nesting |
| run_role | text | no | `'worker'` | worker, subagent, reviewer, router |
| status | text | no | `'queued'` | queued, running, completed, failed, canceled |
| input_tokens | integer | no | 0 |  |
| output_tokens | integer | no | 0 |  |
| cached_tokens | integer | no | 0 |  |
| reasoning_tokens | integer | no | 0 | optional |
| tool_call_count | integer | no | 0 |  |
| model_name | text | yes |  |  |
| model_provider | text | yes |  |  |
| model_cost_usd | numeric(18,6) | no | 0 |  |
| tool_cost_usd | numeric(18,6) | no | 0 |  |
| sandbox_cost_usd | numeric(18,6) | no | 0 |  |
| total_cost_usd | numeric(18,6) | no | 0 |  |
| duration_ms | bigint | yes |  |  |
| quality_score | numeric(5,2) | yes |  | normalized 0-100 |
| accepted_first_pass | boolean | yes |  |  |
| resolved_config_id | uuid | yes |  | fk -> runtime_resolved_configs.id |
| error_type | text | yes |  | timeout, tool_error, model_error, review_fail |
| error_message | text | yes |  |  |
| started_at | timestamptz | yes |  |  |
| completed_at | timestamptz | yes |  |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- index on `(task_run_id, created_at)`
- index on `(workspace_id, agent_key, created_at desc)`
- index on `(business_sector_id, agent_key, created_at desc)`
- index on `(agent_key, status, created_at desc)`
- index on `(resolved_config_id)`

Constraints:

- `run_role in ('worker', 'subagent', 'reviewer', 'router')`
- `status in ('queued', 'running', 'completed', 'failed', 'canceled')`

Relations:

- many agent runs belong to one task run
- one task run may have many agent runs

### Table: task_run_events

Purpose:

记录任务执行过程中的结构化事件流。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| workspace_id | uuid | no |  | fk -> workspaces.id |
| task_run_id | uuid | no |  | fk -> task_runs.id |
| agent_run_id | uuid | yes |  | fk -> agent_runs.id |
| runtime_thread_id | uuid | yes |  | fk -> runtime_threads.id |
| event_type | text | no |  | task.started, tool.called, review.scored |
| event_source | text | no | `'runtime'` | runtime, worker, tool, user, system |
| event_ts | timestamptz | no | now() |  |
| payload | jsonb | no | `'{}'::jsonb` | structured event payload |
| trace_id | text | yes |  | tracing correlation |
| span_id | text | yes |  | tracing correlation |
| created_at | timestamptz | no | now() |  |

Indexes:

- index on `(task_run_id, event_ts)`
- index on `(agent_run_id, event_ts)`
- index on `(event_type, event_ts desc)`
- index on `(trace_id)`

Constraints:

- `event_source in ('runtime', 'worker', 'tool', 'user', 'system')`

Relations:

- many events belong to one task run

### Table: token_usage_rollups

Purpose:

按时间窗口聚合 token 与成本使用。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| business_sector_id | uuid | yes |  | fk -> business_sectors.id |
| workspace_id | uuid | yes |  | fk -> workspaces.id |
| agent_key | text | yes |  | aggregate dimension |
| model_name | text | yes |  | aggregate dimension |
| bucket_type | text | no |  | day, week, month |
| bucket_start | timestamptz | no |  | inclusive window start |
| bucket_end | timestamptz | no |  | exclusive window end |
| input_tokens | bigint | no | 0 |  |
| output_tokens | bigint | no | 0 |  |
| cached_tokens | bigint | no | 0 |  |
| reasoning_tokens | bigint | no | 0 |  |
| total_cost_usd | numeric(18,6) | no | 0 |  |
| request_count | bigint | no | 0 |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- unique index on `(tenant_id, coalesce(workspace_id,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(agent_key,''), coalesce(model_name,''), bucket_type, bucket_start)`
- index on `(tenant_id, bucket_type, bucket_start desc)`

Constraints:

- `bucket_type in ('day', 'week', 'month')`

### Table: agent_performance_snapshots

Purpose:

周期性存储 agent 绩效聚合结果，供 dashboard 快速读取。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| business_sector_id | uuid | yes |  | fk -> business_sectors.id |
| workspace_id | uuid | yes |  | fk -> workspaces.id |
| agent_key | text | no |  |  |
| snapshot_type | text | no |  | workspace, sector, tenant |
| window_type | text | no |  | day, week, month, all_time |
| window_start | timestamptz | yes |  |  |
| window_end | timestamptz | yes |  |  |
| run_count | bigint | no | 0 |  |
| success_rate | numeric(5,2) | no | 0 | 0-100 |
| failure_rate | numeric(5,2) | no | 0 | 0-100 |
| first_pass_accept_rate | numeric(5,2) | no | 0 | 0-100 |
| avg_duration_ms | bigint | no | 0 |  |
| p95_duration_ms | bigint | no | 0 |  |
| avg_total_cost_usd | numeric(18,6) | no | 0 |  |
| avg_quality_score | numeric(5,2) | no | 0 |  |
| avg_operational_roi | numeric(12,4) | yes |  |  |
| avg_business_roi | numeric(12,4) | yes |  |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- index on `(tenant_id, snapshot_type, window_type, created_at desc)`
- index on `(agent_key, snapshot_type, created_at desc)`
- index on `(workspace_id, created_at desc)`
- index on `(business_sector_id, created_at desc)`

Constraints:

- `snapshot_type in ('workspace', 'sector', 'tenant')`
- `window_type in ('day', 'week', 'month', 'all_time')`

### Table: business_outcome_links

Purpose:

把任务执行与延迟到来的业务结果关联起来，用于 ROI 回填。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| workspace_id | uuid | no |  | fk -> workspaces.id |
| task_run_id | uuid | yes |  | fk -> task_runs.id |
| agent_run_id | uuid | yes |  | fk -> agent_runs.id |
| outcome_type | text | no |  | conversion_uplift, time_saved, revenue, publish_success |
| outcome_value | numeric(18,6) | yes |  | raw numeric outcome |
| outcome_unit | text | yes |  | percent, usd, hours, count |
| estimated_value_usd | numeric(18,6) | yes |  | normalized value |
| attribution_window_days | integer | yes |  | attribution window |
| source_system | text | yes |  | ads, manual, crm, ecommerce |
| metadata | jsonb | no | `'{}'::jsonb` | extra attribution data |
| recorded_at | timestamptz | no | now() |  |
| created_at | timestamptz | no | now() |  |

Indexes:

- index on `(workspace_id, recorded_at desc)`
- index on `(task_run_id, recorded_at desc)`
- index on `(agent_run_id, recorded_at desc)`
- index on `(outcome_type, recorded_at desc)`

---

## 5. Config Center And Worker Assignment Extension Tables

### Table: config_profiles

Purpose:

存放统一配置模板。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | yes |  | null means global/shared |
| key | text | no |  | stable config key |
| name | text | no |  | display name |
| scope_type | text | no |  | global, capability, worker, sector, workspace |
| config_type | text | no |  | model_policy, tool_policy, prompt_policy, budget_policy, observability_policy, output_contract_policy |
| version | text | no | `'v1'` |  |
| status | text | no | `'draft'` | draft, active, archived |
| payload | jsonb | no | `'{}'::jsonb` | config body |
| created_by | uuid | yes |  | fk -> users.id |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- unique index on `(coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), key, version)`
- index on `(scope_type, config_type, status)`

Constraints:

- `scope_type in ('global', 'capability', 'worker', 'sector', 'workspace')`
- `config_type in ('model_policy', 'tool_policy', 'prompt_policy', 'budget_policy', 'observability_policy', 'output_contract_policy')`
- `status in ('draft', 'active', 'archived')`

### Table: capability_profiles

Purpose:

存放能力模板，例如研究、视频分镜、数据分析等能力层定义。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | yes |  | null means global/shared |
| key | text | no |  | stable capability key |
| name | text | no |  |  |
| description | text | yes |  |  |
| status | text | no | `'active'` | active, archived |
| metadata | jsonb | no | `'{}'::jsonb` | extra capability data |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- unique index on `(coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), key)`

Constraints:

- `status in ('active', 'archived')`

### Table: worker_profiles

Purpose:

存放数字劳动力实例档案。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | yes |  | null means global/shared |
| agent_key | text | no |  | linked to runtime worker key |
| name | text | no |  |  |
| manifest_ref_id | uuid | yes |  | logical ref to agent manifest row |
| default_capability_profile_id | uuid | yes |  | fk -> capability_profiles.id |
| status | text | no | `'active'` | active, disabled, archived |
| metadata | jsonb | no | `'{}'::jsonb` | UI / governance data |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- unique index on `(coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), agent_key)`
- index on `(status, created_at desc)`

Constraints:

- `status in ('active', 'disabled', 'archived')`

### Table: config_bindings

Purpose:

存放配置模板和目标对象之间的绑定关系。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| target_type | text | no |  | capability, worker, business_sector, workspace, task_run |
| target_id | uuid | no |  | referenced by target_type |
| profile_id | uuid | no |  | fk -> config_profiles.id |
| priority | integer | no | 100 | lower number resolves earlier or use explicit strategy |
| is_enabled | boolean | no | true |  |
| effective_from | timestamptz | yes |  |  |
| effective_to | timestamptz | yes |  |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- index on `(target_type, target_id, is_enabled)`
- index on `(profile_id, is_enabled)`

Constraints:

- `target_type in ('capability', 'worker', 'business_sector', 'workspace', 'task_run')`

### Table: worker_assignments

Purpose:

存放数字劳动力在业务板块和 Workspace 中的分配关系。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| worker_profile_id | uuid | no |  | fk -> worker_profiles.id |
| business_sector_id | uuid | yes |  | fk -> business_sectors.id |
| workspace_id | uuid | yes |  | fk -> workspaces.id |
| assignment_mode | text | no | `'optional'` | default, optional, hidden, required |
| visibility_scope | text | no | `'sector'` | sector, workspace |
| is_enabled | boolean | no | true |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- index on `(business_sector_id, assignment_mode, is_enabled)`
- index on `(workspace_id, assignment_mode, is_enabled)`
- index on `(worker_profile_id, is_enabled)`

Constraints:

- `assignment_mode in ('default', 'optional', 'hidden', 'required')`
- `visibility_scope in ('sector', 'workspace')`
- check `business_sector_id is not null or workspace_id is not null`

### Table: runtime_resolved_configs

Purpose:

保存运行时最终解析后的配置快照，用于审计和回放。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| workspace_id | uuid | no |  | fk -> workspaces.id |
| task_run_id | uuid | no |  | fk -> task_runs.id |
| worker_profile_id | uuid | yes |  | fk -> worker_profiles.id |
| agent_key | text | no |  |  |
| resolved_payload | jsonb | no | `'{}'::jsonb` | final merged config |
| resolution_trace | jsonb | no | `'[]'::jsonb` | source and override explanation |
| config_fingerprint | text | yes |  | hash for comparison |
| created_at | timestamptz | no | now() |  |

Indexes:

- index on `(task_run_id, created_at desc)`
- index on `(workspace_id, agent_key, created_at desc)`
- index on `(config_fingerprint)`

---

## 6. Suggested Implementation Order

### Phase 1

先落最小观测与配置能力：

- `agent_runs`
- `task_run_events`
- `config_profiles`
- `worker_profiles`
- `worker_assignments`

### Phase 2

补聚合和绑定：

- `token_usage_rollups`
- `agent_performance_snapshots`
- `config_bindings`
- `runtime_resolved_configs`

### Phase 3

补 ROI 回填：

- `business_outcome_links`

---

## 7. Notes

- `agent_runs` 是后续做 agent 排名、淘汰、优选的基础事实表
- `runtime_resolved_configs` 是解释“这次为什么用这个模型和工具”的关键
- `task_run_events` 尽量保持结构化，不要只存纯文本日志
- `token_usage_rollups` 和 `agent_performance_snapshots` 适合用异步 job 周期性重算
