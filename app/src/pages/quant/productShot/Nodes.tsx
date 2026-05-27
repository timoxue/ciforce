/**
 * Product-Shot custom node types (xyflow custom nodes).
 *
 * Three node kinds wired up in one file so xyflow can register them together:
 *   - AgentNode     : the runnable agent ("产品摄影师"). Click → open drawer.
 *   - LogNode       : live event stream from the most recent run.
 *   - WorkitemNode  : current version preview + version badges.
 */
import React, { useEffect, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles, Image as ImageIcon, Heart, ChevronRight, Loader2 } from 'lucide-react';
import { useProductShotStore } from './store';

// ─── Agent Node ──────────────────────────────────────────────────────────────

export function AgentNode(_p: NodeProps) {
  const isRunning = useProductShotStore(s =>
    s.runs.some(r => r.status === 'running'),
  );
  const requestAgent = useProductShotStore(s => s.requestAgent);
  const draftParams = useProductShotStore(s => s.draftParams);

  return (
    <div onClick={requestAgent}
         className="group relative w-[260px] cursor-pointer"
         role="button">
      {/* Outer glow when running */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            key="pulse"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: [0.45, 0.8, 0.45], scale: [1, 1.05, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -inset-2 rounded-3xl"
            style={{ background: 'radial-gradient(closest-side, rgba(168,85,247,0.30), transparent 70%)' }}
          />
        )}
      </AnimatePresence>

      <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl
                      bg-gradient-to-br from-violet-500/12 via-fuchsia-500/8 to-pink-500/12
                      border border-violet-400/30 shadow-[0_8px_30px_-12px_rgba(168,85,247,0.5)]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5 border-b border-white/8">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500
                            flex items-center justify-center shadow-lg">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full
                            bg-emerald-400 border-2 border-slate-950" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-white truncate">产品摄影师</div>
            <div className="text-[10px] font-medium text-violet-200/70 uppercase tracking-wider">
              dashscope · wanx-v2
            </div>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold
                           bg-violet-400/15 border border-violet-400/30 text-violet-200">
            AGENT
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2">
          <div className="text-[11px] text-slate-300 leading-relaxed">
            上传商品图 + 一句话描述场景，得到广告级宣传图
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Pill>{draftParams.scene}</Pill>
            <Pill>{draftParams.ratio}</Pill>
            <Pill>×{draftParams.variants}</Pill>
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 pb-3.5">
          <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg
                           transition-all duration-200
                           ${isRunning
                             ? 'bg-violet-500/30 border border-violet-400/40'
                             : 'bg-white/5 border border-white/10 group-hover:bg-violet-500/20 group-hover:border-violet-400/40'}`}>
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Loader2 size={14} className="text-violet-200 animate-spin" />
              ) : (
                <Play size={13} className="text-violet-200 fill-violet-200" />
              )}
              <span className="text-[12px] font-semibold text-white">
                {isRunning ? '生成中...' : '配置并运行'}
              </span>
            </div>
            <ChevronRight size={14} className="text-violet-200/70 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* xyflow handles: input from upstream (商品图源), output to log+workitem */}
      <Handle type="target" position={Position.Left}
              style={{ background: '#a78bfa', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right}
              style={{ background: '#f0abfc', width: 8, height: 8 }} />
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-md
                     bg-white/5 border border-white/10 text-slate-300 font-medium">
      {children}
    </span>
  );
}

// ─── Log Node ────────────────────────────────────────────────────────────────

const LEVEL_STYLE = {
  info: { dot: 'bg-slate-400', text: 'text-slate-300' },
  work: { dot: 'bg-cyan-400 animate-pulse', text: 'text-cyan-200' },
  ok:   { dot: 'bg-emerald-400', text: 'text-emerald-200' },
  warn: { dot: 'bg-amber-400', text: 'text-amber-200' },
} as const;

export function LogNode(_p: NodeProps) {
  const logs = useProductShotStore(s => s.logs);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [logs.length]);

  const visible = logs.slice(-14); // keep node bounded

  return (
    <div className="w-[300px] rounded-2xl overflow-hidden backdrop-blur-xl
                    bg-slate-950/70 border border-cyan-400/25
                    shadow-[0_8px_30px_-12px_rgba(34,211,238,0.4)]">
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-bold text-white tracking-wider">运行日志</span>
        </div>
        <span className="text-[9px] text-cyan-200/60 font-mono">
          {logs.length.toString().padStart(3, '0')} events
        </span>
      </div>
      <div ref={bodyRef}
           className="h-[200px] overflow-y-auto custom-scrollbar px-3.5 py-2 space-y-1.5
                      font-mono text-[10.5px] leading-relaxed">
        {visible.length === 0 && (
          <div className="text-slate-600 italic text-[10px]">等待 agent 启动...</div>
        )}
        <AnimatePresence initial={false}>
          {visible.map((l, i) => {
            const style = LEVEL_STYLE[l.level];
            return (
              <motion.div
                key={`${l.ts}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-2"
              >
                <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                <span className={`flex-1 ${style.text}`}>{l.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <Handle type="target" position={Position.Left}
              style={{ background: '#22d3ee', width: 8, height: 8 }} />
    </div>
  );
}

// ─── Workitem Node ───────────────────────────────────────────────────────────

export function WorkitemNode(_p: NodeProps) {
  const versions       = useProductShotStore(s => s.versions);
  const activeId       = useProductShotStore(s => s.activeVersionId);
  const openViewer     = useProductShotStore(s => s.openViewer);
  const selectVersion  = useProductShotStore(s => s.selectVersion);
  const toggleLike     = useProductShotStore(s => s.toggleLike);

  const active = versions.find(v => v.id === activeId) ?? versions[versions.length - 1];
  const hasContent = !!active;

  return (
    <div className="w-[300px] rounded-2xl overflow-hidden backdrop-blur-xl
                    bg-gradient-to-br from-emerald-500/12 via-teal-500/8 to-cyan-500/12
                    border border-emerald-400/30
                    shadow-[0_8px_30px_-12px_rgba(16,185,129,0.45)]">
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-white/8">
        <div className="flex items-center gap-2">
          <ImageIcon size={12} className="text-emerald-300" />
          <span className="text-[11px] font-bold text-white tracking-wider">成果（WORKITEM）</span>
        </div>
        {hasContent && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleLike(active.id); }}
            className="p-1 rounded hover:bg-white/8 transition-colors"
          >
            <Heart size={12}
                   className={active.liked
                     ? 'fill-pink-400 text-pink-400'
                     : 'text-slate-500 hover:text-pink-300'} />
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="px-3.5 pt-3 pb-2">
        {!hasContent && (
          <div className="aspect-square rounded-xl border border-dashed border-white/10
                          bg-white/[0.02] flex items-center justify-center">
            <span className="text-[10.5px] text-slate-600">
              暂无产出，点击 agent 运行
            </span>
          </div>
        )}
        {hasContent && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={() => openViewer(active.id)}
            className="cursor-zoom-in rounded-xl overflow-hidden bg-slate-900
                       border border-white/8 hover:border-emerald-400/50 transition-colors"
          >
            <div className="grid grid-cols-3 gap-px bg-white/5">
              {active.images.slice(0, 3).map((src, i) => (
                <div key={i} className="aspect-square bg-slate-900 overflow-hidden">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="px-3 py-2 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">
                v{versions.findIndex(v => v.id === active.id) + 1} · {active.scene} · {active.ratio}
              </span>
              <span className="text-emerald-300 font-medium">查看 →</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Version strip */}
      {versions.length > 0 && (
        <div className="px-3.5 pb-3 flex items-center gap-1 overflow-x-auto custom-scrollbar">
          {versions.map((v, i) => (
            <button
              key={v.id}
              onClick={(e) => { e.stopPropagation(); selectVersion(v.id); }}
              className={`shrink-0 text-[9.5px] px-1.5 py-0.5 rounded font-mono
                          border transition-colors
                          ${active && v.id === active.id
                            ? 'bg-emerald-400/20 border-emerald-400/50 text-emerald-200'
                            : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'}`}
            >
              v{i + 1}{v.liked ? ' ♥' : ''}
            </button>
          ))}
        </div>
      )}

      <Handle type="target" position={Position.Left}
              style={{ background: '#34d399', width: 8, height: 8 }} />
    </div>
  );
}
