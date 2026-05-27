import React, { useState, useEffect, useCallback, useRef, DragEvent, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, useReactFlow, Handle, Position,
  type NodeProps, type Connection, type Edge, type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'motion/react';
import { AgentNode as ProductAgentNode, LogNode as ProductLogNode, WorkitemNode as ProductWorkitemNode } from './productShot/Nodes';
import { RunPanel as ProductShotRunPanel } from './productShot/RunPanel';
import { WorkitemViewer as ProductShotViewer } from './productShot/WorkitemViewer';
import { useProductShotStore } from './productShot/store';
import { useWorkspaceModelStore } from '../../store/useAppStore';
import {
  createWorkspaceForSector,
  createBusinessSectorWithWorkspace,
  loadWorkspaceModelFromApi,
  loadWorkspaceTaskRuns,
  saveWorkspaceCanvas,
} from '../../lib/workspaceApi';
import { streamVegaChat } from '../../lib/vegaApi';
import type { BusinessSector, Workspace } from '../../types';
import {
  Plus, X, Send, Zap, Activity, Command,
  TrendingUp, BarChart3, Shield, Languages, Code2,
  CheckCircle2, ChevronRight, ChevronLeft, Maximize2, Minimize2, FolderOpen,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Node types ───────────────────────────────────────────────────────────────

type NodeKind = 'content' | 'data' | 'video' | 'translate' | 'quality' | 'output';

interface PipelineNodeData {
  label: string;
  kind: NodeKind;
  agentName: string;
  agentRole: string;
  avatar: string;
  status: 'active' | 'idle' | 'processing' | 'blocked';
  params?: { key: string; val: string | number }[];
  [key: string]: unknown;
}

const KIND_STYLE: Record<NodeKind, { border: string; header: string; badge: string; dot: string; bg: string }> = {
  content:   { border: 'border-brand-start/40',        header: 'text-brand-start',       badge: 'bg-brand-start/15 border-brand-start/30 text-brand-start',           dot: 'bg-brand-start',       bg: 'from-brand-start/5' },
  data:      { border: 'border-amber-400/40',           header: 'text-amber-300',         badge: 'bg-amber-400/15 border-amber-400/30 text-amber-300',                 dot: 'bg-amber-400',         bg: 'from-amber-400/5' },
  video:     { border: 'border-sky-400/40',             header: 'text-sky-300',           badge: 'bg-sky-400/15 border-sky-400/30 text-sky-300',                       dot: 'bg-sky-400',           bg: 'from-sky-400/5' },
  translate: { border: 'border-teal-400/40',            header: 'text-teal-300',          badge: 'bg-teal-400/15 border-teal-400/30 text-teal-300',                    dot: 'bg-teal-400',          bg: 'from-teal-400/5' },
  quality:   { border: 'border-accent-marketplace/40',  header: 'text-accent-marketplace', badge: 'bg-accent-marketplace/15 border-accent-marketplace/30 text-accent-marketplace', dot: 'bg-accent-marketplace', bg: 'from-accent-marketplace/5' },
  output:    { border: 'border-emerald-400/40',         header: 'text-emerald-300',       badge: 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300',           dot: 'bg-emerald-400',       bg: 'from-emerald-400/5' },
};

const STATUS_DOT: Record<string, string> = {
  active:     'bg-status-success animate-pulse',
  idle:       'bg-slate-600',
  processing: 'bg-accent-auto animate-pulse',
};

function PipelineNode({ data, id, selected }: NodeProps) {
  const d = data as PipelineNodeData;
  const s = KIND_STYLE[d.kind];
  const { deleteElements } = useReactFlow();

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  // Status-based box shadow
  const statusShadow =
    d.status === 'active'     ? '0 0 0 1px rgba(16,185,129,0.35), 0 0 20px rgba(16,185,129,0.15)' :
    d.status === 'processing' ? '0 0 0 1px rgba(14,165,233,0.35), 0 0 20px rgba(14,165,233,0.12)' :
    d.status === 'blocked'    ? '0 0 0 1px rgba(245,158,11,0.40), 0 0 16px rgba(245,158,11,0.15)' :
    '0 0 0 1px rgba(255,255,255,0.04)';

  return (
    <>
      {/* ── Keyframe styles injected once ── */}
      <style>{`
        @keyframes scanline {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 0.7; }
          90%  { opacity: 0.7; }
          100% { transform: translateY(400%); opacity: 0; }
        }
        @keyframes flowbar {
          0%   { width: 0%; opacity: 0.9; }
          80%  { width: 100%; opacity: 0.9; }
          100% { width: 100%; opacity: 0; }
        }
        @keyframes borderFlicker {
          0%, 100% { opacity: 1; }
          45%      { opacity: 0.35; }
          50%      { opacity: 0.9; }
          55%      { opacity: 0.35; }
        }
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes activeBorder {
          0%, 100% { border-color: rgba(16,185,129,0.5); box-shadow: 0 0 0 1px rgba(16,185,129,0.15), 0 0 14px rgba(16,185,129,0.1); }
          50%       { border-color: rgba(16,185,129,0.85); box-shadow: 0 0 0 1px rgba(16,185,129,0.3), 0 0 20px rgba(16,185,129,0.2); }
        }
        @keyframes processingBorder {
          0%, 100% { border-color: rgba(14,165,233,0.4); box-shadow: 0 0 0 1px rgba(14,165,233,0.1), 0 0 10px rgba(14,165,233,0.07); }
          50%       { border-color: rgba(14,165,233,0.75); box-shadow: 0 0 0 1px rgba(14,165,233,0.25), 0 0 16px rgba(14,165,233,0.15); }
        }
      `}</style>

    <div
      className={cn(
        'group relative w-56 rounded-2xl border bg-gradient-to-b to-transparent bg-[#0d1224]/95 backdrop-blur-xl transition-all duration-300 overflow-hidden',
        // border color per kind
        d.status === 'blocked' ? 'border-status-warning/50' : s.border,
        s.bg,
        selected && 'ring-1 ring-white/30',
        d.status === 'idle' && 'opacity-80'
      )}
      style={{ boxShadow: statusShadow }}
    >
      {/* ── Active: breathing glow layer ── */}
      {d.status === 'active' && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)',
            animation: 'pulse 2.4s ease-in-out infinite',
          }}
        />
      )}

      {/* ── Processing: top-to-bottom scan line ── */}
      {d.status === 'processing' && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
          <div style={{
            position: 'absolute', left: 0, right: 0, height: '28%',
            background: 'linear-gradient(to bottom, transparent, rgba(14,165,233,0.12), transparent)',
            animation: 'scanline 2s linear infinite',
          }} />
          {/* Spinning outer ring */}
          <div style={{
            position: 'absolute', inset: -1, borderRadius: 16,
            background: 'conic-gradient(from 0deg, transparent 75%, rgba(14,165,233,0.7) 100%)',
            animation: 'spinRing 1.8s linear infinite',
            WebkitMaskImage: 'radial-gradient(farthest-side, transparent calc(100% - 2px), white calc(100% - 2px))',
            maskImage:       'radial-gradient(farthest-side, transparent calc(100% - 2px), white calc(100% - 2px))',
          }} />
        </div>
      )}

      {/* ── Blocked: flickering amber border overlay ── */}
      {d.status === 'blocked' && (
        <div
          className="absolute inset-0 rounded-2xl border-2 border-status-warning/60 pointer-events-none"
          style={{ animation: 'borderFlicker 1.6s ease-in-out infinite' }}
        />
      )}

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-slate-900 border border-white/15 flex items-center justify-center text-slate-600 hover:bg-status-error/20 hover:text-status-error hover:border-status-error/40 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg"
      >
        <X size={11} />
      </button>

      <Handle type="target" position={Position.Left}
        style={{ width: 10, height: 10, background: '#1e293b', border: '2px solid #334155', left: -5, zIndex: 10 }} />
      <Handle type="source" position={Position.Right}
        style={{ width: 10, height: 10, background: '#1e293b', border: '2px solid #334155', right: -5, zIndex: 10 }} />

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 pt-3.5 pb-2 z-10">
        <div className="flex items-center gap-2">
          {/* Larger, more visible status dot */}
          <div className={cn(
            'w-2 h-2 rounded-full shrink-0',
            d.status === 'active'     ? 'bg-status-success shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse' :
            d.status === 'processing' ? 'bg-accent-auto shadow-[0_0_6px_rgba(14,165,233,0.8)] animate-pulse' :
            d.status === 'blocked'    ? 'bg-status-warning shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse' :
            'bg-slate-600'
          )} />
          <span className={cn('text-[11px] font-bold uppercase tracking-[0.15em]', s.header)}>{d.label}</span>
        </div>

        {/* Status badge — larger, more readable */}
        <span className={cn(
          'text-[10px] font-bold px-2.5 py-1 rounded-lg border font-mono tracking-wide',
          d.status === 'active'     ? 'bg-status-success/15 border-status-success/35 text-status-success shadow-[0_0_8px_rgba(16,185,129,0.2)]' :
          d.status === 'processing' ? 'bg-accent-auto/15 border-accent-auto/35 text-accent-auto shadow-[0_0_8px_rgba(14,165,233,0.2)]' :
          d.status === 'blocked'    ? 'bg-status-warning/15 border-status-warning/35 text-status-warning shadow-[0_0_8px_rgba(245,158,11,0.2)]' :
          'bg-white/5 border-white/10 text-slate-500'
        )}>
          {d.status === 'active' ? '● LIVE' : d.status === 'processing' ? '◎ RUN' : d.status === 'blocked' ? '⚠ ERR' : '○ 待命'}
        </span>
      </div>

      {/* Agent identity */}
      <div className="relative flex items-center gap-2.5 px-4 pb-3 z-10">
        <div className="relative shrink-0">
          <img src={d.avatar} className="w-9 h-9 rounded-xl bg-slate-800 border border-white/10" alt={d.agentName} />
          <div className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d1224]', STATUS_DOT[d.status])} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-white truncate">{d.agentName}</p>
          <p className="text-[10px] text-slate-500 truncate">{d.agentRole}</p>
        </div>
      </div>

      {/* Params */}
      {d.params && d.params.length > 0 && (
        <div className="relative px-4 pb-3 pt-1 border-t border-white/[0.06] space-y-0.5 z-10">
          {d.params.map(p => (
            <div key={p.key} className="flex items-center justify-between">
              <span className="text-[9px] text-slate-600 font-mono uppercase">{p.key}</span>
              <span className="text-[10px] text-slate-300 font-mono font-bold">{p.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer: status bar */}
      <div className="relative px-4 pb-0 z-10">
        {/* Active: flowing progress bar */}
        {d.status === 'active' && (
          <div className="h-0.5 w-full bg-white/[0.04] rounded-full overflow-hidden mb-2">
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.8), transparent)',
              animation: 'flowbar 2.2s ease-in-out infinite',
            }} />
          </div>
        )}
        {/* Processing: striped loading bar */}
        {d.status === 'processing' && (
          <div className="h-0.5 w-full bg-white/[0.04] rounded-full overflow-hidden mb-2">
            <div style={{
              height: '100%', width: '60%',
              background: 'repeating-linear-gradient(90deg, rgba(14,165,233,0.7) 0px, rgba(14,165,233,0.7) 6px, transparent 6px, transparent 10px)',
              animation: 'flowbar 1.4s linear infinite',
            }} />
          </div>
        )}
        {/* Blocked: static warning bar */}
        {d.status === 'blocked' && (
          <div className="h-0.5 w-full mb-2" style={{
            background: 'repeating-linear-gradient(90deg, rgba(245,158,11,0.6) 0px, rgba(245,158,11,0.6) 4px, transparent 4px, transparent 8px)',
            animation: 'borderFlicker 1.6s ease-in-out infinite',
          }} />
        )}
        {/* Idle: static dim line */}
        {d.status === 'idle' && <div className="h-px w-full bg-white/[0.04] mb-2" />}
      </div>

      <div className="relative flex items-center gap-2 px-4 pb-3.5 z-10">
        {/* Distinct icon per status */}
        {d.status === 'active' && (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="3" fill="rgba(16,185,129,0.9)">
              <animate attributeName="r" values="3;4;3" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.5;1" dur="1.2s" repeatCount="indefinite" />
            </circle>
          </svg>
        )}
        {d.status === 'processing' && (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="4" fill="none" stroke="rgba(14,165,233,0.6)" strokeWidth="1.5" strokeDasharray="6 6">
              <animateTransform attributeName="transform" type="rotate" from="0 5 5" to="360 5 5" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
        )}
        {d.status === 'blocked' && <Activity size={10} className="text-status-warning/70" />}
        {d.status === 'idle'    && <Activity size={10} className="text-slate-700" />}

        <div className="flex-1 h-px bg-white/[0.05]" />

        {/* Semantically distinct labels */}
        <span className={cn('text-[10px] font-mono font-bold tracking-wider',
          d.status === 'active'     ? 'text-status-success' :
          d.status === 'processing' ? 'text-accent-auto' :
          d.status === 'blocked'    ? 'text-status-warning' : 'text-slate-600'
        )}>
          {d.status === 'active'
            ? '实时产出中'
            : d.status === 'processing'
            ? '数据处理中'
            : d.status === 'blocked'
            ? '异常 · 待处理'
            : '· 待命'}
        </span>
      </div>
    </div>
    </>
  );
}

const nodeTypes = {
  pipelineNode: PipelineNode,
  productAgent: ProductAgentNode,
  productLog: ProductLogNode,
  productWorkitem: ProductWorkitemNode,
};

// ─── Glow Edge ────────────────────────────────────────────────────────────────

function GlowEdge({ id, sourceX, sourceY, targetX, targetY }: {
  id: string; sourceX: number; sourceY: number; targetX: number; targetY: number; style?: React.CSSProperties;
}) {
  const midX = (sourceX + targetX) / 2;
  const d = `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
  return (
    <g>
      <defs>
        <linearGradient id={`eg-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(52,211,153)" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth={6} />
      <path d={d} fill="none" stroke={`url(#eg-${id})`} strokeWidth={1.8} strokeLinecap="round" />
      <path d={d} fill="none" stroke="transparent" id={`mp-${id}`} />
      <circle r={3.5} fill="rgba(59,130,246,0.85)">
        <animateMotion dur="2s" repeatCount="indefinite" calcMode="linear"><mpath href={`#mp-${id}`} /></animateMotion>
      </circle>
      <circle r={2} fill="rgba(52,211,153,0.7)">
        <animateMotion dur="2s" repeatCount="indefinite" calcMode="linear" begin="1s"><mpath href={`#mp-${id}`} /></animateMotion>
      </circle>
    </g>
  );
}
const edgeTypes = { glowEdge: GlowEdge };

// ─── Initial canvas state ─────────────────────────────────────────────────────

const INIT_NODES: Node[] = [
  {
    id: 'data-1', type: 'pipelineNode', position: { x: 60, y: 200 },
    data: { label: '数据源', kind: 'data', agentName: '数据侠', agentRole: '市场趋势分析',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack', status: 'active',
      params: [{ key: 'SOURCE', val: '竞品+舆情' }, { key: 'FREQ', val: 'T+1' }],
    } as PipelineNodeData,
  },
  {
    id: 'content-1', type: 'pipelineNode', position: { x: 360, y: 160 },
    data: { label: '内容生成', kind: 'content', agentName: '小王', agentRole: '社交媒体文案',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', status: 'active',
      params: [{ key: 'PLATFORM', val: '小红书' }, { key: 'TONE', val: '种草' }],
    } as PipelineNodeData,
  },
  {
    id: 'video-1', type: 'pipelineNode', position: { x: 660, y: 200 },
    data: { label: '视频剪辑', kind: 'video', agentName: '小陈', agentRole: '短视频剪辑',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria', status: 'processing',
      params: [{ key: 'FORMAT', val: '9:16' }, { key: 'DUR', val: '30s' }],
    } as PipelineNodeData,
  },
  {
    id: 'output-1', type: 'pipelineNode', position: { x: 960, y: 180 },
    data: { label: '发布执行', kind: 'output', agentName: 'LING', agentRole: '多语言翻译',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly', status: 'idle',
      params: [{ key: 'CHANNEL', val: '全渠道' }, { key: 'LANG', val: 'ZH+EN' }],
    } as PipelineNodeData,
  },
];

const INIT_EDGES: Edge[] = [
  { id: 'e1-2', source: 'data-1',    target: 'content-1', type: 'glowEdge' },
  { id: 'e2-3', source: 'content-1', target: 'video-1',   type: 'glowEdge' },
  { id: 'e3-4', source: 'video-1',   target: 'output-1',  type: 'glowEdge' },
];

// ─── Digital Workforce Stations (left panel) ──────────────────────────────────

const WORKFORCE = [
  {
    id: 'xiaowang', name: '小王',    role: '社交媒体文案',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    kind: 'content'   as NodeKind, status: 'active'     as const,
    roi: '850%', successRate: 98.2, monthlyOutput: '1,240篇',
    pipelineCount: 3, currentTask: '撰写防晒文案中',
    icon: <TrendingUp size={12} />,
  },
  {
    id: 'xiaochen', name: '小陈',    role: '短视频剪辑',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',
    kind: 'video'     as NodeKind, status: 'processing' as const,
    roi: '620%', successRate: 95.5, monthlyOutput: '450个',
    pipelineCount: 2, currentTask: '渲染视频中',
    icon: <BarChart3 size={12} />,
  },
  {
    id: 'datashe',  name: '数据侠',  role: '市场趋势分析',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    kind: 'data'      as NodeKind, status: 'active'     as const,
    roi: '450%', successRate: 94.0, monthlyOutput: '120份',
    pipelineCount: 2, currentTask: '采集竞品数据',
    icon: <Shield size={12} />,
  },
  {
    id: 'ling',     name: 'LING',   role: '多语言翻译',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly',
    kind: 'translate' as NodeKind, status: 'idle'       as const,
    roi: '1200%', successRate: 99.8, monthlyOutput: '3,200条',
    pipelineCount: 2, currentTask: '待命',
    icon: <Languages size={12} />,
  },
  {
    id: 'code',     name: '代码禅师', role: '前端自动化',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zane',
    kind: 'quality'   as NodeKind, status: 'idle'       as const,
    roi: '900%', successRate: 97.5, monthlyOutput: '800件',
    pipelineCount: 1, currentTask: '待命',
    icon: <Code2 size={12} />,
  },
];

// ─── Business sectors ────────────────────────────────────────────────────────

type SectorStatus = 'live' | 'published' | 'draft';

interface SectorAgent {
  name: string;
  avatar: string;
  role: string;
}

interface Sector {
  id: string;
  name: string;
  desc: string;
  status: SectorStatus;
  version: string;
  agents: SectorAgent[];
  steps: string[];
  metrics?: { label: string; val: string };
  nodes: Node[];
  edges: Edge[];
  vegaMsg: string;
}

// Helper to build a pipeline node
const pn = (id: string, x: number, y: number, label: string, kind: NodeKind, name: string, role: string, avatar: string, status: 'active'|'idle'|'processing', params: {key:string;val:string|number}[]): Node => ({
  id, type: 'pipelineNode', position: { x, y },
  data: { label, kind, agentName: name, agentRole: role, avatar, status, params } as PipelineNodeData,
});
const pe = (id: string, src: string, tgt: string): Edge => ({ id, source: src, target: tgt, type: 'glowEdge' });

const SECTORS: Sector[] = [
  {
    id: 's1', name: '电商内容营销', desc: '数据驱动的全渠道内容生产流水线',
    status: 'live', version: 'v2.3',
    agents: [
      { name: '数据侠', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',  role: '数据采集' },
      { name: '小王',   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', role: '内容生成' },
      { name: '小陈',   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',  role: '视频剪辑' },
      { name: 'LING',  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly', role: '多语发布' },
    ],
    steps: ['数据源', '内容生成', '视频剪辑', '发布执行'],
    metrics: { label: 'ROI', val: '850%' },
    nodes: [
      pn('d1', 60,  200, '数据源', 'data',    '数据侠', '市场趋势分析', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',  'active',     [{ key: 'SOURCE', val: '竞品+舆情' }, { key: 'FREQ', val: 'T+1' }]),
      pn('c1', 360, 160, '内容生成', 'content', '小王',  '社交媒体文案', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', 'active',     [{ key: 'PLATFORM', val: '小红书' }, { key: 'TONE', val: '种草' }]),
      pn('v1', 660, 200, '视频剪辑', 'video',   '小陈',  '短视频剪辑',   'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',  'processing', [{ key: 'FORMAT', val: '9:16' }, { key: 'DUR', val: '30s' }]),
      pn('o1', 960, 180, '发布执行', 'output',  'LING',  '多语言翻译',   'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly', 'idle',       [{ key: 'CHANNEL', val: '全渠道' }, { key: 'LANG', val: 'ZH+EN' }]),
    ],
    edges: [pe('e1','d1','c1'), pe('e2','c1','v1'), pe('e3','v1','o1')],
    vegaMsg: '已加载「电商内容营销」流水线（v2.3，运行中）。数据侠+小王+小陈+LING 四节点全部激活，ROI 850%。建议在视频节点后增加质检环节。',
  },
  {
    id: 's2', name: '竞品数据洞察', desc: '市场情报收集与深度报告生成',
    status: 'published', version: 'v1.1',
    agents: [
      { name: '数据侠', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',  role: '情报采集' },
      { name: '小王',   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', role: '报告撰写' },
    ],
    steps: ['数据采集', '分析报告', '存档'],
    metrics: { label: '报告/月', val: '24份' },
    nodes: [
      pn('d2', 160, 200, '数据采集', 'data',    '数据侠', '市场趋势分析', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',  'active', [{ key: 'DEPTH', val: '竞品+行业' }, { key: 'CYCLE', val: '每日' }]),
      pn('c2', 520, 200, '报告撰写', 'content', '小王',  '市场研究报告', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', 'active', [{ key: 'FORMAT', val: 'Markdown' }, { key: 'LEN', val: '2000字' }]),
      pn('a2', 880, 200, '存档发布', 'output',  '存档室', '自动归档',     'https://api.dicebear.com/7.x/avataaars/svg?seed=Zane2',  'idle',   [{ key: 'DEST', val: '存档室' }, { key: 'NOTIFY', val: 'Boss' }]),
    ],
    edges: [pe('e4','d2','c2'), pe('e5','c2','a2')],
    vegaMsg: '已加载「竞品数据洞察」流水线（v1.1）。数据侠采集竞品情报，小王自动生成深度报告，月均产出 24 份。当前处于已发布状态，可随时启动。',
  },
  {
    id: 's3', name: '多语言出海', desc: '内容本地化与全球渠道同步分发',
    status: 'published', version: 'v1.0',
    agents: [
      { name: '小王',  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', role: '原创内容' },
      { name: 'LING', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly', role: '翻译本地化' },
      { name: '小陈',  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',  role: '视频适配' },
    ],
    steps: ['内容生成', 'ZH→EN→JP', '平台适配', '发布'],
    metrics: { label: '语言覆盖', val: '5种' },
    nodes: [
      pn('c3', 60,  200, '内容生成', 'content',   '小王',  '社交媒体文案', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', 'active', [{ key: 'LANG', val: 'ZH原创' }, { key: 'TYPE', val: '图文' }]),
      pn('t3', 360, 200, '多语翻译', 'translate',  'LING',  '多语言翻译',   'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly', 'active', [{ key: 'LANGS', val: 'ZH+EN+JP' }, { key: 'MODE', val: '地道' }]),
      pn('v3', 660, 180, '视频适配', 'video',      '小陈',  '短视频剪辑',   'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',  'idle',   [{ key: 'RATIO', val: '9:16/1:1' }, { key: 'SUB', val: '双语字幕' }]),
      pn('o3', 960, 200, '全球发布', 'output',     'LING',  '渠道分发',     'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly', 'idle',   [{ key: 'CH', val: 'TikTok+INS' }, { key: 'COVER', val: '5国' }]),
    ],
    edges: [pe('e6','c3','t3'), pe('e7','t3','v3'), pe('e8','v3','o3')],
    vegaMsg: '已加载「多语言出海」流水线（v1.0）。小王生产原创内容 → LING 翻译为 5 种语言 → 小陈适配视频格式 → 全球渠道同步发布。建议增加各语言版本的质量审核节点。',
  },
  {
    id: 's4', name: '代码自动化', desc: '前端组件自动生成与质检部署',
    status: 'draft', version: 'v0.2',
    agents: [
      { name: '代码禅师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zane', role: '代码生成' },
    ],
    steps: ['需求解析', '代码生成', '质检', '部署'],
    nodes: [
      pn('c4', 300, 200, '代码生成', 'quality', '代码禅师', '前端自动化', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zane', 'idle', [{ key: 'STACK', val: 'React+TS' }, { key: 'STATUS', val: '草稿' }]),
    ],
    edges: [],
    vegaMsg: '「代码自动化」流水线尚在草稿阶段（v0.2）。代码禅师已就位，但质检和部署节点还未配置。Boss，是否要我自动生成完整的 CI/CD 流水线？',
  },
  {
    id: 's5', name: '产品视觉合成', desc: '商品图 → 广告级宣传图，集成第三方 agent',
    status: 'live', version: 'v0.1',
    agents: [
      { name: '产品摄影师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shot', role: '图像合成' },
    ],
    steps: ['上传商品图', 'Agent 合成', '查看 Workitem', '迭代'],
    metrics: { label: '试用次数', val: 'demo' },
    nodes: [
      { id: 'agent-shot', type: 'productAgent',    position: { x: 80,  y: 200 }, data: {} },
      { id: 'log-shot',   type: 'productLog',      position: { x: 480, y: 60  }, data: {} },
      { id: 'item-shot',  type: 'productWorkitem', position: { x: 480, y: 300 }, data: {} },
    ],
    edges: [
      { id: 'e-shot-1', source: 'agent-shot', target: 'log-shot',  type: 'glowEdge' },
      { id: 'e-shot-2', source: 'agent-shot', target: 'item-shot', type: 'glowEdge' },
    ],
    vegaMsg: '已加载「产品视觉合成」演示。这是接入第三方图像 agent 的样板：点击中间的产品摄影师节点 → 上传商品图 + 一句话描述 → 运行，产出会以 workitem 形式落入右下节点，支持版本切换与迭代重跑。',
  },
];

function buildWorkspaceModelSeed(sectors: Sector[]): {
  businessSectors: BusinessSector[];
  workspaces: Workspace[];
  currentBusinessSectorId: string | null;
  currentWorkspaceId: string | null;
} {
  const timestamp = new Date().toISOString();
  const businessSectors = sectors.map((sector) => ({
    id: sector.id,
    name: sector.name,
    description: sector.desc,
    status: sector.status,
    version: sector.version,
    templateCanvas: { nodes: sector.nodes, edges: sector.edges },
    workspaceIds: [`ws-${sector.id}-default`],
    summaryAgents: sector.agents,
    summarySteps: sector.steps,
    summaryMetric: sector.metrics,
    vegaMessage: sector.vegaMsg,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const workspaces: Workspace[] = sectors.map((sector) => ({
    id: `ws-${sector.id}-default`,
    businessSectorId: sector.id,
    name: `${sector.name} / 默认项目`,
    description: sector.desc,
    status: sector.status === 'draft' ? 'draft' : 'active',
    canvas: { nodes: sector.nodes, edges: sector.edges },
    fileIds: [],
    taskIds: [],
    memoryIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  return {
    businessSectors,
    workspaces,
    currentBusinessSectorId: businessSectors[0]?.id ?? null,
    currentWorkspaceId: workspaces[0]?.id ?? null,
  };
}

const STATUS_BADGE: Record<SectorStatus, { label: string; cls: string }> = {
  live:      { label: '运行中', cls: 'bg-status-success/15 border-status-success/30 text-status-success' },
  published: { label: '已发布', cls: 'bg-brand-start/15 border-brand-start/30 text-brand-start' },
  draft:     { label: '草稿',   cls: 'bg-white/5 border-white/15 text-slate-500' },
};

// ─── VEGA responses ───────────────────────────────────────────────────────────

function vegaPipelineReply(q: string) {
  const t = q.toLowerCase();
  if (t.includes('风险') || t.includes('质检'))
    return 'Boss，我在「视频剪辑」和「发布执行」之间插入了质检节点，确保内容符合平台规范后再发布。';
  if (t.includes('翻译') || t.includes('出海'))
    return '已将 LING 翻译节点接入流水线末端，支持 ZH→EN→JP 三语同步发布。';
  if (t.includes('数据') || t.includes('分析'))
    return '数据侠已接入数据源节点，将实时抓取竞品舆情作为内容生成的参考输入。';
  if (t.includes('文章') || t.includes('报告'))
    return '检测到策略文本，我正在提取核心因子... 3 秒内将在画布上自动生成流水线节点并完成连线。';
  return `收到，Boss。我正在分析该需求，将为您优化数字劳动力流水线配置。`;
}

// ─── VEGA COO icon ────────────────────────────────────────────────────────────

function VegaIcon({ size = 16, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <polygon points="14,2 26,8 26,20 14,26 2,20 2,8"
        stroke={active ? 'rgba(56,189,248,0.9)' : 'rgba(56,189,248,0.6)'}
        strokeWidth="1.5" fill="none" />
      <circle cx="14" cy="14" r="3.5" fill={active ? 'rgba(56,189,248,1)' : 'rgba(56,189,248,0.7)'}>
        {active && <animate attributeName="r" values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite" />}
      </circle>
    </svg>
  );
}

// ─── Tabs — with nav targets ─────────────────────────────────────────────────

const TABS: { label: string; nav?: { path: string; state?: object } }[] = [
  { label: '编排画布' },
  { label: '人才市场',    nav: { path: '/app', state: { tab: 'marketplace' } } },
  { label: '开发商控制台', nav: { path: '/app', state: { tab: 'provider' } } },
  { label: '透明指挥舱' },
  { label: '绩效分析' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuantCanvas() {
  const navigate = useNavigate();
  const bootstrapWorkspaceModel = useWorkspaceModelStore((s) => s.bootstrapWorkspaceModel);
  const businessSectors = useWorkspaceModelStore((s) => s.businessSectors);
  const workspaces = useWorkspaceModelStore((s) => s.workspaces);
  const currentBusinessSectorId = useWorkspaceModelStore((s) => s.currentBusinessSectorId);
  const currentWorkspaceId = useWorkspaceModelStore((s) => s.currentWorkspaceId);
  const setCurrentBusinessSector = useWorkspaceModelStore((s) => s.setCurrentBusinessSector);
  const setCurrentWorkspace = useWorkspaceModelStore((s) => s.setCurrentWorkspace);
  const createBusinessSector = useWorkspaceModelStore((s) => s.createBusinessSector);
  const createWorkspace = useWorkspaceModelStore((s) => s.createWorkspace);
  const upsertWorkspace = useWorkspaceModelStore((s) => s.upsertWorkspace);
  const updateWorkspaceCanvas = useWorkspaceModelStore((s) => s.updateWorkspaceCanvas);
  const taskRuns = useWorkspaceModelStore((s) => s.taskRuns);
  const setWorkspaceTaskRuns = useWorkspaceModelStore((s) => s.setWorkspaceTaskRuns);
  const [activeTab, setActiveTab] = useState('编排画布');
  const [nodes, setNodes, onNodesChange] = useNodesState(INIT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INIT_EDGES);
  const [showVEGA, setShowVEGA] = useState(true);
  const [showSectors, setShowSectors] = useState(false);
  const [vegaInput, setVegaInput] = useState('');
  const [vegaThinking, setVegaThinking] = useState(false);
  const [workspaceSync, setWorkspaceSync] = useState<'loading' | 'remote' | 'local' | 'saving' | 'saved' | 'error'>('loading');
  const backendWorkspaceIdsRef = useRef<Set<string>>(new Set());
  const didLoadWorkspaceModelRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'system' | 'vega' | 'boss'; text: string }>>([
    { role: 'system', text: '流水线就绪：数据源 → 内容生成 → 视频剪辑 → 发布执行' },
    { role: 'vega',   text: 'Boss，当前电商内容营销流水线已激活。小王和数据侠正在协同运作，建议在视频节点后增加质检环节。' },
  ]);

  // ── VEGA panel: drag + resize + flip ──────────────────────────────────────
  const currentSector = useMemo(
    () => businessSectors.find((item) => item.id === currentBusinessSectorId) ?? null,
    [businessSectors, currentBusinessSectorId],
  );
  const currentWorkspace = useMemo(
    () => workspaces.find((item) => item.id === currentWorkspaceId) ?? null,
    [workspaces, currentWorkspaceId],
  );
  const currentSectorWorkspaces = useMemo(
    () => workspaces.filter((item) => item.businessSectorId === currentBusinessSectorId),
    [workspaces, currentBusinessSectorId],
  );
  const currentWorkspaceTaskRuns = useMemo(
    () => taskRuns.filter((item) => item.workspaceId === currentWorkspaceId).slice(0, 5),
    [taskRuns, currentWorkspaceId],
  );
  const activeSector = useMemo(
    () => Math.max(0, businessSectors.findIndex((item) => item.id === currentBusinessSectorId)),
    [businessSectors, currentBusinessSectorId],
  );
  const sectors = useMemo<Sector[]>(
    () => businessSectors.map((sector) => {
      const fallbackWorkspace = workspaces.find((item) => item.businessSectorId === sector.id);
      return {
        id: sector.id,
        name: sector.name,
        desc: sector.description,
        status: sector.status === 'active' ? 'live' : sector.status === 'archived' ? 'draft' : sector.status,
        version: sector.version,
        agents: sector.summaryAgents ?? [],
        steps: sector.summarySteps ?? [],
        metrics: sector.summaryMetric,
        nodes: fallbackWorkspace?.canvas.nodes ?? sector.templateCanvas.nodes,
        edges: fallbackWorkspace?.canvas.edges ?? sector.templateCanvas.edges,
        vegaMsg: sector.vegaMessage ?? `${sector.name} 已加载`,
      };
    }),
    [businessSectors, workspaces],
  );
  const [panelPos,  setPanelPos]  = useState({ x: -1, y: -1 }); // -1 = bottom-right default
  const [panelSize, setPanelSize] = useState({ w: 520, h: 380 });
  const [flipped,   setFlipped]   = useState(false);
  const [activeAgent, setActiveAgent] = useState<PipelineNodeData | null>(null);
  const [productAgentActive, setProductAgentActive] = useState(false);
  const [dockHoverIndex, setDockHoverIndex] = useState<number | null>(null);
  const [dockDetailOpen, setDockDetailOpen] = useState(false);
  const dockLayoutTransition = { type: 'spring' as const, stiffness: 280, damping: 32, mass: 0.65 };

  // Listen for product-shot agent clicks from inside its custom node.
  // Bumps a counter we treat as a one-shot signal.
  const productAgentClick = useProductShotStore(s => s.agentClickSignal);
  const lastProductClickRef = useRef(0);
  useEffect(() => {
    if (productAgentClick === lastProductClickRef.current) return;
    lastProductClickRef.current = productAgentClick;
    setActiveAgent(null);
    setProductAgentActive(true);
    setShowVEGA(true);
    setFlipped(true);
  }, [productAgentClick]);

  // ── Panel-size auto-fit ───────────────────────────────────────────────
  // When entering product-agent mode, animate the panel to a layout that fits
  // the three-section UI; restore previous size on exit.
  const sizeBeforeProductRef = useRef<{ w: number; h: number } | null>(null);
  const sizeAnimRef = useRef<number | null>(null);

  /** Smoothly tween panelSize (+ optionally panelPos) toward a target. */
  const animatePanelTo = useCallback((
    to: { w?: number; h?: number; x?: number; y?: number },
    duration = 360,
  ) => {
    if (sizeAnimRef.current !== null) cancelAnimationFrame(sizeAnimRef.current);
    const fromSize = { ...panelSize };
    const fromPos  = { ...panelPos };
    const start    = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const next: { w: number; h: number } = {
        w: Math.round(fromSize.w + ((to.w ?? fromSize.w) - fromSize.w) * e),
        h: Math.round(fromSize.h + ((to.h ?? fromSize.h) - fromSize.h) * e),
      };
      setPanelSize(next);
      if (to.x !== undefined || to.y !== undefined) {
        setPanelPos({
          x: Math.round(fromPos.x + ((to.x ?? fromPos.x) - fromPos.x) * e),
          y: Math.round(fromPos.y + ((to.y ?? fromPos.y) - fromPos.y) * e),
        });
      }
      if (t < 1) sizeAnimRef.current = requestAnimationFrame(step);
      else sizeAnimRef.current = null;
    };
    sizeAnimRef.current = requestAnimationFrame(step);
  }, [panelSize, panelPos]);

  useEffect(() => {
    const TARGET = { w: 720, h: 480 };

    if (productAgentActive) {
      sizeBeforeProductRef.current = { ...panelSize };
      animatePanelTo({
        w: Math.max(panelSize.w, TARGET.w),
        h: Math.max(panelSize.h, TARGET.h),
      });
    } else if (sizeBeforeProductRef.current) {
      animatePanelTo(sizeBeforeProductRef.current);
      sizeBeforeProductRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productAgentActive]);

  // Maximize / restore
  const [panelMaximized, setPanelMaximized] = useState(false);
  const maxRestoreRef = useRef<{ w: number; h: number; x: number; y: number } | null>(null);
  const toggleMaximize = useCallback(() => {
    const container = rfWrapper.current?.getBoundingClientRect();
    if (!container) return;
    if (!panelMaximized) {
      maxRestoreRef.current = { w: panelSize.w, h: panelSize.h, x: panelPos.x, y: panelPos.y };
      animatePanelTo({
        w: container.width - 40,
        h: container.height - 40,
        x: 20,
        y: 20,
      }, 420);
      setPanelMaximized(true);
    } else if (maxRestoreRef.current) {
      animatePanelTo(maxRestoreRef.current, 420);
      maxRestoreRef.current = null;
      setPanelMaximized(false);
    }
  }, [panelMaximized, panelSize, panelPos, animatePanelTo]);
  const [agentInput, setAgentInput] = useState('');

  // Drag logic — with threshold to prevent jitter on click
  const panelRef      = useRef<HTMLDivElement>(null);
  const isDragging    = useRef(false);
  const dragConfirmed = useRef(false);  // true only after moving >5px
  const dragOffset    = useRef({ x: 0, y: 0 });
  const dragStart     = useRef({ x: 0, y: 0 }); // initial mouse pos

  const onPanelDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    isDragging.current  = true;
    dragConfirmed.current = false;
    const rect = panelRef.current?.getBoundingClientRect();
    const containerRect = rfWrapper.current?.getBoundingClientRect();
    if (!rect || !containerRect) return;
    // dragOffset must be in container-relative coords (panel is absolute inside rfWrapper)
    dragOffset.current = {
      x: e.clientX - rect.left + containerRect.left,
      y: e.clientY - rect.top  + containerRect.top,
    };
    dragStart.current  = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      // Only commit to drag after moving at least 5px — prevents click jitter
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (!dragConfirmed.current && Math.sqrt(dx * dx + dy * dy) < 5) return;
      dragConfirmed.current = true;
      setPanelPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => { isDragging.current = false; dragConfirmed.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // Resize logic
  const isResizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: panelSize.w, h: panelSize.h };
    e.preventDefault();
    e.stopPropagation();
  }, [panelSize]);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const dw = e.clientX - resizeStart.current.x;
      const dh = e.clientY - resizeStart.current.y;
      setPanelSize({
        w: Math.max(440, resizeStart.current.w + dw),
        h: Math.max(280, resizeStart.current.h + dh),
      });
    };
    const onUp = () => { isResizing.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // Node click → flip to agent context. productAgent has its own signal path
  // (via the productShot store) and is handled in a useEffect; skip here.
  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    if (node.type === 'productAgent' || node.type === 'productLog' || node.type === 'productWorkitem') return;
    const d = node.data as PipelineNodeData;
    setActiveAgent(d);
    setProductAgentActive(false);
    setFlipped(true);
  }, []);

  // rfInstance must be declared before createBlankSector uses it
  const rfWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Dynamic sectors state (starts from static config, can be extended)
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName]         = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [showNewWorkspaceForm, setShowNewWorkspaceForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');

  useEffect(() => {
    if (didLoadWorkspaceModelRef.current) return;
    didLoadWorkspaceModelRef.current = true;

    let cancelled = false;
    setWorkspaceSync('loading');
    loadWorkspaceModelFromApi()
      .then(async (model) => {
        if (cancelled) return;
        if (model.businessSectors.length === 0) {
          const seeded = await Promise.all(
            SECTORS.map((sector) =>
              createBusinessSectorWithWorkspace({
                name: sector.name,
                description: sector.desc,
                version: sector.version,
                templateCanvas: { nodes: sector.nodes, edges: sector.edges },
              }),
            ),
          );
          if (cancelled) return;
          const seededModel = {
            businessSectors: seeded.map((item) => item.sector),
            workspaces: seeded.map((item) => item.workspace),
          };
          backendWorkspaceIdsRef.current = new Set(seededModel.workspaces.map((item) => item.id));
          bootstrapWorkspaceModel(seededModel);
          setWorkspaceSync('remote');
          setMessages(m => [...m, { role: 'vega' as const, text: `已初始化 ${seededModel.businessSectors.length} 个业务板块到 Postgres。` }]);
          return;
        }
        backendWorkspaceIdsRef.current = new Set(model.workspaces.map((item) => item.id));
        bootstrapWorkspaceModel(model);
        setWorkspaceSync('remote');
        setMessages(m => [...m, { role: 'vega' as const, text: `已从后端加载 ${model.businessSectors.length} 个业务板块。` }]);
      })
      .catch((error) => {
        if (cancelled) return;
        bootstrapWorkspaceModel(buildWorkspaceModelSeed(SECTORS));
        setWorkspaceSync('error');
        setMessages(m => [...m, { role: 'vega' as const, text: `后端 workspace 暂不可用，已切换本地演示模板：${error instanceof Error ? error.message : String(error)}` }]);
      });

    return () => {
      cancelled = true;
    };
  }, [bootstrapWorkspaceModel]);

  useEffect(() => {
    if (!currentWorkspace) return;
    setNodes(currentWorkspace.canvas.nodes);
    setEdges(currentWorkspace.canvas.edges);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!currentWorkspaceId) return;
    updateWorkspaceCanvas(currentWorkspaceId, { nodes, edges });
    if (!backendWorkspaceIdsRef.current.has(currentWorkspaceId)) return;

    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    setWorkspaceSync('saving');
    saveTimerRef.current = window.setTimeout(() => {
      saveWorkspaceCanvas(currentWorkspaceId, { nodes, edges })
        .then(() => setWorkspaceSync('saved'))
        .catch((error) => {
          setWorkspaceSync('error');
          setMessages(m => [...m, { role: 'vega' as const, text: `画布保存失败：${error instanceof Error ? error.message : String(error)}` }]);
        });
    }, 700);
  }, [currentWorkspaceId, nodes, edges, updateWorkspaceCanvas]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!currentWorkspaceId || !backendWorkspaceIdsRef.current.has(currentWorkspaceId)) return;
    loadWorkspaceTaskRuns(currentWorkspaceId)
      .then((runs) => setWorkspaceTaskRuns(currentWorkspaceId, runs))
      .catch(() => undefined);
  }, [currentWorkspaceId, setWorkspaceTaskRuns]);

  const createBlankSector = useCallback(async (name: string, desc: string) => {
    if (!name.trim()) return;
    const id = `s-${Date.now()}`;
    const blankNode = pn(`n-${id}`, 400, 200, '起始节点', 'data', '数据侠', '待配置', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack', 'idle', [{ key: 'STATUS', val: '待配置' }]);
    const newSec: Sector = {
      id, name: name.trim(), desc: desc.trim() || '新建业务流水线',
      status: 'draft', version: 'v0.1',
      agents: [], steps: ['起始节点'],
      nodes: [blankNode], edges: [],
      vegaMsg: `Boss，已为您创建「${name.trim()}」新板块（草稿 v0.1）。画布已清空，请从左侧数字劳动力工位拖拽员工来搭建您的流水线。`,
    };
    let created;
    try {
      created = await createBusinessSectorWithWorkspace({
        name: newSec.name,
        description: newSec.desc,
        version: newSec.version,
        templateCanvas: { nodes: newSec.nodes, edges: newSec.edges },
      });
      backendWorkspaceIdsRef.current.add(created.workspace.id);
      bootstrapWorkspaceModel({
        businessSectors: [...businessSectors, created.sector],
        workspaces: [...workspaces, created.workspace],
        currentBusinessSectorId: created.sector.id,
        currentWorkspaceId: created.workspace.id,
      });
      setWorkspaceSync('saved');
    } catch (error) {
      created = createBusinessSector({
        name: newSec.name,
        description: newSec.desc,
        version: newSec.version,
        templateCanvas: { nodes: newSec.nodes, edges: newSec.edges },
      });
      setWorkspaceSync('error');
      setMessages(m => [...m, { role: 'vega' as const, text: `后端创建失败，已先放入本地画布：${error instanceof Error ? error.message : String(error)}` }]);
    }
    setCurrentBusinessSector(created.sector.id);
    setCurrentWorkspace(created.workspace.id);
    setNodes(created.workspace.canvas.nodes);
    setEdges([]);
    setTimeout(() => rfInstance?.fitView({ padding: 0.4, duration: 500 }), 50);
    setMessages(m => [...m, { role: 'vega' as const, text: newSec.vegaMsg }]);
    setShowNewForm(false);
    setNewName('');
    setNewDesc('');
  }, [bootstrapWorkspaceModel, businessSectors, createBusinessSector, rfInstance, setCurrentBusinessSector, setCurrentWorkspace, setNodes, setEdges, workspaces]);

  const onConnect = useCallback(
    (p: Connection) => setEdges(es => addEdge({ ...p, type: 'glowEdge' }, es)),
    [setEdges]
  );

  const onDragStart = (e: DragEvent, workerId: string) => {
    e.dataTransfer.setData('workerId', workerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('workerId');
    const w = WORKFORCE.find(x => x.id === id);
    if (!w || !rfInstance || !rfWrapper.current) return;
    const bounds = rfWrapper.current.getBoundingClientRect();
    const pos = rfInstance.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    setNodes(ns => [...ns, {
      id: `${w.id}-${Date.now()}`,
      type: 'pipelineNode',
      position: pos,
      data: { label: w.role.slice(0, 4), kind: w.kind, agentName: w.name, agentRole: w.role, avatar: w.avatar, status: w.status, params: [{ key: 'ROI', val: w.roi }] } as PipelineNodeData,
    }]);
  }, [rfInstance, setNodes]);

  const onDragOver = (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  // Sector click → load pipeline onto canvas + VEGA context message
  const loadSector = useCallback((idx: number) => {
    const sec = sectors[idx];
    if (!sec) return;
    setCurrentBusinessSector(sec.id);
    const workspace = workspaces.find((item) => item.businessSectorId === sec.id);
    if (workspace) setCurrentWorkspace(workspace.id);
    setNodes(sec.nodes);
    setEdges(sec.edges);
    setTimeout(() => rfInstance?.fitView({ padding: 0.3, duration: 500 }), 50);
    setMessages(m => [...m, { role: 'vega' as const, text: sec.vegaMsg }]);
    setFlipped(false);
  }, [sectors, rfInstance, setCurrentBusinessSector, setCurrentWorkspace, setNodes, setEdges, workspaces]);

  const loadWorkspace = useCallback((workspace: Workspace) => {
    setCurrentWorkspace(workspace.id);
    setNodes(workspace.canvas.nodes);
    setEdges(workspace.canvas.edges);
    setTimeout(() => rfInstance?.fitView({ padding: 0.3, duration: 500 }), 50);
    setMessages(m => [...m, {
      role: 'vega' as const,
      text: `已切换到 Workspace「${workspace.name}」。后续文件、任务和记忆都会默认归属到这个项目空间。`,
    }]);
    setFlipped(false);
  }, [rfInstance, setCurrentWorkspace, setNodes, setEdges]);

  const createWorkspaceUnderCurrentSector = useCallback(async () => {
    if (!currentSector || !newWorkspaceName.trim()) return;
    const name = newWorkspaceName.trim();
    const description = newWorkspaceDesc.trim() || `${currentSector.name} 下的独立项目空间`;
    const canvas = currentSector.templateCanvas;
    let workspace: Workspace | null = null;

    try {
      workspace = await createWorkspaceForSector({
        businessSectorId: currentSector.id,
        name,
        description,
        canvas,
      });
      backendWorkspaceIdsRef.current.add(workspace.id);
      upsertWorkspace(workspace);
      setWorkspaceSync('saved');
    } catch (error) {
      workspace = createWorkspace({
        businessSectorId: currentSector.id,
        name,
        description,
        canvas,
        status: 'draft',
      });
      setWorkspaceSync('error');
      setMessages(m => [...m, {
        role: 'vega' as const,
        text: `后端创建 Workspace 失败，已先创建本地草稿：${error instanceof Error ? error.message : String(error)}`,
      }]);
    }

    if (!workspace) return;
    setCurrentWorkspace(workspace.id);
    setNodes(workspace.canvas.nodes);
    setEdges(workspace.canvas.edges);
    setMessages(m => [...m, {
      role: 'vega' as const,
      text: `已在「${currentSector.name}」下创建 Workspace「${workspace.name}」。这是新的项目执行现场。`,
    }]);
    setNewWorkspaceName('');
    setNewWorkspaceDesc('');
    setShowNewWorkspaceForm(false);
    setTimeout(() => rfInstance?.fitView({ padding: 0.35, duration: 500 }), 50);
  }, [
    createWorkspace,
    currentSector,
    newWorkspaceDesc,
    newWorkspaceName,
    rfInstance,
    setCurrentWorkspace,
    setEdges,
    setNodes,
    upsertWorkspace,
  ]);

  const sendToVega = async () => {
    if (!vegaInput.trim()) return;
    const msg = vegaInput.trim();
    const t = msg.toLowerCase();
    setVegaInput('');
    setMessages(m => [...m, { role: 'boss' as const, text: msg }]);
    setVegaThinking(true);

    // Detect create-sector intent: 创建/新建/添加 + 业务/流水线/板块/pipeline/workflow
    const isCreate = (t.includes('创建') || t.includes('新建') || t.includes('添加') || t.includes('new') || t.includes('create')) &&
      (t.includes('业务') || t.includes('流水线') || t.includes('板块') || t.includes('pipeline') || t.includes('工作流') || t.includes('workflow'));

    if (!isCreate) {
      try {
        let finalSeen = false;
        await streamVegaChat(
          {
            goal: msg,
            tenantId: 'default',
            businessSectorId: currentSector?.id ?? undefined,
            workspaceId: currentWorkspace?.id ?? undefined,
            workspaceName: currentWorkspace?.name ?? undefined,
            requestTags: {
              source: 'quant-canvas',
              canvas_nodes: String(nodes.length),
              canvas_edges: String(edges.length),
            },
            billingTags: {
              surface: 'workspace',
            },
          },
          (event) => {
            if (event.type === 'status' && event.message) {
              setMessages(m => [...m, { role: 'vega' as const, text: event.message! }]);
            }
            if (event.type === 'output' && event.content) {
              setMessages(m => [...m, {
                role: 'vega' as const,
                text: `${event.worker ?? 'worker'} 输出：\n${event.content}`,
              }]);
            }
            if (event.type === 'final' && event.message) {
              finalSeen = true;
              setMessages(m => [...m, { role: 'vega' as const, text: event.message! }]);
            }
            if (event.type === 'done') {
              if (!finalSeen) {
                setMessages(m => [...m, {
                  role: 'vega' as const,
                  text: `任务已完成，task_run_id=${event.task_run_id ?? 'unknown'}，thread_id=${event.thread_id ?? 'unknown'}`,
                }]);
              }
              if (currentWorkspace?.id) {
                loadWorkspaceTaskRuns(currentWorkspace.id)
                  .then((runs) => setWorkspaceTaskRuns(currentWorkspace.id, runs))
                  .catch(() => undefined);
              }
            }
            if (event.type === 'error') {
              setMessages(m => [...m, { role: 'vega' as const, text: event.message ?? 'VEGA 执行失败' }]);
            }
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
          },
        );
      } catch (error) {
        setMessages(m => [...m, {
          role: 'vega' as const,
          text: `VEGA 后端调用失败，先给出本地建议：${error instanceof Error ? error.message : String(error)}\n\n${vegaPipelineReply(msg)}`,
        }]);
      } finally {
        setVegaThinking(false);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
      return;
    }

    setTimeout(() => {
      if (isCreate) {
        // Extract potential name — take text after keyword
        const nameMatch = msg.replace(/^(创建|新建|添加|帮我创建|帮我新建)\s*/, '').replace(/(业务|流水线|板块|pipeline|工作流|workflow)/gi, '').trim();
        const sectorName = nameMatch.slice(0, 20) || `新板块 ${sectors.length + 1}`;
        createBlankSector(sectorName, '');
        setVegaThinking(false);
      } else {
        setMessages(m => [...m, { role: 'vega' as const, text: vegaPipelineReply(msg) }]);
        setVegaThinking(false);
      }
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, 900);
  };

  return (
    <div className="h-screen flex flex-col bg-[#06091a] text-slate-300 font-sans overflow-hidden">

      {/* ── Top Nav ── */}
      <header className="h-12 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[#06091a]/90 backdrop-blur-md shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-brand-start to-accent-blue rounded flex items-center justify-center font-bold text-[10px] text-white">CI</div>
            <span className="font-bold text-white text-[14px] tracking-tight">CIFORCE</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-[11px] text-slate-500">数字劳动力平台</span>
          <span className="px-1.5 py-0.5 rounded border border-accent-blue/30 bg-accent-blue/10 text-accent-blue text-[9px] font-bold uppercase tracking-wider">
            CANVAS
          </span>
          <span className={cn(
            'px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider',
            workspaceSync === 'saving'
              ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
              : workspaceSync === 'remote' || workspaceSync === 'saved'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              : workspaceSync === 'error'
              ? 'border-status-error/30 bg-status-error/10 text-status-error'
              : 'border-white/10 bg-white/[0.03] text-slate-500'
          )}>
            {workspaceSync === 'loading' ? 'LOADING' : workspaceSync === 'saving' ? 'SAVING' : workspaceSync === 'local' ? 'LOCAL' : workspaceSync === 'error' ? 'SYNC ERR' : 'POSTGRES'}
          </span>
        </div>

        <nav className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
          {TABS.map(t => {
            const isActive = activeTab === t.label;
            const isNav = !!t.nav;
            return (
              <button
                key={t.label}
                onClick={() => {
                  if (t.nav) {
                    navigate(t.nav.path, { state: t.nav.state });
                  } else {
                    setActiveTab(t.label);
                  }
                }}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                  isActive
                    ? 'bg-brand-start/20 text-white border border-brand-start/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                    : isNav
                    ? 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08]'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                )}
              >
                {t.label}
                {/* External link indicator for nav tabs */}
                {isNav && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="opacity-40">
                    <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">

          {/* VEGA button — becomes animated call-to-action when panel is closed */}
          <button
            onClick={() => setShowVEGA(v => !v)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200',
              showVEGA
                ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue hover:bg-accent-blue/15'
                : 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue hover:bg-accent-blue/25'
            )}
          >
            {/* Pulsing ring when closed */}
            {!showVEGA && (
              <>
                <span className="absolute inset-0 rounded-lg border border-accent-blue/60 animate-ping opacity-40 pointer-events-none" />
                <span className="absolute inset-0 rounded-lg border border-accent-blue/30 animate-pulse pointer-events-none" />
              </>
            )}
            <VegaIcon size={14} active={!showVEGA} />
            <span className="text-[11px] font-bold">VEGA</span>
            <span className="text-[9px] text-accent-blue/60">
              {showVEGA ? '数字 COO' : '点击唤醒'}
            </span>
            {/* Unread dot when closed */}
            {!showVEGA && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-start rounded-full border-2 border-[#06091a] animate-bounce" />
            )}
          </button>

          <button className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/8 rounded-lg text-[11px] text-slate-500 hover:text-white hover:border-white/20 transition-all font-mono">
            <Command size={11} />CMD-K
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Workspace context navigator ── */}
        <aside
          className="bg-[#06091a] border-r border-white/[0.06] flex flex-col shrink-0 overflow-hidden"
          style={{ width: 'clamp(300px, 24vw, 360px)' }}
        >
          <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-bold text-white tracking-wide">工作空间</p>
                <p className="text-[11px] text-slate-500 mt-0.5">先选业务板块，再进入 Workspace 画布</p>
              </div>
              <button
                onClick={() => setShowNewForm(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all',
                  showNewForm
                    ? 'bg-brand-start/20 border-brand-start/35 text-brand-start'
                    : 'border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]',
                )}
              >
                <Plus size={13} />新建板块
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { step: '1', label: '业务板块' },
                { step: '2', label: 'Workspace' },
                { step: '3', label: '画布执行' },
              ].map(item => (
                <div key={item.step} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-2 py-2.5 text-center">
                  <div className="mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue/15 border border-accent-blue/25 text-[10px] font-bold text-accent-blue">
                    {item.step}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {showNewForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-brand-start/20 bg-brand-start/[0.04] p-3 space-y-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') createBlankSector(newName, newDesc);
                        if (e.key === 'Escape') { setShowNewForm(false); setNewName(''); setNewDesc(''); }
                      }}
                      placeholder="业务板块名称，如：跨境电商运营"
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2.5 px-3 text-[12px] text-slate-300 focus:border-brand-start/40 outline-none transition-all placeholder:text-slate-700"
                    />
                    <input
                      type="text"
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') createBlankSector(newName, newDesc);
                        if (e.key === 'Escape') { setShowNewForm(false); setNewName(''); setNewDesc(''); }
                      }}
                      placeholder="这个板块要管理哪类业务？"
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2 px-3 text-[11px] text-slate-400 focus:border-brand-start/40 outline-none transition-all placeholder:text-slate-700"
                    />
                    <button
                      onClick={() => createBlankSector(newName, newDesc)}
                      disabled={!newName.trim()}
                      className="w-full py-2.5 bg-brand-start/20 border border-brand-start/30 text-brand-start text-[11px] font-bold rounded-xl hover:bg-brand-start/30 transition-all disabled:opacity-30"
                    >
                      创建业务板块和默认 Workspace
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-4">
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-[11px] font-bold text-white uppercase tracking-widest">业务板块</p>
                  <p className="text-[9px] text-slate-600">能力域 / 模板 / 默认劳动力</p>
                </div>
                <span className="text-[10px] text-slate-700 font-mono">{sectors.length}</span>
              </div>

              {sectors.map((sec, i) => {
                const sb = STATUS_BADGE[sec.status];
                const isActive = activeSector === i;
                const workspaceCount = workspaces.filter((item) => item.businessSectorId === sec.id).length;
                return (
                  <button
                    key={sec.id}
                    onClick={() => loadSector(i)}
                    className={cn(
                      'w-full rounded-2xl border px-3.5 py-3 text-left transition-all',
                      isActive
                        ? 'bg-brand-start/10 border-brand-start/30 shadow-[0_0_18px_rgba(59,130,246,0.12)]'
                        : 'bg-white/[0.025] border-white/[0.06] hover:bg-white/[0.045] hover:border-white/15',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cn('text-[13px] font-bold truncate', isActive ? 'text-white' : 'text-slate-200')}>{sec.name}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5 truncate">{sec.desc}</p>
                      </div>
                      <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0', sb.cls)}>{sb.label}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[9px] text-slate-600">
                      <span>{workspaceCount} 个 Workspace</span>
                      <span className="font-mono">{sec.version}</span>
                    </div>
                  </button>
                );
              })}
            </section>

            <section className="space-y-2.5 pt-3 border-t border-white/[0.07]">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-[11px] font-bold text-white uppercase tracking-widest">Workspace</p>
                  <p className="text-[9px] text-slate-600">当前板块下的项目执行空间</p>
                </div>
                <button
                  onClick={() => setShowNewWorkspaceForm(v => !v)}
                  disabled={!currentSector}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all',
                    showNewWorkspaceForm
                      ? 'bg-accent-blue/20 border-accent-blue/40 text-accent-blue'
                      : 'border-accent-blue/25 text-accent-blue hover:bg-accent-blue/10',
                    !currentSector && 'opacity-40 pointer-events-none',
                  )}
                >
                  <Plus size={12} />新建
                </button>
              </div>

              <AnimatePresence>
                {showNewWorkspaceForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-accent-blue/20 bg-accent-blue/[0.04] p-3 space-y-2">
                      <input
                        type="text"
                        value={newWorkspaceName}
                        onChange={e => setNewWorkspaceName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') createWorkspaceUnderCurrentSector();
                          if (e.key === 'Escape') {
                            setShowNewWorkspaceForm(false);
                            setNewWorkspaceName('');
                            setNewWorkspaceDesc('');
                          }
                        }}
                        placeholder="项目名，如：Q3 亚马逊选品"
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2 px-3 text-[12px] text-slate-300 focus:border-accent-blue/40 outline-none transition-all placeholder:text-slate-700"
                      />
                      <input
                        type="text"
                        value={newWorkspaceDesc}
                        onChange={e => setNewWorkspaceDesc(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') createWorkspaceUnderCurrentSector();
                          if (e.key === 'Escape') {
                            setShowNewWorkspaceForm(false);
                            setNewWorkspaceName('');
                            setNewWorkspaceDesc('');
                          }
                        }}
                        placeholder="项目说明（可选）"
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2 px-3 text-[11px] text-slate-400 focus:border-accent-blue/40 outline-none transition-all placeholder:text-slate-700"
                      />
                      <button
                        onClick={createWorkspaceUnderCurrentSector}
                        disabled={!newWorkspaceName.trim()}
                        className="w-full py-2 bg-accent-blue/15 border border-accent-blue/30 text-accent-blue text-[11px] font-bold rounded-xl hover:bg-accent-blue/25 transition-all disabled:opacity-30"
                      >
                        创建 Workspace
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {currentSectorWorkspaces.map((workspace) => {
                  const isCurrentWorkspace = workspace.id === currentWorkspaceId;
                  const taskCount = taskRuns.filter((task) => task.workspaceId === workspace.id).length;
                  return (
                    <button
                      key={workspace.id}
                      onClick={() => loadWorkspace(workspace)}
                      className={cn(
                        'w-full rounded-2xl border px-3.5 py-3 text-left transition-all',
                        isCurrentWorkspace
                          ? 'bg-accent-blue/10 border-accent-blue/30 shadow-[0_0_18px_rgba(56,189,248,0.12)]'
                          : 'bg-white/[0.025] border-white/[0.06] hover:bg-white/[0.045] hover:border-white/15',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={cn('text-[13px] font-bold truncate', isCurrentWorkspace ? 'text-white' : 'text-slate-300')}>{workspace.name}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5 truncate">{workspace.description || '独立执行空间'}</p>
                        </div>
                        {isCurrentWorkspace && <CheckCircle2 size={13} className="text-accent-blue shrink-0 mt-0.5" />}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {[
                          { label: '节点', val: workspace.canvas.nodes.length },
                          { label: '连线', val: workspace.canvas.edges.length },
                          { label: '任务', val: taskCount },
                        ].map(item => (
                          <div key={item.label} className="rounded-lg bg-white/[0.035] border border-white/[0.05] px-2 py-1 text-center">
                            <p className="text-[11px] font-bold font-mono text-slate-200 leading-none">{item.val}</p>
                            <p className="text-[8px] text-slate-600 mt-0.5">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.015]">
            <p className="text-[10px] text-slate-600 leading-relaxed">
              当前页面只围绕一个 Workspace 工作。数字劳动力在画布底部调度台管理，文件、任务和 Memory 归入右侧上下文。
            </p>
          </div>
        </aside>

        {/* ── Business sectors column ── */}
        <AnimatePresence initial={false}>
          {false && showSectors && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden border-r border-white/[0.06] flex flex-col bg-[#06091a]"
            >
              <div className="w-[280px] flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] shrink-0">
                  <div>
                    <p className="text-[11px] font-bold text-white uppercase tracking-widest">业务板块</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">流水线版本管理</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowNewForm(v => !v)}
                      title="新建业务板块"
                      className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all',
                        showNewForm
                          ? 'bg-brand-start/20 border border-brand-start/30 text-brand-start'
                          : 'text-slate-500 hover:text-white hover:bg-white/[0.06] border border-transparent'
                      )}>
                      <Plus size={12} />新建
                    </button>
                    <button onClick={() => setShowSectors(false)} className="text-slate-600 hover:text-white transition-colors"><X size={13} /></button>
                  </div>
                </div>

                {/* New sector inline form */}
                <AnimatePresence>
                  {showNewForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-white/[0.07] overflow-hidden"
                    >
                      <div className="px-4 py-3 space-y-2.5">
                        {/* Form header with close button */}
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">新建板块</p>
                          <button
                            onClick={() => { setShowNewForm(false); setNewName(''); setNewDesc(''); }}
                            className="p-1 text-slate-600 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
                          >
                            <X size={13} />
                          </button>
                        </div>
                        <input
                          type="text" value={newName} onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') createBlankSector(newName, newDesc);
                            if (e.key === 'Escape') { setShowNewForm(false); setNewName(''); setNewDesc(''); }
                          }}
                          placeholder="板块名称，如：直播电商运营"
                          autoFocus
                          className="w-full bg-white/[0.04] border border-white/8 rounded-xl py-2.5 px-3 text-[12px] text-slate-300 focus:border-brand-start/40 outline-none transition-all placeholder:text-slate-700"
                        />
                        <input
                          type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') createBlankSector(newName, newDesc);
                            if (e.key === 'Escape') { setShowNewForm(false); setNewName(''); setNewDesc(''); }
                          }}
                          placeholder="简要描述（可选）"
                          className="w-full bg-white/[0.04] border border-white/8 rounded-xl py-2 px-3 text-[11px] text-slate-400 focus:border-brand-start/40 outline-none transition-all placeholder:text-slate-700"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => createBlankSector(newName, newDesc)}
                            disabled={!newName.trim()}
                            className="flex-1 py-2 bg-brand-start/20 border border-brand-start/30 text-brand-start text-[11px] font-bold rounded-xl hover:bg-brand-start/30 transition-all disabled:opacity-30 flex items-center justify-center gap-1">
                            <Plus size={11} />创建空白画布
                          </button>
                          <button
                            onClick={() => { if (newName.trim()) { setVegaInput(`帮我创建一个${newName}业务流水线`); setShowNewForm(false); }}}
                            disabled={!newName.trim()}
                            className="flex-1 py-2 bg-white/[0.04] border border-white/10 text-slate-400 text-[11px] font-bold rounded-xl hover:text-white hover:border-white/20 transition-all disabled:opacity-30 flex items-center justify-center gap-1">
                            <Zap size={11} />VEGA 生成
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-700 text-center">按 Esc 关闭 · Enter 快速创建</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="px-3 py-3 border-b border-white/[0.07] shrink-0">
                  <div className="rounded-2xl border border-accent-blue/20 bg-accent-blue/[0.045] p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-accent-blue uppercase tracking-widest">当前 Workspace</p>
                        <p className="text-[13px] font-bold text-white mt-1 truncate">
                          {currentWorkspace?.name ?? '未选择项目空间'}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-0.5 truncate">
                          {currentSector?.name ?? '先选择业务板块'} · 文件 / 任务 / Memory 默认归属这里
                        </p>
                      </div>
                      <button
                        onClick={() => setShowNewWorkspaceForm(v => !v)}
                        disabled={!currentSector}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border shrink-0',
                          showNewWorkspaceForm
                            ? 'bg-accent-blue/20 border-accent-blue/40 text-accent-blue'
                            : 'border-accent-blue/25 text-accent-blue hover:bg-accent-blue/10',
                          !currentSector && 'opacity-40 pointer-events-none',
                        )}
                      >
                        <Plus size={12} />项目
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Nodes', val: currentWorkspace?.canvas.nodes.length ?? 0 },
                        { label: 'Edges', val: currentWorkspace?.canvas.edges.length ?? 0 },
                        { label: 'Runs', val: currentWorkspaceTaskRuns.length },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.035] px-2 py-1.5 text-center">
                          <p className="text-[12px] font-bold font-mono text-white leading-none">{item.val}</p>
                          <p className="text-[8px] text-slate-600 mt-1 uppercase tracking-wider">{item.label}</p>
                        </div>
                      ))}
                    </div>

                    <AnimatePresence>
                      {showNewWorkspaceForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-1">
                            <input
                              type="text"
                              value={newWorkspaceName}
                              onChange={e => setNewWorkspaceName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') createWorkspaceUnderCurrentSector();
                                if (e.key === 'Escape') {
                                  setShowNewWorkspaceForm(false);
                                  setNewWorkspaceName('');
                                  setNewWorkspaceDesc('');
                                }
                              }}
                              placeholder="项目名，如：Q3 亚马逊选品"
                              className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2 px-3 text-[12px] text-slate-300 focus:border-accent-blue/40 outline-none transition-all placeholder:text-slate-700"
                            />
                            <input
                              type="text"
                              value={newWorkspaceDesc}
                              onChange={e => setNewWorkspaceDesc(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') createWorkspaceUnderCurrentSector();
                                if (e.key === 'Escape') {
                                  setShowNewWorkspaceForm(false);
                                  setNewWorkspaceName('');
                                  setNewWorkspaceDesc('');
                                }
                              }}
                              placeholder="项目说明（可选）"
                              className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2 px-3 text-[11px] text-slate-400 focus:border-accent-blue/40 outline-none transition-all placeholder:text-slate-700"
                            />
                            <button
                              onClick={createWorkspaceUnderCurrentSector}
                              disabled={!newWorkspaceName.trim()}
                              className="w-full py-2 bg-accent-blue/15 border border-accent-blue/30 text-accent-blue text-[11px] font-bold rounded-xl hover:bg-accent-blue/25 transition-all disabled:opacity-30 flex items-center justify-center gap-1"
                            >
                              <FolderOpen size={12} />创建 Workspace
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex-1 px-3 py-3 space-y-2.5 overflow-y-auto custom-scrollbar">
                  {sectors.map((sec, i) => {
                    const sb = STATUS_BADGE[sec.status];
                    const isActive = activeSector === i;
                    return (
                      <button key={sec.id} onClick={() => loadSector(i)}
                        className={cn(
                          'w-full text-left rounded-2xl border p-4 transition-all space-y-3',
                          isActive
                            ? 'bg-brand-start/8 border-brand-start/25 shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]'
                        )}>
                        {/* Header: name + status + version */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {isActive && <div className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse shrink-0" />}
                              <p className={cn('text-[13px] font-bold truncate', isActive ? 'text-white' : 'text-slate-200')}>{sec.name}</p>
                            </div>
                            <p className="text-[10px] text-slate-600 truncate">{sec.desc}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded-full border', sb.cls)}>{sb.label}</span>
                            <span className="text-[9px] text-slate-600 font-mono">{sec.version}</span>
                          </div>
                        </div>

                        {/* Agent avatars chain */}
                        <div className="flex items-center gap-1">
                          {sec.agents.map((a, ai) => (
                            <React.Fragment key={a.name}>
                              <div className="relative group/avatar" title={`${a.name} · ${a.role}`}>
                                <img src={a.avatar} className="w-7 h-7 rounded-lg bg-slate-800 border border-white/10" alt={a.name} />
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-900 border border-white/10 px-2 py-1 rounded-lg text-[9px] text-white whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none z-10">
                                  {a.name} · {a.role}
                                </div>
                              </div>
                              {ai < sec.agents.length - 1 && (
                                <ChevronRight size={10} className="text-slate-700 shrink-0" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Pipeline steps */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {sec.steps.map((step, si) => (
                            <React.Fragment key={step}>
                              <span className={cn(
                                'text-[9px] px-2 py-0.5 rounded-full font-mono',
                                si === 0 ? 'bg-accent-auto/10 text-accent-auto/80' :
                                si === sec.steps.length - 1 ? 'bg-emerald-400/10 text-emerald-400/80' :
                                'bg-white/[0.04] text-slate-500'
                              )}>{step}</span>
                              {si < sec.steps.length - 1 && <span className="text-[8px] text-slate-700">›</span>}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Metrics + load button */}
                        <div className="flex items-center justify-between">
                          {sec.metrics ? (
                            <span className="text-[10px] text-slate-600">
                              {sec.metrics.label}：<span className="text-accent-marketplace font-bold font-mono">{sec.metrics.val}</span>
                            </span>
                          ) : <span />}
                          {isActive ? (
                            <span className="flex items-center gap-1 text-[9px] text-brand-start font-bold">
                              <CheckCircle2 size={10} />当前加载
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-600 hover:text-slate-300 transition-colors">加载到画布 →</span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  <div className="pt-3 mt-3 border-t border-white/[0.07] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase tracking-widest">同板块项目</p>
                        <p className="text-[9px] text-slate-600 mt-0.5">切换当前业务板块下的 Workspace</p>
                      </div>
                      <span className="text-[9px] text-slate-700 font-mono">{currentSectorWorkspaces.length}</span>
                    </div>

                    <div className="space-y-2">
                      {currentSectorWorkspaces.length === 0 ? (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center">
                          <p className="text-[11px] text-slate-500">当前板块还没有 Workspace</p>
                        </div>
                      ) : currentSectorWorkspaces.map((workspace) => {
                        const isCurrentWorkspace = workspace.id === currentWorkspaceId;
                        const taskCount = taskRuns.filter((task) => task.workspaceId === workspace.id).length;
                        return (
                          <button
                            key={workspace.id}
                            onClick={() => loadWorkspace(workspace)}
                            className={cn(
                              'w-full text-left rounded-2xl border px-3 py-3 transition-all',
                              isCurrentWorkspace
                                ? 'bg-accent-blue/8 border-accent-blue/25 shadow-[0_0_12px_rgba(56,189,248,0.08)]'
                                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]',
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={cn('text-[12px] font-bold truncate', isCurrentWorkspace ? 'text-white' : 'text-slate-300')}>
                                  {workspace.name}
                                </p>
                                <p className="text-[9px] text-slate-600 mt-0.5 truncate">{workspace.description || '独立执行空间'}</p>
                              </div>
                              <span className={cn(
                                'text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0',
                                workspace.status === 'active'
                                  ? 'bg-status-success/10 border-status-success/25 text-status-success'
                                  : 'bg-white/[0.04] border-white/[0.10] text-slate-500',
                              )}>
                                {workspace.status === 'active' ? 'ACTIVE' : workspace.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2 text-[9px] text-slate-600 font-mono">
                              <span>{workspace.canvas.nodes.length} nodes · {workspace.canvas.edges.length} edges</span>
                              <span>{taskCount} runs</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {currentWorkspace && (
                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">最近任务</p>
                          <span className="text-[9px] text-slate-700">{currentWorkspaceTaskRuns.length}</span>
                        </div>
                        {currentWorkspaceTaskRuns.length === 0 ? (
                          <p className="text-[10px] text-slate-600">还没有任务记录，后续 VEGA 执行会写入这里。</p>
                        ) : (
                          <div className="space-y-1.5">
                            {currentWorkspaceTaskRuns.map((run) => (
                              <div key={run.id} className="flex items-center justify-between gap-2 text-[10px]">
                                <span className="text-slate-400 truncate">{run.title}</span>
                                <span className={cn(
                                  'font-mono shrink-0',
                                  run.status === 'done' ? 'text-status-success' :
                                  run.status === 'error' ? 'text-status-error' :
                                  run.status === 'running' ? 'text-accent-blue' : 'text-slate-600',
                                )}>
                                  {run.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>{/* end w-[280px] */}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Canvas ── */}
        <div className="flex-1 relative overflow-hidden" ref={rfWrapper}>

          {/* React Flow */}
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            onInit={setRfInstance} onDrop={onDrop} onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            fitView fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
            style={{ background: 'transparent' }}
            minZoom={0.2} maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(255,255,255,0.035)" />
            <Controls
              style={{ background: 'rgba(10,13,30,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}
              showInteractive={false}
            />
            <MiniMap
              style={{ background: 'rgba(10,13,30,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}
              nodeColor="rgba(59,130,246,0.35)" maskColor="rgba(6,9,26,0.8)"
            />
          </ReactFlow>

          {/* Product-Shot agent: only the fullscreen viewer is rendered globally;
              the run panel lives inside the VEGA panel back-face below. */}
          <ProductShotViewer />

          <div className="absolute top-4 left-4 right-4 z-10 rounded-2xl border border-white/[0.08] bg-[#08091c]/88 backdrop-blur-xl px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono uppercase tracking-widest">
                  <span>业务板块</span>
                  <ChevronRight size={11} />
                  <span>Workspace</span>
                  <ChevronRight size={11} />
                  <span>画布现场</span>
                </div>
                <div className="mt-1 flex items-center gap-2 min-w-0">
                  <FolderOpen size={15} className="text-accent-blue shrink-0" />
                  <p className="text-sm font-bold text-white truncate">
                    {currentSector?.name ?? '未选择业务板块'} / {currentWorkspace?.name ?? '未选择 Workspace'}
                  </p>
                </div>
                <p className="mt-1 text-[10px] text-slate-600 truncate">
                  画布、文件、任务、Memory 默认沉淀到此 Workspace；数字劳动力作为独立团队被调度。
                </p>
              </div>
              <div className="hidden xl:flex items-center gap-2 shrink-0">
                <span className={cn(
                  'rounded-xl border px-2.5 py-1.5 text-[10px] font-bold',
                  workspaceSync === 'saved' || workspaceSync === 'remote'
                    ? 'border-status-success/25 bg-status-success/10 text-status-success'
                    : workspaceSync === 'saving'
                    ? 'border-accent-blue/25 bg-accent-blue/10 text-accent-blue'
                    : 'border-white/[0.10] bg-white/[0.04] text-slate-500',
                )}>
                  {workspaceSync === 'saving' ? '保存中' : workspaceSync === 'error' ? '同步异常' : '已连接 Workspace'}
                </span>
                <button className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all">
                  上传资料
                </button>
                <button className="rounded-xl border border-accent-blue/25 bg-accent-blue/12 px-3 py-1.5 text-[10px] font-bold text-accent-blue hover:bg-accent-blue/18 transition-all">
                  运行任务
                </button>
              </div>
            </div>
          </div>

          <motion.div
            layout
            transition={dockLayoutTransition}
            className={cn(
              'absolute left-1/2 bottom-5 z-10 -translate-x-1/2 transition-[width] duration-300',
              dockDetailOpen ? 'w-[min(860px,calc(100%-48px))]' : 'w-[min(760px,calc(100%-48px))]',
            )}
          >
            <motion.div
              layout
              transition={dockLayoutTransition}
              className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full border border-emerald-400/15 bg-[#06130f]/80 px-3 py-1.5 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.32)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">数字劳动力调度台</span>
              <span className="text-[9px] font-bold text-slate-500">
                当前团队 {WORKFORCE.length} · {dockDetailOpen ? '详情管理' : '拖拽分配'}
              </span>
              <button
                onClick={() => setDockDetailOpen(v => !v)}
                className={cn(
                  'ml-1 rounded-full border px-2 py-0.5 text-[9px] font-bold transition-all',
                  dockDetailOpen
                    ? 'border-accent-blue/25 bg-accent-blue/12 text-accent-blue hover:bg-accent-blue/18'
                    : 'border-white/[0.10] bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]',
                )}
              >
                {dockDetailOpen ? '收起' : '详情'}
              </button>
              <button
                onClick={() => navigate('/app', { state: { tab: 'marketplace' } })}
                className="ml-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300 hover:bg-emerald-400/18 transition-all"
              >
                招募
              </button>
            </motion.div>

            <motion.div
              layout
              transition={dockLayoutTransition}
              className={cn(
                'relative mx-auto flex rounded-[28px] border border-white/[0.10] bg-[#06130f]/82 backdrop-blur-2xl shadow-[0_22px_58px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] custom-scrollbar',
                dockDetailOpen
                  ? 'w-full max-h-[248px] flex-wrap items-stretch justify-center gap-3 overflow-x-hidden overflow-y-auto px-4 pb-4 pt-5'
                  : 'w-fit max-w-full items-end justify-center gap-2 overflow-x-auto px-4 pb-3 pt-4',
              )}
              onMouseLeave={() => setDockHoverIndex(null)}
            >
              <div className="pointer-events-none absolute inset-x-6 bottom-1 h-px bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent" />
              {WORKFORCE.map((w, index) => {
                const s = KIND_STYLE[w.kind];
                const distance = dockHoverIndex === null ? 4 : Math.abs(dockHoverIndex - index);
                const scale = dockDetailOpen ? 1 : distance === 0 ? 1.34 : distance === 1 ? 1.18 : distance === 2 ? 1.06 : 1;
                const lift = dockDetailOpen ? 0 : distance === 0 ? -18 : distance === 1 ? -9 : distance === 2 ? -3 : 0;
                const showLabel = dockHoverIndex === index;

                return (
                  <motion.div
                    layout
                    key={w.id}
                    draggable
                    onMouseEnter={() => setDockHoverIndex(index)}
                    onDragStart={e => onDragStart(e as unknown as DragEvent, w.id)}
                    animate={{ scale, y: lift }}
                    transition={dockLayoutTransition}
                    className={cn(
                      'group relative shrink-0 cursor-grab rounded-2xl border border-white/[0.10] bg-white/[0.055] shadow-[0_10px_24px_rgba(0,0,0,0.28)] active:cursor-grabbing',
                      dockDetailOpen
                        ? 'flex h-[88px] basis-[190px] items-center gap-3 px-3 text-left hover:border-emerald-400/25 hover:bg-white/[0.075]'
                        : 'flex h-[58px] w-[58px] items-center justify-center',
                    )}
                    title={`${w.name} · ${w.role} · 拖到画布中分配任务`}
                  >
                    <AnimatePresence>
                      {showLabel && !dockDetailOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.94 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.14 }}
                          className="pointer-events-none absolute -top-14 left-1/2 w-max -translate-x-1/2 rounded-2xl border border-white/[0.10] bg-[#050a12]/92 px-3 py-2 text-center shadow-[0_14px_28px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                        >
                          <p className="text-[11px] font-black text-white">{w.name}</p>
                          <p className="mt-0.5 text-[9px] text-slate-500">{w.role}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.img
                      layout
                      transition={dockLayoutTransition}
                      src={w.avatar}
                      className={cn(
                        'rounded-xl border border-white/10 bg-slate-800 object-cover shadow-[0_8px_18px_rgba(0,0,0,0.30)]',
                        dockDetailOpen ? 'h-12 w-12 shrink-0' : 'h-11 w-11',
                      )}
                      alt={w.name}
                    />
                      <motion.div
                        key="detail"
                        layout
                        aria-hidden={!dockDetailOpen}
                        animate={{
                          opacity: dockDetailOpen ? 1 : 0,
                          width: dockDetailOpen ? 106 : 0,
                          x: dockDetailOpen ? 0 : -6,
                          filter: dockDetailOpen ? 'blur(0px)' : 'blur(3px)',
                        }}
                        transition={dockLayoutTransition}
                        className="min-w-0 overflow-hidden"
                      >
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[12px] font-black text-white">{w.name}</p>
                          <motion.span
                            layout
                            className={cn('shrink-0 rounded-full border px-1.5 py-0.5 text-[7px] font-black', s.badge)}
                          >
                            {w.roi}
                          </motion.span>
                        </div>
                        <p className="mt-1 truncate text-[9px] text-slate-500">{w.role}</p>
                        <div className="mt-2 flex items-center gap-1.5 text-[8px] font-bold text-slate-600">
                          <span className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            w.status === 'active' ? 'bg-status-success' :
                            w.status === 'processing' ? 'bg-accent-auto' : 'bg-slate-600',
                          )} />
                          <span>{w.status === 'active' ? '可立即调度' : w.status === 'processing' ? '执行中' : '待命'}</span>
                        </div>
                      </motion.div>
                    <motion.div layout className={cn(
                      'absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#07111b]',
                      w.status === 'active' ? 'bg-status-success shadow-[0_0_8px_rgba(16,185,129,0.85)]' :
                      w.status === 'processing' ? 'bg-accent-auto shadow-[0_0_8px_rgba(14,165,233,0.85)]' : 'bg-slate-600',
                    )} />
                    <AnimatePresence initial={false}>
                      {!dockDetailOpen && (
                        <motion.span
                          key="compact-roi"
                          initial={{ opacity: 0, y: 4, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.9 }}
                          transition={{ duration: 0.14 }}
                          className={cn('absolute -bottom-2 rounded-full border px-1.5 py-0.5 text-[7px] font-black shadow-lg', s.badge)}
                          title="ROI / 绩效标签"
                        >
                          {w.roi}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              <motion.button
                layout
                type="button"
                onClick={() => navigate('/app', { state: { tab: 'marketplace' } })}
                onMouseEnter={() => setDockHoverIndex(WORKFORCE.length)}
                animate={{
                  scale: dockDetailOpen ? 1 : dockHoverIndex === WORKFORCE.length ? 1.24 : dockHoverIndex === WORKFORCE.length - 1 ? 1.08 : 1,
                  y: dockDetailOpen ? 0 : dockHoverIndex === WORKFORCE.length ? -12 : 0,
                }}
                transition={dockLayoutTransition}
                className={cn(
                  'relative shrink-0 border border-dashed border-emerald-300/25 bg-emerald-300/[0.045] text-emerald-200 shadow-[0_10px_24px_rgba(0,0,0,0.25)] hover:border-emerald-300/45 hover:bg-emerald-300/[0.075]',
                  dockDetailOpen
                    ? 'flex h-[88px] basis-[190px] items-center gap-3 rounded-2xl px-3 text-left'
                    : 'flex h-[58px] w-[58px] items-center justify-center rounded-2xl',
                )}
                title="添加数字劳动力到当前 Workspace"
              >
                <div className={cn(
                  'flex items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-300/10',
                  dockDetailOpen ? 'h-12 w-12 shrink-0' : 'h-11 w-11',
                )}>
                  <Plus size={dockDetailOpen ? 22 : 20} />
                </div>
                  <motion.div
                    key="add-detail"
                    layout
                    aria-hidden={!dockDetailOpen}
                    animate={{
                      opacity: dockDetailOpen ? 1 : 0,
                      width: dockDetailOpen ? 106 : 0,
                      x: dockDetailOpen ? 0 : -6,
                      filter: dockDetailOpen ? 'blur(0px)' : 'blur(3px)',
                    }}
                    transition={dockLayoutTransition}
                    className="min-w-0 overflow-hidden"
                  >
                    <p className="text-[12px] font-black text-white">添加席位</p>
                    <p className="mt-1 text-[9px] text-slate-500">从人才市场招募，或绑定已有数字劳动力</p>
                    <p className="mt-2 text-[8px] font-bold text-emerald-300">打开配置入口</p>
                  </motion.div>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* VEGA / Agent 浮层 — 可拖动 + 可调整大小 + 翻转 */}
          <AnimatePresence>
            {showVEGA && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute z-20 select-none"
                style={
                  panelPos.x === -1
                    ? { bottom: 20, right: 20, width: panelSize.w, height: panelSize.h }
                    : { left: panelPos.x, top: panelPos.y, width: panelSize.w, height: panelSize.h, bottom: 'auto', right: 'auto' }
                }
              >
                {/* 3D flip container */}
                <div style={{ perspective: 1400, width: '100%', height: '100%' }}>
                  <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                    style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%', position: 'relative' }}
                  >
                    {/* ── FRONT: VEGA COO ── */}
                    <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}>
                      <div className="w-full h-full bg-[#08091c]/99 backdrop-blur-2xl border border-accent-blue/20 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
                        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(56,189,248,0.12), inset 0 1px 0 rgba(56,189,248,0.08)' }}>

                        {/* ── Header ── */}
                        <div
                          className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] cursor-grab active:cursor-grabbing shrink-0"
                          style={{ background: 'linear-gradient(to bottom, rgba(56,189,248,0.06), transparent)' }}
                          onMouseDown={onPanelDragStart}
                        >
                          <div className="flex items-center gap-3.5">
                            {/* VEGA icon — larger */}
                            <div className="w-9 h-9 rounded-xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
                              <VegaIcon size={20} active />
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5 mb-0.5">
                                <span className="text-base font-bold text-white tracking-wide">VEGA</span>
                                <span className="text-xs text-slate-400">数字 COO</span>
                                <span className="text-[10px] text-slate-600 hidden sm:block">· 流水线调度</span>
                              </div>
                              <p className="text-[11px] text-slate-600">点击画布节点可切换到对应 Agent 视图</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3" data-no-drag="true">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-status-success/10 border border-status-success/20 rounded-lg">
                              <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
                              <span className="text-[11px] text-status-success font-bold font-mono">在线</span>
                            </div>
                            <button onClick={() => setShowVEGA(false)}
                              className="p-1.5 text-slate-600 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all">
                              <X size={15} />
                            </button>
                          </div>
                        </div>

                        {/* ── Messages ── */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4" data-no-drag="true">
                          {messages.map((m, i) => (
                            <div key={i} className={cn(
                              m.role === 'boss' ? 'flex justify-end' : 'flex items-start gap-3'
                            )}>
                              {m.role === 'vega' && (
                                <div className="w-7 h-7 rounded-xl bg-accent-blue/15 border border-accent-blue/25 flex items-center justify-center shrink-0 mt-0.5">
                                  <VegaIcon size={14} active />
                                </div>
                              )}
                              <div className={cn(
                                'max-w-[86%] rounded-2xl leading-relaxed',
                                m.role === 'system'
                                  ? 'w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.07] text-slate-500 text-xs font-mono text-center rounded-xl'
                                  : m.role === 'vega'
                                  ? 'px-4 py-3 bg-gradient-to-br from-brand-start/12 to-accent-blue/6 border border-brand-start/20 text-slate-200 rounded-bl-sm'
                                  : 'px-4 py-3 bg-accent-blue/25 border border-accent-blue/35 text-white rounded-br-sm'
                              )}>
                                {m.role === 'vega' && (
                                  <span className="block text-[10px] font-bold text-accent-blue uppercase tracking-[0.15em] mb-1.5">VEGA</span>
                                )}
                                <p className="text-sm leading-relaxed">{m.text}</p>
                              </div>
                            </div>
                          ))}

                          {/* Thinking indicator */}
                          {vegaThinking && (
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-xl bg-accent-blue/15 border border-accent-blue/25 flex items-center justify-center shrink-0">
                                <VegaIcon size={14} active />
                              </div>
                              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-brand-start/10 to-transparent border border-brand-start/15 rounded-2xl rounded-bl-sm">
                                {[0,1,2].map(j => (
                                  <motion.div key={j}
                                    animate={{ opacity:[0.3,1,0.3], scale:[0.7,1,0.7] }}
                                    transition={{ repeat:Infinity, duration:1.2, delay:j*0.2 }}
                                    className="w-2 h-2 rounded-full bg-accent-blue" />
                                ))}
                                <span className="text-xs text-slate-500 ml-1">VEGA 正在思考...</span>
                              </div>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>

                        {/* ── Input ── */}
                        <div className="px-5 pb-5 pt-3 space-y-3 border-t border-white/[0.08] shrink-0" data-no-drag="true">
                          <div className="relative">
                            <input type="text" value={vegaInput}
                              onChange={e => setVegaInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && sendToVega()}
                              placeholder="向 VEGA 下达流水线指令，或描述业务目标..."
                              className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl py-3.5 pl-4 pr-12 text-sm text-slate-200 focus:border-brand-start/50 focus:bg-white/[0.07] outline-none transition-all placeholder:text-slate-600" />
                            <button onClick={sendToVega} disabled={!vegaInput.trim()}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg bg-brand-start/20 text-brand-start hover:bg-brand-start/35 disabled:opacity-30 transition-all">
                              <Send size={14} />
                            </button>
                          </div>
                          <button className="w-full py-3 bg-gradient-to-r from-brand-start/20 via-accent-blue/15 to-brand-start/20 border border-brand-start/30 rounded-xl text-sm font-bold text-brand-start hover:from-brand-start/30 hover:to-accent-blue/25 transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(59,130,246,0.1)]">
                            <Zap size={14} />
                            从研报 / 文章生成工作流（Text-to-Workflow）
                          </button>
                        </div>

                        {/* Resize handle */}
                        <div className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end pb-1.5 pr-1.5 opacity-25 hover:opacity-60 transition-opacity"
                          onMouseDown={onResizeStart} data-no-drag="true">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* ── BACK: Agent Context ── */}
                    <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}>
                      <div className="w-full h-full bg-[#080c1e]/98 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden">
                        {productAgentActive ? (
                          <>
                            {/* Toolbar: drag area on the left, window controls on the right.
                                Separated from RunPanel's hero strip to avoid the cramped layout. */}
                            <div className="relative shrink-0 h-9 border-b border-white/[0.06]
                                            bg-gradient-to-r from-violet-500/8 via-fuchsia-500/4 to-transparent
                                            flex items-center">
                              <div className="flex-1 h-full cursor-grab active:cursor-grabbing"
                                   onMouseDown={onPanelDragStart} />
                              <div className="flex items-center gap-1 px-2" data-no-drag="true">
                                <button
                                  onClick={toggleMaximize}
                                  title={panelMaximized ? '还原大小' : '最大化'}
                                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                                >
                                  {panelMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                                </button>
                                <div className="w-px h-4 bg-white/10 mx-1" />
                                <button
                                  onClick={() => {
                                    if (panelMaximized) toggleMaximize();
                                    setFlipped(false);
                                    setProductAgentActive(false);
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1 text-[10.5px] font-bold
                                             text-slate-300 hover:text-white
                                             bg-white/[0.04] hover:bg-white/[0.10]
                                             border border-white/10 rounded-md transition-colors"
                                >
                                  <ChevronLeft size={11} /> VEGA
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 min-h-0">
                              <ProductShotRunPanel />
                            </div>
                            {/* Resize handle (mirrors the one on the pipeline back face) */}
                            <div className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize
                                            flex items-end justify-end pb-1 pr-1 opacity-30 hover:opacity-70 transition-opacity"
                                 onMouseDown={onResizeStart} data-no-drag="true">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M9 1L1 9M9 5L5 9M9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </div>
                          </>
                        ) : (
                        <>
                        {/* Header */}
                        <div
                          className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] cursor-grab active:cursor-grabbing shrink-0"
                          onMouseDown={onPanelDragStart}
                        >
                          <div className="flex items-center gap-3">
                            {activeAgent && (
                              <>
                                <div className={cn('relative w-9 h-9 rounded-xl overflow-hidden border-2 shrink-0', KIND_STYLE[activeAgent.kind]?.border ?? 'border-white/20')}>
                                  <img src={activeAgent.avatar as string} className="w-full h-full bg-slate-800" alt={activeAgent.agentName} />
                                  <div className={cn('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#080c1e]', STATUS_DOT[activeAgent.status])} />
                                </div>
                                <div>
                                  <span className="text-[13px] font-bold text-white">{activeAgent.agentName}</span>
                                  <span className={cn('text-[10px] ml-2', KIND_STYLE[activeAgent.kind]?.header ?? 'text-slate-400')}>{activeAgent.agentRole}</span>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2" data-no-drag="true">
                            <button onClick={() => setFlipped(false)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:text-white bg-white/[0.04] border border-white/8 rounded-lg transition-all">
                              <VegaIcon size={11} />返回 VEGA
                            </button>
                            <button onClick={() => setShowVEGA(false)} className="text-slate-600 hover:text-white transition-colors"><X size={13} /></button>
                          </div>
                        </div>

                        {/* Agent detail body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4" data-no-drag="true">
                          {activeAgent && (
                            <>
                              {/* Params */}
                              {activeAgent.params && (activeAgent.params as {key:string;val:string|number}[]).length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                  {(activeAgent.params as {key:string;val:string|number}[]).map(p => (
                                    <div key={p.key} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                                      <p className="text-[9px] text-slate-600 font-mono uppercase mb-0.5">{p.key}</p>
                                      <p className="text-[13px] font-bold text-white font-mono">{p.val}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Recent tasks */}
                              <div>
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-2">最近输出</p>
                                <div className="space-y-1.5">
                                  {[
                                    { time: '2m ago', text: `${activeAgent.agentName}完成了一项任务输出，等待确认。` },
                                    { time: '15m ago', text: '上一次任务已成功完成并存档。' },
                                  ].map((t, i) => (
                                    <div key={i} className="flex gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                                      <span className="text-[10px] text-slate-600 font-mono shrink-0">{t.time}</span>
                                      <p className="text-[11px] text-slate-400 flex-1">{t.text}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Agent input */}
                        <div className="px-5 pb-4 pt-2 border-t border-white/[0.07] shrink-0" data-no-drag="true">
                          <div className="relative">
                            <input type="text" value={agentInput}
                              onChange={e => setAgentInput(e.target.value)}
                              placeholder={`给${activeAgent?.agentName ?? 'Agent'}下达指令...`}
                              className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl py-3 pl-4 pr-11 text-[12px] text-slate-300 focus:border-accent-manual/40 outline-none transition-all placeholder:text-slate-700" />
                            <button disabled={!agentInput.trim()}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-manual hover:opacity-80 disabled:opacity-30">
                              <Send size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Resize handle */}
                        <div className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end pb-1 pr-1 opacity-30 hover:opacity-70 transition-opacity"
                          onMouseDown={onResizeStart} data-no-drag="true">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M9 1L1 9M9 5L5 9M9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </div>
                        </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* VEGA closed: no floating button — handled by TopBar VEGA button */}

        </div>

        {/* ── Right: Workspace context drawer ── */}
        <aside
          className="bg-[#06091a] border-l border-white/[0.06] flex flex-col shrink-0 overflow-hidden"
          style={{ width: 'clamp(280px, 22vw, 340px)' }}
        >
          <div className="px-4 py-4 border-b border-white/[0.06]">
            <p className="text-[14px] font-bold text-white">Workspace 上下文</p>
            <p className="text-[11px] text-slate-500 mt-0.5">只管理文件、任务、Memory 和节点属性</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-4">
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="mb-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.035] px-3 py-2">
                <p className="text-[10px] font-bold text-emerald-300">数字劳动力不放在这里</p>
                <p className="mt-0.5 text-[9px] text-slate-600">它属于画布底部调度台，作为团队成员被分配和考核。</p>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-bold text-white uppercase tracking-widest">当前项目</p>
                  <p className="text-[10px] text-slate-600 mt-0.5 truncate">{currentWorkspace?.name ?? '未选择 Workspace'}</p>
                </div>
                <span className={cn(
                  'text-[8px] font-bold px-1.5 py-0.5 rounded-full border',
                  currentWorkspace?.status === 'active'
                    ? 'bg-status-success/10 border-status-success/25 text-status-success'
                    : 'bg-white/[0.04] border-white/[0.10] text-slate-500',
                )}>
                  {currentWorkspace?.status?.toUpperCase() ?? 'NONE'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '文件', val: currentWorkspace?.fileIds.length ?? 0 },
                  { label: '任务', val: currentWorkspaceTaskRuns.length },
                  { label: '记忆', val: currentWorkspace?.memoryIds.length ?? 0 },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-white/[0.05] bg-white/[0.035] px-2 py-2 text-center">
                    <p className="text-[13px] font-bold font-mono text-white leading-none">{item.val}</p>
                    <p className="text-[9px] text-slate-600 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-[11px] font-bold text-white uppercase tracking-widest">文件与 Memory</p>
                  <p className="text-[9px] text-slate-600">后续上传的资料会归属当前 Workspace</p>
                </div>
                <span className="text-[9px] text-slate-700 font-mono">
                  {(currentWorkspace?.fileIds.length ?? 0) + (currentWorkspace?.memoryIds.length ?? 0)}
                </span>
              </div>
              <div className="mt-3 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-3 py-4 text-center">
                <p className="text-[10px] text-slate-600">文件上传入口会放在这里</p>
                <p className="mt-1 text-[9px] text-slate-700">brief / asset / report / knowledge</p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-white uppercase tracking-widest">最近任务</p>
                <span className="text-[9px] text-slate-700">{currentWorkspaceTaskRuns.length}</span>
              </div>
              {currentWorkspaceTaskRuns.length === 0 ? (
                <p className="text-[10px] text-slate-600 leading-relaxed">还没有任务记录。向 VEGA 下达目标后，TaskRun 会沉淀到当前 Workspace。</p>
              ) : (
                <div className="space-y-2">
                  {currentWorkspaceTaskRuns.map(run => (
                    <div key={run.id} className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-slate-300 truncate">{run.title}</p>
                        <span className={cn(
                          'text-[9px] font-mono shrink-0',
                          run.status === 'done' ? 'text-status-success' :
                          run.status === 'error' ? 'text-status-error' :
                          run.status === 'running' ? 'text-accent-blue' : 'text-slate-600',
                        )}>
                          {run.status}
                        </span>
                      </div>
                      <p className="text-[8px] text-slate-700 mt-1 font-mono truncate">{run.threadId ?? run.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
