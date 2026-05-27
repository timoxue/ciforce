CREATE TABLE IF NOT EXISTS task_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    business_sector_id TEXT,
    workspace_id TEXT,
    workspace_name TEXT,
    user_id TEXT,
    agent_key TEXT,
    title TEXT,
    goal TEXT NOT NULL,
    status TEXT NOT NULL,
    trigger_source TEXT NOT NULL DEFAULT 'workspace',
    thread_id TEXT,
    billing_tags TEXT NOT NULL DEFAULT '{}',
    request_tags TEXT NOT NULL DEFAULT '{}',
    file_refs TEXT NOT NULL DEFAULT '[]',
    memory_refs TEXT NOT NULL DEFAULT '[]',
    knowledge_refs TEXT NOT NULL DEFAULT '[]',
    final_reply TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS runtime_threads (
    id TEXT PRIMARY KEY,
    task_run_id TEXT NOT NULL REFERENCES task_runs(id),
    engine TEXT NOT NULL,
    thread_id TEXT NOT NULL UNIQUE,
    checkpoint_ref TEXT,
    state_snapshot TEXT,
    is_primary INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    business_sector_id TEXT,
    workspace_id TEXT,
    task_run_id TEXT NOT NULL REFERENCES task_runs(id),
    runtime_thread_id TEXT,
    agent_key TEXT NOT NULL,
    run_role TEXT NOT NULL DEFAULT 'worker',
    status TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    reasoning_tokens INTEGER NOT NULL DEFAULT 0,
    tool_call_count INTEGER NOT NULL DEFAULT 0,
    model_name TEXT,
    model_provider TEXT,
    model_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    tool_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    sandbox_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    quality_score DOUBLE PRECISION,
    accepted_first_pass INTEGER,
    resolved_config_id TEXT,
    error_type TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_run_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    workspace_id TEXT,
    task_run_id TEXT NOT NULL REFERENCES task_runs(id),
    agent_run_id TEXT,
    runtime_thread_id TEXT,
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL DEFAULT 'runtime',
    event_ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payload TEXT NOT NULL DEFAULT '{}',
    trace_id TEXT,
    span_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_runs_workspace_created
    ON task_runs(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_runs_status_created
    ON task_runs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_runs_thread_id
    ON task_runs(thread_id);

CREATE INDEX IF NOT EXISTS idx_runtime_threads_task_run_id
    ON runtime_threads(task_run_id);

CREATE INDEX IF NOT EXISTS idx_agent_runs_task_run_id
    ON agent_runs(task_run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace_agent
    ON agent_runs(workspace_id, agent_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_status
    ON agent_runs(agent_key, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_run_events_task_run_ts
    ON task_run_events(task_run_id, event_ts);

CREATE INDEX IF NOT EXISTS idx_task_run_events_agent_run_ts
    ON task_run_events(agent_run_id, event_ts);

CREATE INDEX IF NOT EXISTS idx_task_run_events_type_ts
    ON task_run_events(event_type, event_ts DESC);
