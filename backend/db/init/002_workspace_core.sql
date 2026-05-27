CREATE TABLE IF NOT EXISTS business_sectors (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    icon TEXT,
    color TEXT,
    settings TEXT NOT NULL DEFAULT '{}',
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    business_sector_id TEXT NOT NULL REFERENCES business_sectors(id),
    name TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    canvas_state TEXT NOT NULL DEFAULT '{}',
    settings TEXT NOT NULL DEFAULT '{}',
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_sectors_tenant_status_sort
    ON business_sectors(tenant_id, status, sort_order, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_sectors_tenant_slug
    ON business_sectors(tenant_id, slug)
    WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_sector_created
    ON workspaces(business_sector_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_status_created
    ON workspaces(tenant_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_sector_slug
    ON workspaces(business_sector_id, slug)
    WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
    ON workspace_members(user_id, workspace_id);
