import type {
  BusinessSector,
  BusinessSectorStatus,
  Workspace,
  WorkspaceCanvas,
  WorkspaceStatus,
  WorkspaceTaskRun,
  WorkspaceTaskStatus,
} from '../types';

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL ?? '';
const DEFAULT_TENANT_ID = 'default';

interface ApiBusinessSector {
  id: string;
  tenant_id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  status: string;
  sort_order?: number;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface ApiWorkspace {
  id: string;
  tenant_id: string;
  business_sector_id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  status: string;
  canvas_state?: WorkspaceCanvas | null;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface ApiTaskRun {
  id: string;
  workspace_id: string;
  business_sector_id: string;
  agent_key?: string | null;
  title?: string | null;
  goal: string;
  status: string;
  thread_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

function apiUrl(path: string) {
  return `${BACKEND}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function mapSectorStatus(status: string): BusinessSectorStatus {
  if (status === 'draft' || status === 'published' || status === 'live') return status;
  if (status === 'active') return 'live';
  return 'draft';
}

function mapWorkspaceStatus(status: string): WorkspaceStatus {
  if (status === 'draft' || status === 'active' || status === 'archived') return status;
  if (status === 'published' || status === 'live') return 'active';
  return 'draft';
}

function mapTaskStatus(status: string): WorkspaceTaskStatus {
  if (status === 'queued' || status === 'running') return status;
  if (status === 'completed' || status === 'done') return 'done';
  if (status === 'failed' || status === 'error') return 'error';
  return 'idle';
}

function sectorFromApi(sector: ApiBusinessSector, workspaces: Workspace[]): BusinessSector {
  const workspaceIds = workspaces
    .filter((workspace) => workspace.businessSectorId === sector.id)
    .map((workspace) => workspace.id);
  const firstCanvas = workspaces.find((workspace) => workspace.businessSectorId === sector.id)?.canvas;

  return {
    id: sector.id,
    name: sector.name,
    description: sector.description ?? '',
    status: mapSectorStatus(sector.status),
    version: (sector.settings?.version as string | undefined) ?? 'v0.1',
    templateCanvas: firstCanvas ?? { nodes: [], edges: [] },
    workspaceIds,
    summaryAgents: (sector.settings?.summaryAgents as BusinessSector['summaryAgents']) ?? [],
    summarySteps: (sector.settings?.summarySteps as string[] | undefined) ?? [],
    summaryMetric: sector.settings?.summaryMetric as BusinessSector['summaryMetric'],
    vegaMessage: (sector.settings?.vegaMessage as string | undefined) ?? `${sector.name} 已从后端加载`,
    createdAt: sector.created_at,
    updatedAt: sector.updated_at,
  };
}

function workspaceFromApi(workspace: ApiWorkspace): Workspace {
  return {
    id: workspace.id,
    businessSectorId: workspace.business_sector_id,
    name: workspace.name,
    description: workspace.description ?? '',
    status: mapWorkspaceStatus(workspace.status),
    canvas: workspace.canvas_state ?? { nodes: [], edges: [] },
    fileIds: [],
    taskIds: [],
    memoryIds: [],
    createdAt: workspace.created_at,
    updatedAt: workspace.updated_at,
  };
}

function taskRunFromApi(task: ApiTaskRun): WorkspaceTaskRun {
  return {
    id: task.id,
    workspaceId: task.workspace_id,
    businessSectorId: task.business_sector_id,
    agentKey: task.agent_key ?? 'vega',
    title: task.title ?? task.goal,
    status: mapTaskStatus(task.status),
    threadId: task.thread_id ?? undefined,
    startedAt: task.started_at ?? task.created_at,
    completedAt: task.completed_at ?? undefined,
  };
}

export async function loadWorkspaceModelFromApi(tenantId = DEFAULT_TENANT_ID) {
  const sectorResp = await requestJson<{ business_sectors: ApiBusinessSector[] }>(
    `/api/business-sectors?tenant_id=${encodeURIComponent(tenantId)}`,
  );
  const workspaceGroups = await Promise.all(
    sectorResp.business_sectors.map(async (sector) => {
      const resp = await requestJson<{ workspaces: ApiWorkspace[] }>(
        `/api/business-sectors/${encodeURIComponent(sector.id)}/workspaces?tenant_id=${encodeURIComponent(tenantId)}`,
      );
      return resp.workspaces.map(workspaceFromApi);
    }),
  );
  const workspaces = workspaceGroups.flat();
  const businessSectors = sectorResp.business_sectors.map((sector) => sectorFromApi(sector, workspaces));
  return { businessSectors, workspaces };
}

export async function createBusinessSectorWithWorkspace(input: {
  name: string;
  description?: string;
  templateCanvas: WorkspaceCanvas;
  version?: string;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const sectorResp = await requestJson<{ business_sector: ApiBusinessSector }>('/api/business-sectors', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      tenant_id: tenantId,
      description: input.description ?? '',
      status: 'active',
      settings: {
        version: input.version ?? 'v0.1',
        vegaMessage: `Boss，已创建「${input.name}」业务板块，画布已保存到后端。`,
      },
    }),
  });

  const workspaceResp = await requestJson<{ workspace: ApiWorkspace }>('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({
      name: `${input.name} / 默认项目`,
      business_sector_id: sectorResp.business_sector.id,
      tenant_id: tenantId,
      description: input.description || '默认执行空间',
      status: 'active',
      canvas_state: input.templateCanvas,
    }),
  });

  const workspace = workspaceFromApi(workspaceResp.workspace);
  return {
    sector: sectorFromApi(sectorResp.business_sector, [workspace]),
    workspace,
  };
}

export async function createWorkspaceForSector(input: {
  businessSectorId: string;
  name: string;
  description?: string;
  canvas?: WorkspaceCanvas;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const workspaceResp = await requestJson<{ workspace: ApiWorkspace }>('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      business_sector_id: input.businessSectorId,
      tenant_id: tenantId,
      description: input.description ?? '',
      status: 'active',
      canvas_state: input.canvas ?? { nodes: [], edges: [] },
    }),
  });

  return workspaceFromApi(workspaceResp.workspace);
}

export async function saveWorkspaceCanvas(workspaceId: string, canvas: WorkspaceCanvas) {
  const resp = await requestJson<{ workspace: ApiWorkspace }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/canvas`,
    {
      method: 'PATCH',
      body: JSON.stringify({ canvas_state: canvas }),
    },
  );
  return workspaceFromApi(resp.workspace);
}

export async function loadWorkspaceTaskRuns(workspaceId: string) {
  const resp = await requestJson<{ task_runs: ApiTaskRun[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/task-runs`,
  );
  return resp.task_runs.map(taskRunFromApi);
}
