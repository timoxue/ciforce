# HireModal JobSpec 升级 + 职场模拟器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 升级入职弹窗为 3 步 JobSpec 流程，新建职场模拟器页面，两者通过 agentStore 联动。

**Architecture:** 纯前端 mock 实现，不涉及真实 API 调用。JobSpec 存储在 Zustand agentStore 的 hiredAgents 中；Simulator 页面从 agentStore 读取 JobSpec 预填参数，用 setTimeout 模拟异步测试，结果使用 fixtures 中的静态 mock 数据。Provider Console 的"进入模拟器"按钮通过 `useNavigate` 跳转到新路由。

**Tech Stack:** React 19, TypeScript, Zustand 5, motion/react, lucide-react, react-router-dom v7, Tailwind CSS v4（`@theme` 变量）

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `reference/src/types/index.ts` | 修改 | 新增 JobSpec / SimReport / SimScenario / SimParams 类型；Agent 加 jobSpec 字段 |
| `reference/src/mocks/fixtures.ts` | 修改 | 新增 mockSimReports（每个 agent 一份） |
| `reference/src/store/useAppStore.ts` | 修改 | hireAgent 支持 jobSpec；新增 useSimulatorStore |
| `reference/src/pages/marketplace/HireModal.tsx` | 修改 | 升级为 3 步流程，Step2 为 JobSpec 表单 |
| `reference/src/pages/provider/Simulator.tsx` | 新建 | 职场模拟器完整页面 |
| `reference/src/App.tsx` | 修改 | 注册 /provider/simulator/:agentId? 路由 |
| `reference/src/pages/provider/Console.tsx` | 修改 | "进入模拟器"按钮用 navigate 跳转 |

---

## Task 1: 扩展类型定义

**Files:**
- Modify: `reference/src/types/index.ts`

- [ ] **Step 1: 在 types/index.ts 末尾追加新类型，并在 Agent 接口加 jobSpec 字段**

打开 `reference/src/types/index.ts`，做两处修改：

**修改一：** 在 `Agent` 接口的 `provider?` 字段后面加一行：

```typescript
  jobSpec?: JobSpec;
```

完整 Agent 接口末尾变为：
```typescript
  partnerIds?: string[];
  provider?: AgentProvider;
  jobSpec?: JobSpec;
}
```

**修改二：** 在文件末尾 `AppMode` 之后追加：

```typescript
export interface JobSpec {
  channels: string[];        // e.g. ['小红书', '抖音']
  contentTags: string[];     // e.g. ['爆款标题', '带 Emoji']
  scenario: string;          // 业务场景自由文本
  qualityThreshold: number;  // 合格率基准 60-99
}

export interface SimScenario {
  name: string;
  count: number;
  passRate: number;
  avgLatencyMs: number;
  status: 'pass' | 'warn' | 'fail';
}

export interface SimReport {
  agentId: string;
  timestamp: string;
  overallPassRate: number;
  avgLatencyMs: number;
  failRate: number;
  totalTests: number;
  scenarios: SimScenario[];
  suggestions: string[];
  passed: boolean;
}

export interface SimParams {
  channel: string;
  scenarioTags: string[];
  concurrency: 10 | 50 | 200;
  qualityThreshold: number;
}
```

- [ ] **Step 2: 类型检查**

```bash
cd reference && npm run lint
```

期望输出：无 error（只要没有 error 即可，warning 忽略）

- [ ] **Step 3: 提交**

```bash
cd reference && git add src/types/index.ts && git commit -m "feat: add JobSpec, SimReport, SimParams types"
```

---

## Task 2: 新增 Mock 数据

**Files:**
- Modify: `reference/src/mocks/fixtures.ts`

- [ ] **Step 1: 在 fixtures.ts 末尾 handshakeMatrix 之后追加 mockSimReports**

```typescript
export const mockSimReports: Record<string, SimReport> = {
  'agent-1': {
    agentId: 'agent-1',
    timestamp: '2026-05-09 14:32',
    overallPassRate: 96.2,
    avgLatencyMs: 44,
    failRate: 3.8,
    totalTests: 50,
    scenarios: [
      { name: '小红书 · 电商促销 · 防晒霜', count: 20, passRate: 98.5, avgLatencyMs: 38, status: 'pass' },
      { name: '抖音 · 品牌种草 · 护肤品', count: 20, passRate: 95.0, avgLatencyMs: 42, status: 'pass' },
      { name: '全渠道 · 电商促销 · 服装配饰', count: 10, passRate: 82.0, avgLatencyMs: 68, status: 'warn' },
    ],
    suggestions: [
      '服装/配饰类目缺乏专业词库，建议在知识矩阵中补充时尚行业 Prompt 模版',
      '全渠道模式下延迟偏高（68ms），建议拆分为单渠道调用以提升响应速度',
      '输出稳定性达标（CV < 5%），可申请进入"人才市场精选"计划',
    ],
    passed: true,
  },
  'agent-2': {
    agentId: 'agent-2',
    timestamp: '2026-05-09 11:14',
    overallPassRate: 88.4,
    avgLatencyMs: 195,
    failRate: 11.6,
    totalTests: 50,
    scenarios: [
      { name: '抖音 · 电商促销 · 快消品', count: 20, passRate: 92.0, avgLatencyMs: 180, status: 'pass' },
      { name: '视频号 · 品牌种草 · 科技产品', count: 20, passRate: 85.0, avgLatencyMs: 200, status: 'warn' },
      { name: '全渠道 · 节日营销', count: 10, passRate: 78.0, avgLatencyMs: 220, status: 'warn' },
    ],
    suggestions: [
      '视频号渠道适配需加强，建议补充竖屏格式专属输出规则',
      '节日营销场景通过率偏低，增加节日关键词词典可提升 8-12%',
    ],
    passed: false,
  },
  'agent-3': {
    agentId: 'agent-3',
    timestamp: '2026-05-09 09:05',
    overallPassRate: 99.1,
    avgLatencyMs: 16,
    failRate: 0.9,
    totalTests: 50,
    scenarios: [
      { name: '全渠道 · 多语言 · 电商文案', count: 25, passRate: 99.5, avgLatencyMs: 15, status: 'pass' },
      { name: '全渠道 · 多语言 · 品牌介绍', count: 25, passRate: 98.8, avgLatencyMs: 17, status: 'pass' },
    ],
    suggestions: [
      '各项指标优秀，建议申请"官方认证"徽章以提升市场曝光',
    ],
    passed: true,
  },
};
```

在文件顶部 import 处补充类型导入（fixtures.ts 当前没有从 types 导入，需要添加）：

在 `fixtures.ts` 第一行之前加：
```typescript
import type { SimReport } from '../types';
```

- [ ] **Step 2: 类型检查**

```bash
cd reference && npm run lint
```

期望：无 error

- [ ] **Step 3: 提交**

```bash
cd reference && git add src/mocks/fixtures.ts && git commit -m "feat: add mockSimReports data"
```

---

## Task 3: 扩展 Store

**Files:**
- Modify: `reference/src/store/useAppStore.ts`

- [ ] **Step 1: 在文件顶部补充导入**

当前第一行是 `import { create } from 'zustand';`，在其下面添加：

```typescript
import type { JobSpec, SimParams, SimReport } from '../types';
import { mockSimReports } from '../mocks/fixtures';
```

- [ ] **Step 2: 修改 AgentState 接口，hireAgent 加第二参数**

将：
```typescript
interface AgentState {
  agents: Agent[];
  hiredAgents: Agent[];
  hireAgent: (agent: Agent) => void;
}
```

改为：
```typescript
interface AgentState {
  agents: Agent[];
  hiredAgents: Agent[];
  hireAgent: (agent: Agent, jobSpec?: JobSpec) => void;
}
```

- [ ] **Step 3: 修改 useAgentStore 的 hireAgent 实现**

将：
```typescript
  hireAgent: (agent) => set((state) => ({
    hiredAgents: [...state.hiredAgents, { ...agent, status: 'idle' }]
  })),
```

改为：
```typescript
  hireAgent: (agent, jobSpec) => set((state) => {
    const alreadyHired = state.hiredAgents.some((a) => a.id === agent.id);
    if (alreadyHired) return state;
    return {
      hiredAgents: [...state.hiredAgents, { ...agent, status: 'idle', jobSpec }],
    };
  }),
```

- [ ] **Step 4: 在文件末尾添加 useSimulatorStore**

在 `useMarketplaceStore` 导出之后追加：

```typescript
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
```

- [ ] **Step 5: 类型检查**

```bash
cd reference && npm run lint
```

期望：无 error

- [ ] **Step 6: 提交**

```bash
cd reference && git add src/store/useAppStore.ts && git commit -m "feat: extend agentStore with jobSpec, add useSimulatorStore"
```

---

## Task 4: HireModal 升级为 3 步流程

**Files:**
- Modify: `reference/src/pages/marketplace/HireModal.tsx`

这是改动最大的 task，完整替换文件内容。

- [ ] **Step 1: 完整替换 HireModal.tsx**

```typescript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, AlertTriangle, Info, Heart,
  ChevronRight, ChevronLeft,
} from 'lucide-react';
import { useMarketplaceStore, useAgentStore } from '../../store/useAppStore';
import { marketplaceAgents, handshakeMatrix } from '../../mocks/fixtures';
import type { JobSpec } from '../../types';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

const CHANNELS = ['小红书', '抖音', '微博', '视频号', '私域', '全渠道'];
const CONTENT_TAGS = ['爆款标题', '带 Emoji', '含 Hashtag', '口语化', '专业风格', '500字内'];

const defaultJobSpec = (): Partial<JobSpec> => ({
  channels: [],
  contentTags: [],
  scenario: '',
  qualityThreshold: 85,
});

export default function HireModal() {
  const navigate = useNavigate();
  const { hireModalOpen, hireModalAgentIds, closeHireModal, clearCompare } = useMarketplaceStore();
  const { hireAgent } = useAgentStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [jobSpec, setJobSpec] = useState<Partial<JobSpec>>(defaultJobSpec());
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const agents = hireModalAgentIds
    .map((id) => marketplaceAgents.find((a) => a.id === id))
    .filter(Boolean) as typeof marketplaceAgents;

  const isTeam = agents.length >= 2;

  const pairs = agents.slice(0, -1).map((a, i) => ({
    from: a,
    to: agents[i + 1],
    status: handshakeMatrix[a.id]?.[agents[i + 1].id] ?? 'warn',
  }));

  const handleClose = () => {
    closeHireModal();
    setStep(1);
    setJobSpec(defaultJobSpec());
  };

  const handleConfirm = () => {
    agents.forEach((a) => hireAgent(a, jobSpec as JobSpec));

    const newHearts = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 30,
    }));
    setHearts(newHearts);
    setStep(3);

    setTimeout(() => setHearts([]), 1800);
  };

  const toggleChannel = (ch: string) => {
    setJobSpec((prev) => {
      const list = prev.channels ?? [];
      return {
        ...prev,
        channels: list.includes(ch) ? list.filter((x) => x !== ch) : [...list, ch],
      };
    });
  };

  const toggleTag = (tag: string) => {
    setJobSpec((prev) => {
      const list = prev.contentTags ?? [];
      return {
        ...prev,
        contentTags: list.includes(tag) ? list.filter((x) => x !== tag) : [...list, tag],
      };
    });
  };

  const stepLabels = ['协议', '配置', '确认'];

  return (
    <AnimatePresence>
      {hireModalOpen && (
        <>
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={step !== 3 ? handleClose : undefined}
          />

          <motion.div
            key="modal"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md mx-4 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
              {/* Confetti Hearts */}
              {hearts.map((h) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -80, scale: 1.4 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute pointer-events-none text-pink-400 text-2xl z-10"
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                >
                  ❤️
                </motion.div>
              ))}

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">
                  {step === 3 ? '入职成功' : isTeam ? '确认组队入职' : '确认入职'}
                </h3>
                {step !== 3 && (
                  <button onClick={handleClose} className="p-1.5 text-slate-600 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Steps Bar */}
              <div className="flex items-center px-6 py-3 border-b border-white/5 gap-1">
                {stepLabels.map((label, i) => {
                  const num = i + 1;
                  const isDone = step > num;
                  const isActive = step === num;
                  return (
                    <React.Fragment key={label}>
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold',
                          isDone && 'bg-status-success text-slate-950',
                          isActive && 'bg-accent-marketplace text-white',
                          !isDone && !isActive && 'bg-white/5 text-slate-500 border border-white/10',
                        )}>
                          {isDone ? <Check size={10} /> : num}
                        </div>
                        <span className={cn(
                          'text-[9px] font-bold uppercase tracking-widest',
                          isDone && 'text-status-success',
                          isActive && 'text-white',
                          !isDone && !isActive && 'text-slate-600',
                        )}>
                          {label}
                        </span>
                      </div>
                      {i < 2 && <div className="flex-1 h-px bg-white/5 mx-1 max-w-[24px]" />}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Step Content */}
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                    <div className="px-6 py-5 space-y-4">
                      <div className={cn('flex gap-3', isTeam ? 'justify-center' : '')}>
                        {agents.map((a) => (
                          <div key={a.id} className={cn('flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl', isTeam ? 'flex-col text-center w-28' : 'flex-1')}>
                            <img src={a.avatar} className={cn('bg-slate-900 rounded-xl border border-white/10', isTeam ? 'w-14 h-14' : 'w-12 h-12')} alt={a.name} />
                            <div>
                              <p className="text-sm font-bold text-white">{a.name}</p>
                              <p className="text-[10px] text-slate-500">{a.role}</p>
                              <p className="text-[10px] text-accent-marketplace font-mono mt-0.5">{a.metrics.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {!isTeam && (
                        <div className="flex items-start gap-2.5 p-3 bg-brand-start/5 border border-brand-start/15 rounded-xl">
                          <Info size={14} className="text-brand-start shrink-0 mt-0.5" />
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            该 Agent 可<span className="text-white font-medium">独立运行</span>，无需与其他 Agent 握手对齐。入职后可在工作台手动区直接下任务，或后续加入 Pipeline 自动运行。
                          </p>
                        </div>
                      )}

                      {isTeam && pairs.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">语义握手预检</p>
                          <div className="space-y-2">
                            {pairs.map((p, i) => (
                              <div key={i} className={cn(
                                'flex items-center justify-between px-3 py-2 rounded-xl border text-[11px]',
                                p.status === 'ok' ? 'bg-status-success/5 border-status-success/20' : 'bg-status-warning/5 border-status-warning/20',
                              )}>
                                <span className="text-slate-300 font-medium">{p.from.name} → {p.to.name}</span>
                                {p.status === 'ok' ? (
                                  <span className="flex items-center gap-1 text-status-success font-bold"><Check size={11} />协议兼容，自动连线</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-status-warning font-bold"><AlertTriangle size={11} />需手动配置</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isTeam && (
                        <div className="flex items-start gap-2.5 p-3 bg-accent-auto/5 border border-accent-auto/15 rounded-xl">
                          <Info size={14} className="text-accent-auto shrink-0 mt-0.5" />
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            入职后将在工作台<span className="text-white font-medium">自动连线</span>为 Pipeline，兼容的 Agent 对之间立即可运行。
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="px-6 pb-5 flex gap-3">
                      <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold hover:bg-white/10 hover:text-white transition-all">
                        取消
                      </button>
                      <button
                        onClick={() => setStep(2)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent-marketplace/20 flex items-center justify-center gap-1.5"
                      >
                        下一步 <ChevronRight size={13} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                    <div className="px-6 py-5 space-y-4">
                      {/* 渠道 */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">目标渠道</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {CHANNELS.map((ch) => {
                            const sel = (jobSpec.channels ?? []).includes(ch);
                            return (
                              <button
                                key={ch}
                                onClick={() => toggleChannel(ch)}
                                className={cn(
                                  'py-2 rounded-lg border text-[10px] font-bold transition-all',
                                  sel
                                    ? 'bg-accent-marketplace/15 border-accent-marketplace/40 text-accent-marketplace'
                                    : 'bg-white/[0.02] border-white/8 text-slate-500 hover:border-white/20 hover:text-slate-300',
                                )}
                              >
                                {ch}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 内容要求 */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">内容要求</p>
                        <div className="flex flex-wrap gap-1.5">
                          {CONTENT_TAGS.map((tag) => {
                            const sel = (jobSpec.contentTags ?? []).includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={cn(
                                  'px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
                                  sel
                                    ? 'bg-accent-marketplace/15 border-accent-marketplace/40 text-accent-marketplace'
                                    : 'bg-white/[0.02] border-white/8 text-slate-500 hover:border-white/20',
                                )}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 业务场景 */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">业务场景</p>
                        <textarea
                          value={jobSpec.scenario ?? ''}
                          onChange={(e) => setJobSpec((p) => ({ ...p, scenario: e.target.value }))}
                          placeholder="描述业务场景，如：618大促防晒霜推广，目标 18-25 岁女性..."
                          rows={2}
                          className="w-full bg-white/[0.02] border border-white/8 rounded-xl px-3 py-2.5 text-[11px] text-slate-300 placeholder:text-slate-700 outline-none focus:border-accent-marketplace/40 transition-all resize-none leading-relaxed"
                        />
                      </div>

                      {/* 合格率基准 */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">合格率基准</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={60}
                            max={99}
                            value={jobSpec.qualityThreshold ?? 85}
                            onChange={(e) => setJobSpec((p) => ({ ...p, qualityThreshold: Number(e.target.value) }))}
                            className="w-16 h-8 text-center bg-white/[0.02] border border-white/8 rounded-lg text-sm font-bold font-mono text-status-success outline-none focus:border-status-success/40 transition-all"
                          />
                          <span className="text-[10px] text-slate-500">% 以上视为合格输出</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 pb-5 flex gap-3">
                      <button
                        onClick={() => setStep(1)}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-1"
                      >
                        <ChevronLeft size={13} /> 返回
                      </button>
                      <button
                        onClick={handleConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent-marketplace/20 flex items-center justify-center gap-1.5"
                      >
                        <Heart size={13} /> 确认入职
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                    <div className="px-6 py-8 text-center">
                      <div className="text-4xl mb-4">🎉</div>
                      <h4 className="text-base font-bold text-white mb-2">
                        {agents.map((a) => a.name).join(' & ')} 已入职！
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
                        {(jobSpec.channels ?? []).length > 0 && (
                          <>渠道：{(jobSpec.channels ?? []).join(' / ')} · </>
                        )}
                        {(jobSpec.qualityThreshold ?? 85) && `基准：≥${jobSpec.qualityThreshold}%`}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            handleClose();
                            navigate('/dashboard');
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-accent-marketplace/10 border border-accent-marketplace/20 text-accent-marketplace text-[11px] font-bold hover:bg-accent-marketplace/20 transition-all"
                        >
                          前往工作台
                        </button>
                        <button
                          onClick={() => {
                            clearCompare();
                            setStep(1);
                            setJobSpec(defaultJobSpec());
                            closeHireModal();
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success text-[11px] font-bold hover:bg-status-success/20 transition-all"
                        >
                          继续招募
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
cd reference && npm run lint
```

期望：无 error

- [ ] **Step 3: 提交**

```bash
cd reference && git add src/pages/marketplace/HireModal.tsx && git commit -m "feat: upgrade HireModal to 3-step flow with JobSpec config"
```

---

## Task 5: 新建职场模拟器页面

**Files:**
- Create: `reference/src/pages/provider/Simulator.tsx`

- [ ] **Step 1: 创建 Simulator.tsx**

```typescript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cpu, Play, ChevronLeft, Download, History,
  ArrowUpRight, CheckCircle2, AlertCircle, XCircle,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { marketplaceAgents } from '../../mocks/fixtures';
import { useSimulatorStore, useAgentStore } from '../../store/useAppStore';
import type { SimParams } from '../../types';
import { cn } from '../../lib/utils';

const CHANNELS = ['小红书', '抖音', '全渠道（3平台）'];
const SCENARIO_TAGS = ['电商促销', '品牌种草', '节日营销', '日常运营'];
const CONCURRENCY_OPTIONS = [10, 50, 200] as const;

export default function ProviderSimulator() {
  const { agentId } = useParams<{ agentId?: string }>();
  const navigate = useNavigate();
  const { status, report, runSimulation, resetReport } = useSimulatorStore();
  const { hiredAgents } = useAgentStore();

  const agent = agentId
    ? marketplaceAgents.find((a) => a.id === agentId)
    : marketplaceAgents[0];

  const jobSpec = hiredAgents.find((a) => a.id === agent?.id)?.jobSpec;

  const [params, setParams] = useState<SimParams>({
    channel: '小红书',
    scenarioTags: ['电商促销'],
    concurrency: 50,
    qualityThreshold: jobSpec?.qualityThreshold ?? 85,
  });

  const toggleScenario = (tag: string) => {
    setParams((p) => ({
      ...p,
      scenarioTags: p.scenarioTags.includes(tag)
        ? p.scenarioTags.filter((x) => x !== tag)
        : [...p.scenarioTags, tag],
    }));
  };

  const handleRun = () => {
    if (!agent) return;
    resetReport();
    runSimulation(agent.id, params);
  };

  const passed = report ? report.overallPassRate >= params.qualityThreshold : false;

  return (
    <div className="min-h-screen bg-bg-dark text-slate-300 font-sans">
      {/* Nav */}
      <nav className="h-14 border-b border-white/5 bg-slate-950/20 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate('/provider')}
          >
            <div className="w-8 h-8 bg-linear-to-br from-emerald-500 to-teal-500 rounded flex items-center justify-center font-bold text-xs text-white">CI</div>
            <h1 className="font-bold tracking-tight text-white text-lg">PROVIDER <span className="text-emerald-500">CONSOLE</span></h1>
          </div>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            <Cpu size={13} />
            职场模拟器
          </div>
        </div>

        <button
          onClick={() => navigate('/provider')}
          className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-white transition-colors"
        >
          <ChevronLeft size={14} />
          返回控制台
        </button>
      </nav>

      {/* Layout */}
      <div className="flex min-h-[calc(100vh-56px)]">
        {/* Sidebar */}
        <aside className="w-[360px] shrink-0 border-r border-white/5 bg-slate-950/20 p-6 flex flex-col gap-5">
          {/* Agent Info */}
          <div>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3">测试对象</p>
            {agent ? (
              <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <img src={agent.avatar} className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 shrink-0" alt={agent.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{agent.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{agent.role} · {agent.provider?.name}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] shrink-0" />
              </div>
            ) : (
              <div className="p-3 bg-white/[0.02] border border-white/8 rounded-xl text-[11px] text-slate-500 text-center">
                请先在 Agent 管理中选择测试目标
              </div>
            )}
          </div>

          <div className="h-px bg-white/5" />

          {/* Params */}
          <div>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3">模拟参数</p>

            {/* Channel */}
            <div className="mb-4">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">目标渠道</p>
              <select
                value={params.channel}
                onChange={(e) => setParams((p) => ({ ...p, channel: e.target.value }))}
                className="w-full bg-white/[0.02] border border-white/8 rounded-xl px-3 py-2.5 text-[11px] text-slate-300 outline-none focus:border-emerald-500/40 transition-all appearance-none cursor-pointer"
              >
                {CHANNELS.map((ch) => <option key={ch}>{ch}</option>)}
              </select>
            </div>

            {/* Scenario Tags */}
            <div className="mb-4">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">测试场景</p>
              <div className="flex flex-wrap gap-1.5">
                {SCENARIO_TAGS.map((tag) => {
                  const sel = params.scenarioTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleScenario(tag)}
                      className={cn(
                        'px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
                        sel
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-white/[0.02] border-white/8 text-slate-500 hover:border-white/20',
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Concurrency */}
            <div className="mb-4">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">并发测试数</p>
              <div className="flex gap-2">
                {CONCURRENCY_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setParams((p) => ({ ...p, concurrency: n }))}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-[11px] font-bold transition-all',
                      params.concurrency === n
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-white/[0.02] border-white/8 text-slate-500 hover:border-white/20',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold */}
            <div className="mb-5">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">
                合格率基准
                {jobSpec && <span className="ml-1.5 text-emerald-500/60 normal-case font-normal">(来自 JobSpec)</span>}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={60}
                  max={99}
                  value={params.qualityThreshold}
                  onChange={(e) => setParams((p) => ({ ...p, qualityThreshold: Number(e.target.value) }))}
                  className="w-16 h-8 text-center bg-white/[0.02] border border-emerald-500/30 rounded-lg text-sm font-bold font-mono text-emerald-400 outline-none focus:border-emerald-500/60 transition-all"
                />
                <span className="text-[10px] text-slate-500">% 视为合格</span>
              </div>
            </div>

            <button
              onClick={handleRun}
              disabled={status === 'running' || !agent}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={15} fill="currentColor" />
              {status === 'running' ? '测试中...' : '运行模拟测试'}
            </button>
          </div>

          {/* Disclaimer */}
          <div className="mt-auto p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[9px] text-slate-600 text-center leading-relaxed">
            测试数据来源于用户真实 JobSpec 场景池<br />保护隐私 · 完全匿名化处理
          </div>
        </aside>

        {/* Main: Report */}
        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[400px] gap-4"
              >
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-500/20 flex items-center justify-center">
                  <Cpu size={24} className="text-emerald-900" />
                </div>
                <p className="text-[11px] text-slate-600 text-center leading-relaxed max-w-[240px]">
                  配置测试参数后点击运行<br />获取 Agent 绩效预估报告
                </p>
              </motion.div>
            )}

            {status === 'running' && (
              <motion.div
                key="running"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[400px] gap-6"
              >
                <div className="relative w-16 h-16">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500"
                  />
                  <div className="absolute inset-2 rounded-full border border-white/5" />
                  <Cpu size={20} className="absolute inset-0 m-auto text-emerald-500/60" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white mb-1">模拟测试进行中</p>
                  <p className="text-[11px] text-slate-500">正在向 Agent 发送 {params.concurrency} 组测试任务...</p>
                </div>
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: 'linear' }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </motion.div>
            )}

            {status === 'done' && report && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">模拟报告</p>
                    <p className="text-xs text-slate-500 font-mono">{report.timestamp}</p>
                  </div>
                  <ReportBadge passed={passed} threshold={params.qualityThreshold} />
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  <KpiCard label="综合通过率" value={`${report.overallPassRate}%`} color={report.overallPassRate >= params.qualityThreshold ? 'green' : 'yellow'} />
                  <KpiCard label="平均延迟" value={`${report.avgLatencyMs}ms`} color="blue" />
                  <KpiCard label="失败率" value={`${report.failRate}%`} color={report.failRate > 10 ? 'red' : 'yellow'} />
                  <KpiCard label="完成测试" value={`${report.totalTests}/${report.totalTests}`} color="slate" />
                </div>

                {/* Scenario Breakdown */}
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3">场景分项结果</p>
                <div className="space-y-2 mb-5">
                  {report.scenarios.map((sc, i) => (
                    <ScenarioRow key={i} scenario={sc} />
                  ))}
                </div>

                {/* Suggestions */}
                <div className="bg-emerald-500/[0.03] border border-emerald-500/15 rounded-xl p-4 mb-5">
                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-3">🔧 优化建议</p>
                  <div className="space-y-2">
                    {report.suggestions.map((s, i) => (
                      <div key={i} className="flex gap-2 text-[11px] text-slate-500 leading-relaxed">
                        <span className="text-emerald-500 shrink-0 mt-0.5">→</span>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 text-slate-500 text-[10px] font-bold hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest">
                    <Download size={13} /> 下载报告
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 text-slate-500 text-[10px] font-bold hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest">
                    <History size={13} /> 历史记录
                  </button>
                  <button
                    className={cn(
                      'flex-2 flex-[2] py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest',
                      passed
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95'
                        : 'bg-white/[0.03] border border-white/8 text-slate-600 cursor-not-allowed opacity-60',
                    )}
                  >
                    <ArrowUpRight size={13} />
                    {passed ? '通过校验 → 立即上架' : `未达基准（需≥${params.qualityThreshold}%）`}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: 'green' | 'yellow' | 'red' | 'blue' | 'slate' }) {
  const colorMap = {
    green: 'text-status-success',
    yellow: 'text-status-warning',
    red: 'text-status-error',
    blue: 'text-accent-blue',
    slate: 'text-slate-300',
  };
  return (
    <div className="glass-panel p-4 text-center border-white/5">
      <p className={cn('text-xl font-bold font-mono', colorMap[color])}>{value}</p>
      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function ScenarioRow({ scenario }: { scenario: { name: string; count: number; passRate: number; avgLatencyMs: number; status: 'pass' | 'warn' | 'fail' } }) {
  const icon = {
    pass: <CheckCircle2 size={13} className="text-status-success shrink-0" />,
    warn: <AlertCircle size={13} className="text-status-warning shrink-0" />,
    fail: <XCircle size={13} className="text-status-error shrink-0" />,
  }[scenario.status];

  const scoreColor = {
    pass: 'text-status-success',
    warn: 'text-status-warning',
    fail: 'text-status-error',
  }[scenario.status];

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white/[0.01] border border-white/5 rounded-xl">
      {icon}
      <span className="text-[11px] text-slate-400 flex-1 font-medium">{scenario.name}</span>
      <span className="text-[10px] text-slate-600 font-mono shrink-0">×{scenario.count}</span>
      <span className={cn('text-[11px] font-bold font-mono shrink-0 w-14 text-right', scoreColor)}>
        {scenario.passRate}%
      </span>
      <span className="text-[10px] text-slate-600 font-mono shrink-0 w-16 text-right">
        {scenario.avgLatencyMs}ms
      </span>
    </div>
  );
}

function ReportBadge({ passed, threshold }: { passed: boolean; threshold: number }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold',
      passed
        ? 'bg-status-success/10 border-status-success/20 text-status-success'
        : 'bg-status-warning/10 border-status-warning/20 text-status-warning',
    )}>
      {passed ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
      {passed ? `通过（≥${threshold}%）` : `未达基准（≥${threshold}%）`}
    </div>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
cd reference && npm run lint
```

期望：无 error

- [ ] **Step 3: 提交**

```bash
cd reference && git add src/pages/provider/Simulator.tsx && git commit -m "feat: add ProviderSimulator page"
```

---

## Task 6: 注册路由并连接 Provider Console 按钮

**Files:**
- Modify: `reference/src/App.tsx`
- Modify: `reference/src/pages/provider/Console.tsx`

- [ ] **Step 1: 修改 App.tsx 注册路由**

在 App.tsx 顶部 import 区加：
```typescript
import ProviderSimulator from './pages/provider/Simulator';
```

在 Routes 中 `/provider` 之后加一行：
```tsx
<Route path="/provider/simulator/:agentId?" element={<ProviderSimulator />} />
```

完整 Routes 变为：
```tsx
<Routes>
  {/* Onboarding Routes */}
  <Route path="/onboarding" element={<OnboardingLayout />}>
    <Route index element={<Navigate to="act-1" replace />} />
    <Route path="act-1" element={<Act1 />} />
    <Route path="act-2" element={<Act2 />} />
    <Route path="act-3" element={<Act3 />} />
    <Route path="act-4" element={<Act4 />} />
  </Route>

  {/* Main App Routes */}
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/marketplace" element={<Marketplace />} />
  <Route path="/provider" element={<ProviderConsole />} />
  <Route path="/provider/simulator/:agentId?" element={<ProviderSimulator />} />

  {/* Fallback */}
  <Route path="/" element={<Navigate to="/onboarding" replace />} />
</Routes>
```

- [ ] **Step 2: 修改 Console.tsx 的"进入模拟器"按钮**

在 Console.tsx 顶部找到已有的 `useNavigate` import（第 19 行）—— 它已经导入了，不需要重复。

找到"进入模拟器"按钮（第 96-99 行）：
```tsx
<button className="w-full py-4 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-emerald-500/10">
  <Play size={18} fill="currentColor" />
  <span>进入模拟器</span>
</button>
```

替换为（加 onClick）：
```tsx
<button
  onClick={() => navigate('/provider/simulator')}
  className="w-full py-4 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-emerald-500/10"
>
  <Play size={18} fill="currentColor" />
  <span>进入模拟器</span>
</button>
```

同理，修改 Console.tsx 中 AgentStatusItem 组件，让 agent row 右侧的测试入口跳转到带 agentId 的路由。找到 `AgentStatusItem` 函数（第 153 行），在最外层 div 加 `cursor-pointer` 和 `onClick`：

找到 `AgentStatusItem` 调用处（第 82-84 行）：
```tsx
<AgentStatusItem name="小王" status="在线 / 稳定" downloads="1.2k" income="￥12,400" />
<AgentStatusItem name="代码禅师" status="在线 / 稳定" downloads="842" income="￥5,200" />
<AgentStatusItem name="数据侠" status="开发中" downloads="0" income="￥0" opacity />
```

更改为（加 agentId prop）：
```tsx
<AgentStatusItem name="小王" agentId="agent-1" status="在线 / 稳定" downloads="1.2k" income="￥12,400" />
<AgentStatusItem name="代码禅师" agentId="agent-5" status="在线 / 稳定" downloads="842" income="￥5,200" />
<AgentStatusItem name="数据侠" agentId="agent-4" status="开发中" downloads="0" income="￥0" opacity />
```

修改 `AgentStatusItem` 函数签名和实现，在组件顶部获取 navigate，加点击跳转：
```tsx
function AgentStatusItem({ name, agentId, status, downloads, income, opacity }: any) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => agentId && navigate(`/provider/simulator/${agentId}`)}
      className={cn(
        "flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-emerald-500/20 transition-all cursor-pointer",
        opacity && "opacity-50"
      )}
    >
      {/* ...内容与原来完全相同... */}
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-lg bg-slate-800" />
        <div>
          <p className="text-sm font-bold text-white">{name}</p>
          <p className="text-[10px] text-emerald-500 flex items-center space-x-1">
            <span className="w-1 h-1 bg-current rounded-full" />
            <span>{status}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-8">
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase">入职数</p>
          <p className="text-xs font-bold text-slate-300">{downloads}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase">收益</p>
          <p className="text-xs font-bold text-emerald-500">{income}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 类型检查 + 启动开发服务器验证**

```bash
cd reference && npm run lint
```

期望：无 error

```bash
cd reference && npm run dev
```

验证路径：
1. `http://localhost:3000/provider` → 点击"进入模拟器" → 跳转到 `/provider/simulator`
2. `/provider/simulator` → 左栏显示小王（默认第一个 agent）
3. 点击"运行模拟测试" → 2s loading → 显示 mock 报告
4. 报告中通过率 96.2%，基准 85%，"立即上架"按钮高亮绿色
5. `http://localhost:3000/marketplace` → 点击任意 agent 的"入职"按钮 → HireModal 显示 Step 1
6. 点击"下一步" → Step 2 显示渠道/要求/场景表单，可以多选
7. 点击"确认入职" → Step 3 入职成功动画
8. `http://localhost:3000/provider` → 点击"小王"行 → 跳转到 `/provider/simulator/agent-1`

- [ ] **Step 4: 提交**

```bash
cd reference && git add src/App.tsx src/pages/provider/Console.tsx && git commit -m "feat: register simulator route, wire console navigation"
```

---

## 自检清单

- [x] **Spec coverage:**
  - §3 HireModal 3步 → Task 4 ✓
  - §4 Simulator 页面两栏布局 → Task 5 ✓
  - §2 JobSpec/SimReport 类型 → Task 1 ✓
  - §2 Store 扩展 → Task 3 ✓
  - §5 联动路径 → Task 3 (store) + Task 6 (routes) ✓
  - §6 路由注册 → Task 6 ✓
  - §7 视觉风格规范 → 所有 Task 中的代码使用相同 class ✓

- [x] **Placeholder scan:** 无 TBD/TODO，所有代码块完整。

- [x] **Type consistency:**
  - `JobSpec` 在 Task 1 定义，Task 3/4 使用相同字段名 ✓
  - `SimReport` 在 Task 1 定义，Task 2 fixtures 和 Task 5 使用相同字段 ✓
  - `hireAgent(agent, jobSpec?)` 在 Task 3 定义，Task 4 调用相同签名 ✓
  - `useSimulatorStore` 在 Task 3 定义，Task 5 使用 `{ status, report, runSimulation, resetReport }` ✓
