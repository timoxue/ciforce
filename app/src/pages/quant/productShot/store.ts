/**
 * Product-Shot Studio store — runs, logs, and versioned workitems.
 *
 * One `Run` = one click of "run" on the agent node.
 * Each Run produces a `Workitem` version (image artifact).
 * The active version is what the workitem node thumbnails.
 */
import { create } from 'zustand';

export type RunStatus = 'idle' | 'running' | 'done' | 'error';

export interface RunParams {
  productImageUrl: string | null;   // dataURL or remote URL
  prompt: string;
  scene: SceneId;
  ratio: RatioId;
  variants: number;                  // how many images per run
}

export type SceneId = 'studio' | 'lifestyle' | 'nature' | 'minimal' | 'festive';
export type RatioId = '1:1' | '4:5' | '16:9' | '9:16';

export interface WorkitemVersion {
  id: string;
  runId: string;
  createdAt: number;
  prompt: string;                    // snapshot of prompt at this version
  scene: SceneId;
  ratio: RatioId;
  images: string[];                  // image URLs (mock placeholders)
  liked: boolean;
}

export interface Run {
  id: string;
  startedAt: number;
  finishedAt?: number;
  status: RunStatus;
  params: RunParams;
  versionId?: string;                // produced version (if done)
}

export interface LogEntry {
  ts: number;
  level: 'info' | 'work' | 'ok' | 'warn';
  text: string;
}

export const SCENE_LABEL: Record<SceneId, string> = {
  studio:    '纯色专业棚',
  lifestyle: '生活方式场景',
  nature:    '自然光户外',
  minimal:   '极简留白',
  festive:   '节日氛围',
};

export const RATIO_LABEL: Record<RatioId, string> = {
  '1:1':  '正方形 · 通用',
  '4:5':  '竖版 · 详情页',
  '16:9': '横版 · Banner',
  '9:16': '竖版 · 短视频',
};

interface StoreState {
  runs: Run[];
  logs: LogEntry[];
  versions: WorkitemVersion[];

  activeVersionId: string | null;     // shown by workitem node
  isDrawerOpen: boolean;
  isViewerOpen: boolean;

  /**
   * Bumped each time AgentNode is clicked. Host (quant canvas) watches this
   * counter to know when to open + flip the VEGA panel.
   */
  agentClickSignal: number;

  draftParams: RunParams;

  // ── actions ─────────────────────────────────────────────────────────────
  openDrawer(): void;
  closeDrawer(): void;
  requestAgent(): void;       // AgentNode click → bump signal
  openViewer(versionId?: string): void;
  closeViewer(): void;

  setDraft(patch: Partial<RunParams>): void;
  startRun(): string;                 // returns runId
  pushLog(entry: Omit<LogEntry, 'ts'>): void;
  finishRun(runId: string, images: string[]): string; // returns versionId

  selectVersion(id: string): void;
  toggleLike(id: string): void;

  // for re-runs from a previous version (workitem viewer "edit prompt")
  prepareRerunFromVersion(versionId: string, promptOverride?: string): void;
}

const DEFAULT_PARAMS: RunParams = {
  productImageUrl: null,
  prompt: '将商品摆放在柔光摄影棚的米色背景上，自然阴影，杂志级质感',
  scene: 'studio',
  ratio: '1:1',
  variants: 3,
};

export const useProductShotStore = create<StoreState>((set, get) => ({
  runs: [],
  logs: [],
  versions: [],
  activeVersionId: null,
  isDrawerOpen: false,
  isViewerOpen: false,
  agentClickSignal: 0,
  draftParams: { ...DEFAULT_PARAMS },

  openDrawer:  () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  requestAgent: () => set(s => ({ agentClickSignal: s.agentClickSignal + 1 })),
  openViewer:  (versionId) => set(s => ({
    isViewerOpen: true,
    activeVersionId: versionId ?? s.activeVersionId,
  })),
  closeViewer: () => set({ isViewerOpen: false }),

  setDraft: (patch) => set(s => ({ draftParams: { ...s.draftParams, ...patch } })),

  startRun: () => {
    const id = `run-${Date.now().toString(36)}`;
    const run: Run = {
      id,
      startedAt: Date.now(),
      status: 'running',
      params: { ...get().draftParams },
    };
    set(s => ({ runs: [...s.runs, run] }));
    return id;
  },

  pushLog: (entry) => set(s => ({
    logs: [...s.logs, { ts: Date.now(), ...entry }],
  })),

  finishRun: (runId, images) => {
    const run = get().runs.find(r => r.id === runId);
    if (!run) return '';
    const versionId = `ver-${runId}`;
    const version: WorkitemVersion = {
      id: versionId,
      runId,
      createdAt: Date.now(),
      prompt: run.params.prompt,
      scene: run.params.scene,
      ratio: run.params.ratio,
      images,
      liked: false,
    };
    set(s => ({
      runs: s.runs.map(r => r.id === runId
        ? { ...r, status: 'done', finishedAt: Date.now(), versionId }
        : r),
      versions: [...s.versions, version],
      activeVersionId: versionId,
    }));
    return versionId;
  },

  selectVersion: (id) => set({ activeVersionId: id }),
  toggleLike: (id) => set(s => ({
    versions: s.versions.map(v => v.id === id ? { ...v, liked: !v.liked } : v),
  })),

  prepareRerunFromVersion: (versionId, promptOverride) => {
    const v = get().versions.find(x => x.id === versionId);
    if (!v) return;
    set(s => ({
      draftParams: {
        ...s.draftParams,
        prompt: promptOverride ?? v.prompt,
        scene: v.scene,
        ratio: v.ratio,
      },
      isViewerOpen: false,
      isDrawerOpen: true,
    }));
  },
}));
