# CIForce Workspace Runtime Database Schema v1

**日期**: 2026-05-26  
**版本**: v0.1  
**状态**: Draft

---

## 1. Scope

本次 schema 设计覆盖以下核心实体：

- `tenants`
- `users`
- `business_sectors`
- `workspaces`
- `workspace_members`
- `workspace_files`
- `task_runs`
- `runtime_threads`
- `memory_refs`
- `agent_manifests`
- `audit_logs`

本文件聚焦 `workspace-first runtime model` 的第一版关系型落地，不覆盖更细的 billing、marketplace settlement、复杂 knowledge chunking 表。

后续扩展：

- `agent_runs`
- `task_run_events`
- `token_usage_rollups`
- `agent_performance_snapshots`
- `business_outcome_links`
- `config_profiles`
- `capability_profiles`
- `worker_profiles`
- `config_bindings`
- `worker_assignments`
- `runtime_resolved_configs`

---

## 2. Business Goal

这组表的目标是让 CIForce 可以稳定承载以下能力：

1. 用 `Business Sector -> Workspace -> TaskRun -> Runtime Thread` 组织运行上下文
2. 让文件、任务、记忆都清晰归属到 `Workspace`
3. 支持 VEGA / LangGraph 运行时恢复与审计
4. 为后续权限、计费、RAG、外部 agent 接入保留扩展位

---

## 3. Canonical References

- Relevant architecture docs:
  - `docs/architecture/2026-05-26-digital-labor-execution-framework.md`
  - `docs/architecture/2026-05-26-workspace-canvas-ui-data-model.md`
  - `docs/architecture/2026-05-26-backend-infrastructure-workspace-tools-deployment.md`
- Relevant ADRs:
  - `docs/architecture/adr/0001-workspace-first-runtime-model.md`

---

## 4. Entities

### Entity: Tenant

- Purpose: 多租户边界
- Owner: platform
- Lifecycle: 长期存在，通常由组织级别控制

### Entity: Business Sector

- Purpose: 业务能力分类与模板容器
- Owner: tenant / admin
- Lifecycle: 可长期保留，可版本化

### Entity: Workspace

- Purpose: 项目执行现场与主上下文容器
- Owner: tenant / workspace members
- Lifecycle: draft -> active -> archived

### Entity: Task Run

- Purpose: 一次执行记录、审计和状态跟踪单位
- Owner: VEGA runtime
- Lifecycle: queued -> running -> completed / failed / canceled

### Entity: Runtime Thread

- Purpose: 执行引擎会话容器，如 LangGraph `thread_id`
- Owner: runtime
- Lifecycle: 依附 TaskRun，可恢复

### Entity: Workspace File

- Purpose: Workspace 文件元数据
- Owner: workspace
- Lifecycle: uploaded / generated / archived / deleted

### Entity: Memory Ref

- Purpose: Workspace 记忆条目与知识引用
- Owner: workspace / runtime
- Lifecycle: active / archived

---

## 5. Tables

### Table: tenants

Purpose:

存放租户或组织级别信息。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| slug | text | no |  | unique tenant slug |
| name | text | no |  | display name |
| status | text | no | `'active'` | active, suspended, archived |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- unique index on `slug`

Constraints:

- `status in ('active', 'suspended', 'archived')`

Relations:

- one tenant has many business sectors
- one tenant has many workspaces

### Table: users

Purpose:

存放平台用户基础信息。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| email | text | yes |  | unique inside tenant |
| display_name | text | no |  |  |
| role | text | no | `'member'` | owner, admin, member |
| status | text | no | `'active'` | active, invited, disabled |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- index on `(tenant_id, email)`

Constraints:

- `role in ('owner', 'admin', 'member')`
- `status in ('active', 'invited', 'disabled')`

Relations:

- many users belong to one tenant

### Table: business_sectors

Purpose:

存放业务板块定义与模板配置。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| slug | text | no |  | unique inside tenant |
| name | text | no |  |  |
| description | text | yes |  |  |
| status | text | no | `'draft'` | draft, published, live, archived |
| version | text | no | `'v1'` | template version |
| template_canvas | jsonb | no | `'{"nodes":[],"edges":[]}'::jsonb` | default canvas |
| default_agent_keys | jsonb | no | `'[]'::jsonb` | visible workforce defaults |
| default_knowledge_refs | jsonb | no | `'[]'::jsonb` | shared references |
| created_by | uuid | yes |  | fk -> users.id |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- unique index on `(tenant_id, slug)`
- index on `(tenant_id, status)`

Constraints:

- `status in ('draft', 'published', 'live', 'archived')`

Relations:

- one business sector has many workspaces

### Table: workspaces

Purpose:

存放 Workspace 主体与当前画布。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| business_sector_id | uuid | no |  | fk -> business_sectors.id |
| slug | text | no |  | unique inside tenant |
| name | text | no |  |  |
| description | text | yes |  |  |
| status | text | no | `'draft'` | draft, active, archived |
| canvas | jsonb | no | `'{"nodes":[],"edges":[]}'::jsonb` | current workspace canvas |
| template_version_applied | text | yes |  | inherited sector template version |
| last_task_run_at | timestamptz | yes |  | for listing/sorting |
| archived_at | timestamptz | yes |  |  |
| created_by | uuid | yes |  | fk -> users.id |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- unique index on `(tenant_id, slug)`
- index on `(tenant_id, business_sector_id, status)`
- index on `(tenant_id, last_task_run_at desc)`

Constraints:

- `status in ('draft', 'active', 'archived')`

Relations:

- many workspaces belong to one business sector
- one workspace has many files
- one workspace has many task runs
- one workspace has many memory refs

### Table: workspace_members

Purpose:

存放 workspace 级协作与 RBAC 映射。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| workspace_id | uuid | no |  | fk -> workspaces.id |
| user_id | uuid | no |  | fk -> users.id |
| member_role | text | no | `'editor'` | owner, editor, viewer |
| joined_at | timestamptz | no | now() |  |

Indexes:

- unique index on `(workspace_id, user_id)`
- index on `(user_id, member_role)`

Constraints:

- `member_role in ('owner', 'editor', 'viewer')`

Relations:

- many users can belong to many workspaces

### Table: workspace_files

Purpose:

存放 Workspace 文件元数据，不直接存大文件内容。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| workspace_id | uuid | no |  | fk -> workspaces.id |
| uploaded_by | uuid | yes |  | fk -> users.id |
| file_name | text | no |  | original name |
| file_kind | text | no | `'other'` | brief, asset, report, knowledge, other |
| mime_type | text | yes |  |  |
| size_bytes | bigint | yes |  |  |
| storage_provider | text | no | `'r2'` | r2, s3, minio, local |
| storage_key | text | no |  | object storage path |
| source | text | no | `'upload'` | upload, generated, linked |
| sha256 | text | yes |  | optional dedupe hash |
| metadata | jsonb | no | `'{}'::jsonb` | extra file metadata |
| created_at | timestamptz | no | now() |  |
| deleted_at | timestamptz | yes |  | soft delete |

Indexes:

- index on `(workspace_id, created_at desc)`
- index on `(workspace_id, file_kind)`
- index on `(storage_provider, storage_key)`

Constraints:

- `file_kind in ('brief', 'asset', 'report', 'knowledge', 'other')`
- `source in ('upload', 'generated', 'linked')`

Relations:

- many files belong to one workspace

### Table: task_runs

Purpose:

存放每一次 VEGA / worker 执行记录。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| business_sector_id | uuid | no |  | fk -> business_sectors.id |
| workspace_id | uuid | no |  | fk -> workspaces.id |
| requested_by | uuid | yes |  | fk -> users.id |
| agent_key | text | no |  | top-level worker / route key |
| title | text | yes |  | user-visible title |
| goal | text | no |  | task goal |
| status | text | no | `'queued'` | queued, running, completed, failed, canceled |
| trigger_source | text | no | `'workspace'` | workspace, api, schedule, webhook |
| final_reply | text | yes |  | VEGA summary |
| error_message | text | yes |  | terminal error summary |
| started_at | timestamptz | yes |  |  |
| completed_at | timestamptz | yes |  |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- index on `(workspace_id, created_at desc)`
- index on `(workspace_id, status, created_at desc)`
- index on `(requested_by, created_at desc)`

Constraints:

- `status in ('queued', 'running', 'completed', 'failed', 'canceled')`
- `trigger_source in ('workspace', 'api', 'schedule', 'webhook')`

Relations:

- many task runs belong to one workspace
- one task run may have one or more runtime threads

### Table: runtime_threads

Purpose:

记录执行引擎线程与 `TaskRun` 的映射，例如 LangGraph `thread_id`。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| task_run_id | uuid | no |  | fk -> task_runs.id |
| engine | text | no | `'langgraph'` | langgraph, deerflow, remote |
| thread_id | text | no |  | external runtime thread id |
| checkpoint_ref | text | yes |  | pointer if needed |
| state_snapshot | jsonb | yes |  | optional summarized state |
| is_primary | boolean | no | true | primary runtime mapping |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- unique index on `(engine, thread_id)`
- index on `(task_run_id, is_primary)`

Constraints:

- `engine in ('langgraph', 'deerflow', 'remote')`

Relations:

- many runtime threads belong to one task run

### Table: memory_refs

Purpose:

存放 Workspace 级记忆条目和可引用知识。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| workspace_id | uuid | no |  | fk -> workspaces.id |
| task_run_id | uuid | yes |  | fk -> task_runs.id |
| title | text | no |  |  |
| content | text | no |  | raw memory text |
| source | text | no | `'note'` | note, task_output, file_extract, imported |
| importance | smallint | no | 3 | 1..5 |
| is_pinned | boolean | no | false | keep long-term |
| metadata | jsonb | no | `'{}'::jsonb` | optional embeddings, tags, refs |
| created_at | timestamptz | no | now() |  |
| archived_at | timestamptz | yes |  |  |

Indexes:

- index on `(workspace_id, created_at desc)`
- index on `(workspace_id, is_pinned, importance desc)`
- index on `(task_run_id)`

Constraints:

- `source in ('note', 'task_output', 'file_extract', 'imported')`
- `importance between 1 and 5`

Relations:

- many memory refs belong to one workspace
- some memory refs originate from one task run

### Table: agent_manifests

Purpose:

存放数字劳动力 / worker / remote agent 的 manifest 快照。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | yes |  | null means global/shared |
| agent_key | text | no |  | unique key |
| source_type | text | no | `'internal'` | internal, partner, remote |
| version | text | no | `'v1'` | manifest version |
| manifest | jsonb | no | `'{}'::jsonb` | full manifest body |
| enabled | boolean | no | true |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() |  |

Indexes:

- unique index on `(coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), agent_key, version)`
- index on `(source_type, enabled)`

Constraints:

- `source_type in ('internal', 'partner', 'remote')`

Relations:

- optional tenant-scoped or global manifests

### Table: audit_logs

Purpose:

存放安全、权限、工具调用、任务操作等审计事件。

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |
| tenant_id | uuid | no |  | fk -> tenants.id |
| workspace_id | uuid | yes |  | fk -> workspaces.id |
| task_run_id | uuid | yes |  | fk -> task_runs.id |
| actor_user_id | uuid | yes |  | fk -> users.id |
| actor_type | text | no | `'user'` | user, system, worker, tool |
| event_type | text | no |  | e.g. workspace.created |
| event_payload | jsonb | no | `'{}'::jsonb` | structured details |
| created_at | timestamptz | no | now() |  |

Indexes:

- index on `(tenant_id, created_at desc)`
- index on `(workspace_id, created_at desc)`
- index on `(task_run_id, created_at desc)`
- index on `(event_type, created_at desc)`

Constraints:

- `actor_type in ('user', 'system', 'worker', 'tool')`

Relations:

- audit events may point to workspace and task run

---

## 6. Ownership Model

- Tenant scope:
  - `tenants`
  - `users`
  - `business_sectors`
  - `agent_manifests`
- Business sector scope:
  - `business_sectors`
- Workspace scope:
  - `workspaces`
  - `workspace_members`
  - `workspace_files`
  - `memory_refs`
- Task run scope:
  - `task_runs`
  - `runtime_threads`
  -部分 `audit_logs`

核心原则：

- `workspace_id` 是绝大多数业务运行数据的主归属外键
- `task_run_id` 是一次执行的审计与恢复归属
- `thread_id` 永远不直接承担平台主归属

---

## 7. Migration Plan

- New tables:
  - `tenants`
  - `users`
  - `business_sectors`
  - `workspaces`
  - `workspace_members`
  - `workspace_files`
  - `task_runs`
  - `runtime_threads`
  - `memory_refs`
  - `agent_manifests`
  - `audit_logs`
- Altered tables:
  - 当前仓库还未形成稳定正式 schema，可视为首次落表
- Backfill:
  - 若已有历史 `thread_id` 数据，需要回填到 `runtime_threads`
  - 若已有历史任务记录，需要补 `workspace_id`
- Compatibility strategy:
  - 初期允许 `runtime_threads.thread_id` 与现有 LangGraph thread 保持 1:1
  - 后期如支持多引擎，可扩为 1 task run -> N runtime threads

---

## 8. Access Pattern

- Read patterns:
  - 按 tenant 列出 business sectors
  - 按 business sector 列出 workspaces
  - 按 workspace 查询 files / task runs / memory refs
  - 按 task run 查 runtime thread 与最终结果
- Write patterns:
  - 创建 workspace 时写入 canvas 初始值
  - 上传文件时写入 `workspace_files`
  - 启动 VEGA 任务时写入 `task_runs`
  - 运行时创建 `runtime_threads`
  - 任务完成后写入 final reply 与 memory refs
- Reporting patterns:
  - 某 workspace 最近运行次数
  - 某 business sector 活跃 workspace 数
  - 某 agent_key 的运行量与失败率
  - 某 tenant 的文件增长与任务消耗

---

## 9. Risks

- `canvas` 直接放 jsonb，后续若需要更细粒度协作编辑，可能要拆子表或事件流
- `template_canvas` 版本管理若复杂化，可能需要单独 `business_sector_versions`
- `memory_refs` 当前是轻量模型，后续 embedding / retrieval 可能拆分 chunk 表
- `agent_manifests` 若引入 marketplace 结算，后续要补 license / provider / billing fields

---

## 10. Verification

- Migration test:
  - 能否成功创建全部表与索引
  - 外键关系是否满足 `workspace-first` 约束
- Query test:
  - 能否快速列出 workspace files / task runs / memory refs
  - 能否从 `task_run_id` 找到 runtime thread
- Rollback plan:
  - 首次建表阶段以 migration 回滚为主
  - 正式上线前先在 staging 使用匿名测试数据验证

---

## 11. Suggested Implementation Order

建议按以下顺序落库：

1. `tenants`
2. `users`
3. `business_sectors`
4. `workspaces`
5. `workspace_members`
6. `workspace_files`
7. `task_runs`
8. `runtime_threads`
9. `memory_refs`
10. `agent_manifests`
11. `audit_logs`

优先级判断：

- 第一批先让 `business sectors / workspaces / task_runs / runtime_threads` 跑通
- 第二批补 `workspace_files / memory_refs`
- 第三批补 `audit_logs / agent_manifests`
