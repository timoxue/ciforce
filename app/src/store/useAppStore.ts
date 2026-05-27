import { create } from 'zustand';
import {
  Agent,
  AppMode,
  BusinessSector,
  JobSpec,
  SimParams,
  SimReport,
  Workspace,
  WorkspaceCanvas,
  WorkspaceFile,
  WorkspaceMemoryRef,
  WorkspaceTaskRun,
} from '../types';
import { mockAgents, mockSimReports } from '../mocks/fixtures';

export type ActiveTab = 'workspace' | 'marketplace' | 'provider';

export interface BossProfile {
  industry: string;      // 电商 / 数据分析 / 多语言出海 / 软件开发 / 其他
  bottleneck: string;    // 内容生产 / 数据洞察 / 翻译本地化 / 代码自动化
  teamSize: string;      // solo / small / medium
}

interface OnboardingState {
  currentAct: number;
  bossProfile: BossProfile | null;
  completedFlags: {
    lighting_completed: boolean;
    discovery_completed: boolean;
    agent_xiaowang_hired: boolean;
    pipeline_xw_xc_connected: boolean;
    first_feedback_submitted: boolean;
    auto_mode_previewed: boolean;
  };
  setAct: (act: number) => void;
  setBossProfile: (profile: BossProfile) => void;
  setFlag: (flag: keyof OnboardingState['completedFlags'], value: boolean) => void;
}

interface WorkspaceState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isMarketplaceOpen: boolean;
  setMarketplaceOpen: (open: boolean) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

interface AgentState {
  agents: Agent[];
  hiredAgents: Agent[];
  hireAgent: (agent: Agent, jobSpec?: JobSpec) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentAct: 1,
  bossProfile: null,
  completedFlags: {
    lighting_completed: false,
    discovery_completed: false,
    agent_xiaowang_hired: false,
    pipeline_xw_xc_connected: false,
    first_feedback_submitted: false,
    auto_mode_previewed: false,
  },
  setAct: (act) => set({ currentAct: act }),
  setBossProfile: (profile) => set({ bossProfile: profile }),
  setFlag: (flag, value) => set((state) => ({
    completedFlags: { ...state.completedFlags, [flag]: value }
  })),
}));

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  mode: 'coach',
  setMode: (mode) => set({ mode }),
  isMarketplaceOpen: false,
  setMarketplaceOpen: (open) => set({ isMarketplaceOpen: open }),
  activeTab: 'workspace',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

export const useAgentStore = create<AgentState>((set) => ({
  agents: mockAgents,
  hiredAgents: mockAgents.filter(a => a.status === 'working' || a.status === 'blocked' || a.status === 'idle'),
  hireAgent: (agent, jobSpec) => set((state) => {
    const alreadyHired = state.hiredAgents.some((a) => a.id === agent.id);
    if (alreadyHired) return state;
    return {
      hiredAgents: [...state.hiredAgents, { ...agent, status: 'idle', jobSpec }],
    };
  }),
}));

interface MarketplaceStore {
  selectedAgentId: string | null;
  openAgentDrawer: (id: string) => void;
  closeAgentDrawer: () => void;

  compareList: string[];
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;

  compareExpanded: boolean;
  setCompareExpanded: (v: boolean) => void;

  hireModalOpen: boolean;
  hireModalAgentIds: string[];
  openHireModal: (ids: string[]) => void;
  closeHireModal: () => void;
}

export const useMarketplaceStore = create<MarketplaceStore>((set) => ({
  selectedAgentId: null,
  openAgentDrawer: (id) => set({ selectedAgentId: id }),
  closeAgentDrawer: () => set({ selectedAgentId: null }),

  compareList: [],
  addToCompare: (id) => set((state) => ({
    compareList: state.compareList.includes(id) || state.compareList.length >= 3
      ? state.compareList
      : [...state.compareList, id],
  })),
  removeFromCompare: (id) => set((state) => ({
    compareList: state.compareList.filter((x) => x !== id),
  })),
  clearCompare: () => set({ compareList: [], compareExpanded: false }),

  compareExpanded: false,
  setCompareExpanded: (v) => set({ compareExpanded: v }),

  hireModalOpen: false,
  hireModalAgentIds: [],
  openHireModal: (ids) => set({ hireModalOpen: true, hireModalAgentIds: ids }),
  closeHireModal: () => set({ hireModalOpen: false, hireModalAgentIds: [] }),
}));

interface VegaStore {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useVegaStore = create<VegaStore>((set) => ({
  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
}));

interface SimulatorStore {
  status: 'idle' | 'running' | 'done';
  report: SimReport | null;
  runSimulation: (agentId: string, params: SimParams) => void;
  resetReport: () => void;
}

export const useSimulatorStore = create<SimulatorStore>((set) => ({
  status: 'idle',
  report: null,
  runSimulation: (agentId, _params) => {
    set({ status: 'running', report: null });
    setTimeout(() => {
      const report = mockSimReports[agentId] ?? mockSimReports['agent-1'];
      set({ status: 'done', report });
    }, 2000);
  },
  resetReport: () => set({ status: 'idle', report: null }),
}));

// ── Global Archive Store ──────────────────────────────────────────────────────

export interface ArchiveTask {
  id: string;
  workspaceId?: string;
  businessSectorId?: string;
  agentId: string;
  agentName: string;
  query: string;
  report: string;
  sources: string[];
  time: string;
  chars: number;
}

interface ArchiveStore {
  tasks: ArchiveTask[];
  addTask: (task: ArchiveTask) => void;
  clearAll: () => void;
}

export const useArchiveStore = create<ArchiveStore>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({
    tasks: [task, ...state.tasks].slice(0, 20),
  })),
  clearAll: () => set({ tasks: [] }),
}));

interface WorkspaceModelState {
  businessSectors: BusinessSector[];
  workspaces: Workspace[];
  files: WorkspaceFile[];
  taskRuns: WorkspaceTaskRun[];
  memoryRefs: WorkspaceMemoryRef[];
  currentBusinessSectorId: string | null;
  currentWorkspaceId: string | null;
  setCurrentBusinessSector: (sectorId: string) => void;
  setCurrentWorkspace: (workspaceId: string) => void;
  bootstrapWorkspaceModel: (payload: {
    businessSectors: BusinessSector[];
    workspaces: Workspace[];
    files?: WorkspaceFile[];
    taskRuns?: WorkspaceTaskRun[];
    memoryRefs?: WorkspaceMemoryRef[];
    currentBusinessSectorId?: string | null;
    currentWorkspaceId?: string | null;
  }) => void;
  createBusinessSector: (input: {
    name: string;
    description?: string;
    templateCanvas: WorkspaceCanvas;
    version?: string;
  }) => { sector: BusinessSector; workspace: Workspace };
  createWorkspace: (input: {
    businessSectorId: string;
    name: string;
    description?: string;
    canvas?: WorkspaceCanvas;
    status?: Workspace['status'];
  }) => Workspace | null;
  upsertWorkspace: (workspace: Workspace) => void;
  updateWorkspaceCanvas: (workspaceId: string, canvas: WorkspaceCanvas) => void;
  addWorkspaceFile: (file: Omit<WorkspaceFile, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => WorkspaceFile;
  addWorkspaceTaskRun: (task: Omit<WorkspaceTaskRun, 'id' | 'startedAt'> & { id?: string; startedAt?: string }) => WorkspaceTaskRun;
  setWorkspaceTaskRuns: (workspaceId: string, taskRuns: WorkspaceTaskRun[]) => void;
  addWorkspaceMemoryRef: (ref: Omit<WorkspaceMemoryRef, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => WorkspaceMemoryRef;
}

const nowIso = () => new Date().toISOString();
const modelId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useWorkspaceModelStore = create<WorkspaceModelState>((set, get) => ({
  businessSectors: [],
  workspaces: [],
  files: [],
  taskRuns: [],
  memoryRefs: [],
  currentBusinessSectorId: null,
  currentWorkspaceId: null,

  setCurrentBusinessSector: (sectorId) => {
    const sector = get().businessSectors.find((item) => item.id === sectorId);
    set({
      currentBusinessSectorId: sectorId,
      currentWorkspaceId: sector?.workspaceIds[0] ?? null,
    });
  },

  setCurrentWorkspace: (workspaceId) => {
    const workspace = get().workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return;
    set({
      currentWorkspaceId: workspaceId,
      currentBusinessSectorId: workspace.businessSectorId,
    });
  },

  bootstrapWorkspaceModel: (payload) => {
    const firstSectorId = payload.currentBusinessSectorId ?? payload.businessSectors[0]?.id ?? null;
    const firstWorkspaceId = payload.currentWorkspaceId
      ?? payload.workspaces.find((item) => item.businessSectorId === firstSectorId)?.id
      ?? payload.workspaces[0]?.id
      ?? null;

    set({
      businessSectors: payload.businessSectors,
      workspaces: payload.workspaces,
      files: payload.files ?? [],
      taskRuns: payload.taskRuns ?? [],
      memoryRefs: payload.memoryRefs ?? [],
      currentBusinessSectorId: firstSectorId,
      currentWorkspaceId: firstWorkspaceId,
    });
  },

  createBusinessSector: ({ name, description = '', templateCanvas, version = 'v0.1' }) => {
    const timestamp = nowIso();
    const sectorId = modelId('sector');
    const workspaceId = modelId('workspace');
    const sector: BusinessSector = {
      id: sectorId,
      name,
      description,
      status: 'draft',
      version,
      templateCanvas,
      workspaceIds: [workspaceId],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const workspace: Workspace = {
      id: workspaceId,
      businessSectorId: sectorId,
      name: `${name} / 默认项目`,
      description: description || '默认执行空间',
      status: 'draft',
      canvas: templateCanvas,
      fileIds: [],
      taskIds: [],
      memoryIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({
      businessSectors: [...state.businessSectors, sector],
      workspaces: [...state.workspaces, workspace],
      currentBusinessSectorId: sectorId,
      currentWorkspaceId: workspaceId,
    }));
    return { sector, workspace };
  },

  createWorkspace: ({ businessSectorId, name, description = '', canvas, status = 'draft' }) => {
    const sector = get().businessSectors.find((item) => item.id === businessSectorId);
    if (!sector) return null;
    const timestamp = nowIso();
    const workspace: Workspace = {
      id: modelId('workspace'),
      businessSectorId,
      name,
      description,
      status,
      canvas: canvas ?? sector.templateCanvas,
      fileIds: [],
      taskIds: [],
      memoryIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      businessSectors: state.businessSectors.map((item) =>
        item.id === businessSectorId
          ? {
              ...item,
              workspaceIds: [...item.workspaceIds, workspace.id],
              updatedAt: timestamp,
            }
          : item,
      ),
      currentBusinessSectorId: businessSectorId,
      currentWorkspaceId: workspace.id,
    }));
    return workspace;
  },

  upsertWorkspace: (workspace) => {
    set((state) => {
      const exists = state.workspaces.some((item) => item.id === workspace.id);
      return {
        workspaces: exists
          ? state.workspaces.map((item) => (item.id === workspace.id ? workspace : item))
          : [...state.workspaces, workspace],
        businessSectors: state.businessSectors.map((item) =>
          item.id === workspace.businessSectorId
            ? {
                ...item,
                workspaceIds: item.workspaceIds.includes(workspace.id)
                  ? item.workspaceIds
                  : [...item.workspaceIds, workspace.id],
                updatedAt: workspace.updatedAt,
              }
            : item,
        ),
        currentBusinessSectorId: workspace.businessSectorId,
        currentWorkspaceId: workspace.id,
      };
    });
  },

  updateWorkspaceCanvas: (workspaceId, canvas) => {
    set((state) => ({
      workspaces: state.workspaces.map((item) =>
        item.id === workspaceId
          ? {
              ...item,
              canvas,
              updatedAt: nowIso(),
            }
          : item,
      ),
    }));
  },

  addWorkspaceFile: (file) => {
    const createdAt = file.createdAt ?? nowIso();
    const nextFile: WorkspaceFile = {
      ...file,
      id: file.id ?? modelId('file'),
      createdAt,
    };
    set((state) => ({
      files: [nextFile, ...state.files],
      workspaces: state.workspaces.map((item) =>
        item.id === nextFile.workspaceId
          ? {
              ...item,
              fileIds: [nextFile.id, ...item.fileIds],
              updatedAt: createdAt,
            }
          : item,
      ),
    }));
    return nextFile;
  },

  addWorkspaceTaskRun: (task) => {
    const startedAt = task.startedAt ?? nowIso();
    const nextTask: WorkspaceTaskRun = {
      ...task,
      id: task.id ?? modelId('task'),
      startedAt,
    };
    set((state) => ({
      taskRuns: [nextTask, ...state.taskRuns],
      workspaces: state.workspaces.map((item) =>
        item.id === nextTask.workspaceId
          ? {
              ...item,
              taskIds: [nextTask.id, ...item.taskIds],
              updatedAt: startedAt,
            }
          : item,
      ),
    }));
    return nextTask;
  },

  setWorkspaceTaskRuns: (workspaceId, taskRuns) => {
    set((state) => ({
      taskRuns: [
        ...taskRuns,
        ...state.taskRuns.filter((item) => item.workspaceId !== workspaceId),
      ],
      workspaces: state.workspaces.map((item) =>
        item.id === workspaceId
          ? {
              ...item,
              taskIds: taskRuns.map((task) => task.id),
            }
          : item,
      ),
    }));
  },

  addWorkspaceMemoryRef: (ref) => {
    const createdAt = ref.createdAt ?? nowIso();
    const nextRef: WorkspaceMemoryRef = {
      ...ref,
      id: ref.id ?? modelId('memory'),
      createdAt,
    };
    set((state) => ({
      memoryRefs: [nextRef, ...state.memoryRefs],
      workspaces: state.workspaces.map((item) =>
        item.id === nextRef.workspaceId
          ? {
              ...item,
              memoryIds: [nextRef.id, ...item.memoryIds],
              updatedAt: createdAt,
            }
          : item,
      ),
    }));
    return nextRef;
  },
}));
