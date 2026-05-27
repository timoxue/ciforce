import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, SlidersHorizontal, TrendingUp, Star,
  ArrowUpRight, Zap, UserPlus, GitCompare, X, ChevronDown,
  Sparkles, Trophy, Package, Check, Users, ShoppingBag,
  PenLine, ChevronRight, ChevronLeft, Cpu,
} from 'lucide-react';
import { marketplaceAgents } from '../../mocks/fixtures';
import { useMarketplaceStore, useAgentStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import AgentDrawer from './AgentDrawer';
import HireModal from './HireModal';
import type { AgentCategory } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: AgentCategory[] = ['电商营销', '短视频', '数据挖掘', '创意设计', '客户服务', '办公自动化', '多语言'];

const SECTIONS = [
  { id: 'starter',     label: '新手必备三件套', icon: <Package size={13} />,   accent: 'text-accent-auto',        dot: 'bg-accent-auto',        ids: ['agent-1', 'agent-2', 'agent-3'] },
  { id: 'recommended', label: '为你推荐',       icon: <Sparkles size={13} />,  accent: 'text-accent-marketplace', dot: 'bg-accent-marketplace', ids: ['agent-1', 'agent-4', 'agent-5'] },
  { id: 'high-roi',    label: '本周高回报',     icon: <Trophy size={13} />,    accent: 'text-status-success',     dot: 'bg-status-success',     ids: ['agent-3', 'agent-5', 'agent-1'] },
  { id: 'new',         label: '新上架',         icon: <TrendingUp size={13} />,accent: 'text-yellow-400',         dot: 'bg-yellow-400',         ids: ['agent-5', 'agent-4'] },
];

const SORT_OPTIONS = [
  { value: 'roi',    label: 'ROI 最高' },
  { value: 'price',  label: '价格最低' },
  { value: 'rating', label: '口碑最佳' },
  { value: 'hired',  label: '入职最多' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          size={11}
          className={i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}
        />
      ))}
      <span className="text-[11px] text-slate-300 ml-1 font-mono font-bold">{rating.toFixed(1)}</span>
    </div>
  );
}

function AgentCard({ agent, index }: { agent: typeof marketplaceAgents[0]; index: number }) {
  const { openAgentDrawer, addToCompare, openHireModal, compareList } = useMarketplaceStore();
  const { hiredAgents } = useAgentStore();
  const inCompare = compareList.includes(agent.id);
  const isHired = hiredAgents.some(a => a.id === agent.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'group relative flex flex-col rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden',
        isHired
          ? 'bg-status-success/4 border-status-success/25 hover:border-status-success/40'
          : 'bg-slate-900/50 border-white/6 hover:border-accent-marketplace/40 hover:bg-slate-900/70'
      )}
      onClick={() => openAgentDrawer(agent.id)}
    >
      {/* Badges row */}
      <div className="absolute top-2.5 left-2.5 flex gap-1 z-10">
        {agent.isTrending && (
          <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-status-warning/15 border border-status-warning/30 text-status-warning text-[10px] font-bold uppercase">
            <TrendingUp size={9} />热
          </span>
        )}
        {agent.isNew && (
          <span className="px-2 py-0.5 rounded-md bg-brand-start/15 border border-brand-start/30 text-brand-start text-[10px] font-bold uppercase">NEW</span>
        )}
        {isHired && (
          <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-status-success/15 border border-status-success/30 text-status-success text-[10px] font-bold">
            <Check size={9} />在职
          </span>
        )}
      </div>

      {/* Compare dot */}
      {inCompare && (
        <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-accent-marketplace rounded-full shadow-[0_0_6px_rgba(139,92,246,0.8)] z-10" />
      )}

      <div className="p-4 pt-8">
        {/* Avatar + provider verified */}
        <div className="flex items-start justify-between mb-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
              <img src={agent.avatar} className="w-full h-full bg-slate-800" alt={agent.name} />
            </div>
            {agent.provider?.verified && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent-blue rounded-full flex items-center justify-center border border-slate-950">
                <Check size={8} className="text-white" />
              </div>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); openAgentDrawer(agent.id); }}
            className="text-slate-700 hover:text-accent-marketplace transition-colors"
          >
            <ArrowUpRight size={16} />
          </button>
        </div>

        {/* Name + role */}
        <h3 className={cn('text-base font-bold mb-1 transition-colors leading-tight', isHired ? 'text-status-success' : 'text-white group-hover:text-accent-marketplace')}>
          {agent.name}
        </h3>
        <p className="text-[12px] text-slate-400 mb-3 leading-snug">{agent.role}</p>

        {/* Rating */}
        <div className="flex items-center justify-between mb-3">
          <StarRating rating={agent.rating} />
          <span className="text-[10px] text-slate-500 font-mono">({agent.reviewCount})</span>
        </div>

        {/* Key metrics — 2x2 */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-y border-white/5 py-3 mb-3">
          <AgentMetric label="成功率" value={`${agent.metrics.successRate}%`} />
          <AgentMetric label="ROI" value={agent.metrics.roi} highlight />
          <AgentMetric label="均时" value={agent.metrics.avgTime} />
          <AgentMetric label="入职数" value={`${(agent.hireCount / 1000).toFixed(1)}k`} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 mt-auto flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-bold">单价</p>
          <p className="text-[15px] font-bold text-white">{agent.metrics.price}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => addToCompare(agent.id)}
            title="加入对比"
            className={cn(
              'p-2 rounded-xl border transition-all',
              inCompare
                ? 'bg-accent-marketplace/20 border-accent-marketplace/40 text-accent-marketplace'
                : 'bg-white/5 border-white/8 text-slate-500 hover:text-accent-marketplace hover:border-accent-marketplace/30'
            )}
          >
            <GitCompare size={13} />
          </button>
          {isHired ? (
            <button
              onClick={() => openAgentDrawer(agent.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-status-success/15 border border-status-success/30 text-status-success text-[12px] font-bold hover:bg-status-success/20 transition-all"
            >
              <Check size={12} />查看
            </button>
          ) : (
            <button
              onClick={() => openHireModal([agent.id])}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[12px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-md"
            >
              <UserPlus size={12} />入职
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AgentMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">{label}</p>
      <p className={cn('text-[13px] font-bold font-mono', highlight ? 'text-accent-marketplace' : 'text-slate-200')}>{value}</p>
    </div>
  );
}

// ─── Candidate Panel (right sidebar) ─────────────────────────────────────────

function CandidatePanel() {
  const { compareList, removeFromCompare, clearCompare, openHireModal } = useMarketplaceStore();
  const agents = compareList.map(id => marketplaceAgents.find(a => a.id === id)).filter(Boolean) as typeof marketplaceAgents;

  return (
    <aside className="w-64 shrink-0 flex flex-col border-l border-white/5 bg-slate-950/40 h-full overflow-hidden">
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">候选清单</h3>
          {compareList.length > 0 && (
            <button onClick={clearCompare} className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors">清空</button>
          )}
        </div>
        <p className="text-[10px] text-slate-600">已选 {compareList.length} / 3</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="w-10 h-10 rounded-xl border border-dashed border-white/15 flex items-center justify-center mb-3">
              <Users size={16} className="text-slate-700" />
            </div>
            <p className="text-[11px] text-slate-600">点击卡片上的对比图标</p>
            <p className="text-[11px] text-slate-600">将 Agent 加入候选</p>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map(a => (
              <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 group">
                <img src={a.avatar} className="w-9 h-9 rounded-lg bg-slate-800 shrink-0" alt={a.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{a.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{a.metrics.roi} ROI</p>
                </div>
                <button
                  onClick={() => removeFromCompare(a.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-status-error transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: 3 - agents.length }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-dashed border-white/8">
                <div className="w-9 h-9 rounded-lg border border-dashed border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-slate-700 text-xs">+</span>
                </div>
                <p className="text-[10px] text-slate-700">空槽位</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {agents.length > 0 && (
        <div className="px-4 pb-4 pt-3 border-t border-white/5 space-y-2">
          {agents.length >= 2 && (
            <button className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold hover:bg-white/10 transition-all">
              展开对比分析
            </button>
          )}
          <button
            onClick={() => openHireModal(compareList)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-md"
          >
            {agents.length === 1 ? '直接入职' : '组队入职'}
          </button>
          <p className="text-[9px] text-center text-slate-600">
            Boss，今天节省了 <span className="text-accent-blue font-bold">4.2h</span>
          </p>
        </div>
      )}
    </aside>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

function FilterPanel({ onClose, onApply }: { onClose: () => void; onApply: (f: FilterState) => void }) {
  const [verified, setVerified] = useState(false);
  const [maxPrice, setMaxPrice] = useState(20);
  const [minRoi, setMinRoi] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="absolute top-12 left-0 z-30 w-72 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">高级筛选</h3>
        <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-white" /></button>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setVerified(!verified)}
            className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-all', verified ? 'bg-accent-blue border-accent-blue' : 'border-white/20')}
          >
            {verified && <Check size={9} className="text-white" />}
          </div>
          <span className="text-sm text-slate-300">仅显示认证 Agent</span>
        </label>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-[11px] text-slate-400">最高单价</span>
            <span className="text-[11px] text-accent-blue font-mono">≤ ¥{maxPrice}/次</span>
          </div>
          <input type="range" min="0" max="50" value={maxPrice} onChange={e => setMaxPrice(+e.target.value)}
            className="w-full accent-accent-blue" />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-[11px] text-slate-400">最低 ROI</span>
            <span className="text-[11px] text-accent-marketplace font-mono">≥ {minRoi}%</span>
          </div>
          <input type="range" min="0" max="1200" step="50" value={minRoi} onChange={e => setMinRoi(+e.target.value)}
            className="w-full accent-accent-marketplace" />
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all">重置</button>
        <button onClick={() => { onApply({ verified, maxPrice, minRoi }); onClose(); }}
          className="flex-1 py-2 rounded-xl bg-accent-marketplace text-white text-xs font-bold hover:brightness-110 transition-all">应用</button>
      </div>
    </motion.div>
  );
}

interface FilterState { verified: boolean; maxPrice: number; minRoi: number; }

// ─── Post Requirement Modal ───────────────────────────────────────────────────

const REQ_CHANNELS = ['小红书', '抖音', '微博', '视频号', '私域', '全渠道'];
const URGENCY_OPTIONS = [
  { label: '不急', sub: '1 个月内', color: 'text-status-success', border: 'border-status-success/40', bg: 'bg-status-success/10' },
  { label: '本周内', sub: '7 天内', color: 'text-status-warning', border: 'border-status-warning/40', bg: 'bg-status-warning/10' },
  { label: '今天', sub: '24h 内', color: 'text-status-error', border: 'border-status-error/40', bg: 'bg-status-error/10' },
];
const BUDGET_OPTIONS = [
  { label: '¥0–1 / 次', max: 1 },
  { label: '¥1–5 / 次', max: 5 },
  { label: '¥5–20 / 次', max: 20 },
  { label: '¥20+ / 次', max: 9999 },
];

interface ReqForm {
  title: string;
  category: AgentCategory | '';
  channels: string[];
  description: string;
  budgetMax: number;
  urgency: string;
}

const defaultReqForm = (): ReqForm => ({
  title: '', category: '', channels: [], description: '', budgetMax: 20, urgency: '不急',
});

function PostRequirementModal({ onClose }: { onClose: () => void }) {
  const { openHireModal, addToCompare } = useMarketplaceStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<ReqForm>(defaultReqForm());
  const [matched, setMatched] = useState<typeof marketplaceAgents>([]);

  const toggleChannel = (ch: string) => {
    setForm(p => ({
      ...p,
      channels: p.channels.includes(ch) ? p.channels.filter(x => x !== ch) : [...p.channels, ch],
    }));
  };

  const handleMatch = () => {
    let results = [...marketplaceAgents];
    if (form.category) results = results.filter(a => a.category === form.category);
    if (form.budgetMax < 9999) results = results.filter(a => a.metrics.priceValue <= form.budgetMax);
    results = results.sort((a, b) => b.metrics.roiValue - a.metrics.roiValue).slice(0, 4);
    if (results.length === 0) results = marketplaceAgents.slice(0, 3);
    setMatched(results);
    setStep(3);
  };

  const stepLabels = ['描述需求', '预算时间', '匹配结果'];

  return (
    <AnimatePresence>
      <motion.div
        key="req-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        key="req-modal"
        initial={{ scale: 0.93, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-lg mx-4 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <PenLine size={14} className="text-accent-marketplace" />
              <h3 className="text-sm font-bold text-white">发布需求</h3>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-600 hover:text-white transition-colors rounded-lg hover:bg-white/5">
              <X size={16} />
            </button>
          </div>

          {/* Steps bar */}
          <div className="flex items-center px-6 py-3 border-b border-white/5 gap-1">
            {stepLabels.map((label, i) => {
              const num = (i + 1) as 1 | 2 | 3;
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
                    )}>{label}</span>
                  </div>
                  {i < 2 && <div className="flex-1 h-px bg-white/5 mx-1 max-w-[24px]" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Body */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.16 }}>
                <div className="px-6 py-5 space-y-4">
                  {/* Title */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">需求标题</p>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="如：618大促电商文案批量生产"
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-white placeholder:text-slate-700 outline-none focus:border-accent-marketplace/40 transition-all"
                    />
                  </div>
                  {/* Category */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">任务类型</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setForm(p => ({ ...p, category: p.category === cat ? '' : cat }))}
                          className={cn(
                            'px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
                            form.category === cat
                              ? 'bg-accent-marketplace/15 border-accent-marketplace/40 text-accent-marketplace'
                              : 'bg-white/[0.02] border-white/[0.08] text-slate-500 hover:border-white/20',
                          )}
                        >{cat}</button>
                      ))}
                    </div>
                  </div>
                  {/* Channels */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">目标渠道</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {REQ_CHANNELS.map(ch => (
                        <button
                          key={ch}
                          onClick={() => toggleChannel(ch)}
                          className={cn(
                            'py-1.5 rounded-lg border text-[10px] font-bold transition-all',
                            form.channels.includes(ch)
                              ? 'bg-accent-marketplace/15 border-accent-marketplace/40 text-accent-marketplace'
                              : 'bg-white/[0.02] border-white/[0.08] text-slate-500 hover:border-white/20',
                          )}
                        >{ch}</button>
                      ))}
                    </div>
                  </div>
                  {/* Description */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">需求描述</p>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="描述你的具体需求、输出格式要求、参考案例等..."
                      rows={3}
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[11px] text-slate-300 placeholder:text-slate-700 outline-none focus:border-accent-marketplace/40 transition-all resize-none leading-relaxed"
                    />
                  </div>
                </div>
                <div className="px-6 pb-5 flex gap-3">
                  <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold hover:bg-white/10 transition-all">取消</button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!form.title.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent-marketplace/20 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    下一步 <ChevronRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.16 }}>
                <div className="px-6 py-5 space-y-5">
                  {/* Budget */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">预算范围</p>
                    <div className="grid grid-cols-2 gap-2">
                      {BUDGET_OPTIONS.map(b => (
                        <button
                          key={b.label}
                          onClick={() => setForm(p => ({ ...p, budgetMax: b.max }))}
                          className={cn(
                            'py-2.5 rounded-xl border text-[11px] font-bold transition-all',
                            form.budgetMax === b.max
                              ? 'bg-brand-start/15 border-brand-start/40 text-brand-start'
                              : 'bg-white/[0.02] border-white/[0.08] text-slate-500 hover:border-white/20',
                          )}
                        >{b.label}</button>
                      ))}
                    </div>
                  </div>
                  {/* Urgency */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">紧急程度</p>
                    <div className="grid grid-cols-3 gap-2">
                      {URGENCY_OPTIONS.map(u => (
                        <button
                          key={u.label}
                          onClick={() => setForm(p => ({ ...p, urgency: u.label }))}
                          className={cn(
                            'py-3 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-0.5',
                            form.urgency === u.label
                              ? `${u.bg} ${u.border} ${u.color}`
                              : 'bg-white/[0.02] border-white/[0.08] text-slate-500 hover:border-white/20',
                          )}
                        >
                          <span>{u.label}</span>
                          <span className="text-[9px] font-normal opacity-70">{u.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Summary */}
                  <div className="bg-accent-marketplace/5 border border-accent-marketplace/15 rounded-xl px-4 py-3">
                    <p className="text-[9px] font-bold text-accent-marketplace uppercase tracking-widest mb-1.5">需求摘要</p>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{form.title || '未填标题'}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {form.category || '全类型'} · {form.channels.length > 0 ? form.channels.join('/') : '所有渠道'} · {BUDGET_OPTIONS.find(b => b.max === form.budgetMax)?.label}
                    </p>
                  </div>
                </div>
                <div className="px-6 pb-5 flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <ChevronLeft size={13} /> 返回
                  </button>
                  <button
                    onClick={handleMatch}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent-marketplace/20 flex items-center justify-center gap-1.5"
                  >
                    <Cpu size={13} /> 智能匹配
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.16 }}>
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={13} className="text-accent-marketplace" />
                    <p className="text-[11px] font-bold text-white">为你推荐 {matched.length} 位匹配 Agent</p>
                    <span className="text-[10px] text-slate-600">· 按 ROI 排序</span>
                  </div>
                  <div className="space-y-2.5">
                    {matched.map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-accent-marketplace/30 transition-all group">
                        <img src={a.avatar} className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 shrink-0" alt={a.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">{a.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{a.role}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-accent-marketplace font-mono font-bold">{a.metrics.roi} ROI</span>
                            <span className="text-[10px] text-slate-600 font-mono">{a.metrics.price}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { addToCompare(a.id); }}
                            title="加入候选"
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-accent-marketplace hover:border-accent-marketplace/30 transition-all text-[10px]"
                          >
                            <GitCompare size={13} />
                          </button>
                          <button
                            onClick={() => { openHireModal([a.id]); onClose(); }}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[10px] font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                          >
                            <UserPlus size={11} /> 入职
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-6 pb-5 flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <ChevronLeft size={13} /> 修改需求
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold hover:bg-white/10 transition-all"
                  >
                    完成
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Marketplace() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<AgentCategory | '全部'>('全部');
  const [sort, setSort] = useState('roi');
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ verified: false, maxPrice: 50, minRoi: 0 });
  const [showPostReq, setShowPostReq] = useState(false);

  const filtered = useMemo(() => {
    let list = marketplaceAgents;
    if (search) {
      list = list.filter(a =>
        a.name.includes(search) || a.role.includes(search) || a.tags.some(t => t.includes(search))
      );
    }
    if (activeCategory !== '全部') {
      list = list.filter(a => a.category === activeCategory);
    }
    if (filters.verified) list = list.filter(a => a.provider?.verified);
    list = list.filter(a => a.metrics.priceValue <= filters.maxPrice && a.metrics.roiValue >= filters.minRoi);
    switch (sort) {
      case 'roi':    return [...list].sort((a, b) => b.metrics.roiValue - a.metrics.roiValue);
      case 'price':  return [...list].sort((a, b) => a.metrics.priceValue - b.metrics.priceValue);
      case 'rating': return [...list].sort((a, b) => b.rating - a.rating);
      case 'hired':  return [...list].sort((a, b) => b.hireCount - a.hireCount);
      default:       return list;
    }
  }, [search, activeCategory, sort, filters]);

  const isSearching = !!search || activeCategory !== '全部';
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'ROI 最高';

  return (
    <div className="h-full flex overflow-hidden text-slate-300 font-sans">
      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        <div className="max-w-5xl mx-auto px-6 py-7">

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: '在库 Agent', value: '2.4k+', sub: '昨日 +12',  icon: <Zap size={14} className="text-accent-auto" /> },
              { label: '已入职总数', value: '15.8k', sub: '24% CONV',  icon: <ShoppingBag size={14} className="text-accent-manual" /> },
              { label: '平均口碑',   value: '4.92',  sub: '98% POS',   icon: <Star size={14} className="text-yellow-500" /> },
              { label: '今日成交',   value: '￥4.2w', sub: '+15.2%',   icon: <TrendingUp size={14} className="text-status-success" /> },
            ].map(s => (
              <div key={s.label} className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex items-center gap-3 hover:border-white/10 transition-all">
                <div className="p-1.5 bg-white/5 rounded-lg shrink-0">{s.icon}</div>
                <div>
                  <p className="text-lg font-bold text-white leading-none">{s.value}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search + controls */}
          <div className="flex gap-3 mb-5 relative">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="搜索角色、技能、行业..."
                className="w-full bg-slate-900/60 border border-white/8 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-accent-marketplace/50 outline-none transition-all placeholder:text-slate-700"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => { setShowSort(!showSort); setShowFilter(false); }}
                className="flex items-center gap-2 px-4 py-3 bg-slate-900/60 border border-white/8 rounded-xl hover:border-white/20 transition-all text-sm text-slate-300"
              >
                <SlidersHorizontal size={14} />
                <span className="hidden sm:block text-[11px]">{currentSortLabel}</span>
                <ChevronDown size={12} className={cn('transition-transform', showSort && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {showSort && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute top-12 right-0 z-30 w-40 bg-slate-950 border border-white/10 rounded-xl shadow-xl overflow-hidden"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSort(opt.value); setShowSort(false); }}
                        className={cn('w-full px-4 py-2.5 text-left text-[12px] transition-colors', sort === opt.value ? 'bg-accent-marketplace/15 text-accent-marketplace font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Filter */}
            <div className="relative">
              <button
                onClick={() => { setShowFilter(!showFilter); setShowSort(false); }}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-[11px] font-medium',
                  showFilter || filters.verified || filters.minRoi > 0
                    ? 'bg-accent-marketplace/15 border-accent-marketplace/40 text-accent-marketplace'
                    : 'bg-slate-900/60 border-white/8 text-slate-400 hover:border-white/20'
                )}
              >
                <Filter size={14} />
                <span className="hidden sm:block">筛选</span>
              </button>
              <AnimatePresence>
                {showFilter && (
                  <FilterPanel onClose={() => setShowFilter(false)} onApply={setFilters} />
                )}
              </AnimatePresence>
            </div>

            {/* Post Requirement */}
            <button
              onClick={() => setShowPostReq(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-accent-marketplace/30 bg-accent-marketplace/8 text-accent-marketplace text-[11px] font-bold hover:bg-accent-marketplace/15 hover:border-accent-marketplace/50 transition-all whitespace-nowrap"
            >
              <PenLine size={14} />
              <span className="hidden sm:block">发布需求</span>
            </button>
          </div>

          {/* Post Requirement Modal */}
          {showPostReq && <PostRequirementModal onClose={() => setShowPostReq(false)} />}

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            {(['全部', ...CATEGORIES] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full border text-[11px] font-bold transition-all',
                  activeCategory === cat
                    ? 'bg-accent-marketplace text-white border-accent-marketplace shadow-lg shadow-accent-marketplace/20'
                    : 'bg-white/[0.02] border-white/8 text-slate-500 hover:border-white/20 hover:text-slate-300'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Content */}
          {isSearching ? (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                搜索结果 · {filtered.length} 个 Agent
              </p>
              {filtered.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((a, i) => <AgentCard key={a.id} agent={a} index={i} />)}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-600">
                  <Search size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">没有找到匹配的 Agent</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {SECTIONS.map(sec => {
                const agents = sec.ids
                  .map(id => marketplaceAgents.find(a => a.id === id))
                  .filter(Boolean) as typeof marketplaceAgents;
                return (
                  <section key={sec.id}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-1.5 h-1.5 rounded-full', sec.dot)} />
                        <span className={cn('shrink-0', sec.accent)}>{sec.icon}</span>
                        <h2 className="text-[12px] font-bold text-white uppercase tracking-widest">{sec.label}</h2>
                        <span className="text-[10px] text-slate-600 font-mono">{agents.length}</span>
                      </div>
                      <button className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                        查看全部 <ArrowUpRight size={11} />
                      </button>
                    </div>
                    <div className={cn('grid gap-4', agents.length <= 2 ? 'grid-cols-2 max-w-lg' : 'grid-cols-2 lg:grid-cols-3')}>
                      {agents.map((a, i) => <AgentCard key={`${sec.id}-${a.id}`} agent={a} index={i} />)}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Candidate Panel ── */}
      <CandidatePanel />

      {/* Overlays */}
      <AgentDrawer />
      <HireModal />
    </div>
  );
}
