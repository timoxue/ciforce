import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, ShieldOff, Clock, ChevronDown, ChevronUp, Star, GitMerge } from 'lucide-react';
import { useMarketplaceStore } from '../../store/useAppStore';
import { marketplaceAgents } from '../../mocks/fixtures';
import { cn } from '../../lib/utils';

export default function AgentDrawer() {
  const { selectedAgentId, closeAgentDrawer, addToCompare, openHireModal, compareList } = useMarketplaceStore();
  const [ioExpanded, setIoExpanded] = useState(true);

  const agent = marketplaceAgents.find((a) => a.id === selectedAgentId) ?? null;
  const inCompare = agent ? compareList.includes(agent.id) : false;

  return (
    <AnimatePresence>
      {agent && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={closeAgentDrawer}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-[480px] bg-slate-950 border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Agent 详情</span>
              <button onClick={closeAgentDrawer} className="p-1.5 text-slate-600 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Hero */}
              <div className="px-6 py-6 border-b border-white/5">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-transparent p-px shrink-0">
                    <img src={agent.avatar} className="w-full h-full rounded-2xl bg-slate-900" alt={agent.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-white">{agent.name}</h2>
                      <StatusBadge status={agent.status} />
                    </div>
                    <p className="text-sm text-accent-marketplace mb-3">{agent.role}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4 Metrics */}
                <div className="grid grid-cols-4 gap-3">
                  <DrawerMetric label="7日产出" value={String(agent.metrics.output)} />
                  <DrawerMetric label="成功率" value={`${agent.metrics.successRate}%`} highlight />
                  <DrawerMetric label="单价" value={agent.metrics.price} />
                  <DrawerMetric label="均时" value={agent.metrics.avgTime} />
                </div>
              </div>

              {/* IO 协议 */}
              {agent.ioExpectation && (
                <div className="px-6 py-5 border-b border-white/5">
                  <button
                    onClick={() => setIoExpanded(!ioExpanded)}
                    className="flex items-center justify-between w-full mb-3 group"
                  >
                    <div className="flex items-center gap-2">
                      <GitMerge size={14} className="text-accent-marketplace" />
                      <span className="text-[11px] font-bold text-white uppercase tracking-widest">IO 协议</span>
                    </div>
                    {ioExpanded ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
                  </button>
                  <AnimatePresence>
                    {ioExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3">
                          <IOSection label="接受输入" items={agent.ioExpectation.input} color="text-accent-auto" dotColor="bg-accent-auto" />
                          <IOSection label="输出承诺" items={agent.ioExpectation.output} color="text-status-success" dotColor="bg-status-success" />
                          <IOSection label="不支持场景" items={agent.ioExpectation.unsupported} color="text-slate-500" dotColor="bg-slate-600" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* 实战样例 */}
              {agent.examples && agent.examples.length > 0 && (
                <div className="px-6 py-5 border-b border-white/5">
                  <h3 className="text-[11px] font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Star size={13} className="text-yellow-400" />
                    实战样例
                  </h3>
                  <div className="space-y-4">
                    {agent.examples.map((ex, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex gap-2">
                          <span className="text-[9px] font-bold text-slate-600 uppercase mt-1 shrink-0 w-8">输入</span>
                          <div className="bg-slate-900 border border-white/5 rounded-xl rounded-tl-sm px-3 py-2 text-[11px] text-slate-400 leading-relaxed flex-1">
                            {ex.input}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-[9px] font-bold text-accent-marketplace uppercase mt-1 shrink-0 w-8">输出</span>
                          <div className="bg-accent-marketplace/5 border border-accent-marketplace/20 rounded-xl rounded-tl-sm px-3 py-2 text-[11px] text-slate-300 leading-relaxed flex-1">
                            {ex.output}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 搭配建议 */}
              {agent.partnerIds && agent.partnerIds.length > 0 && (
                <div className="px-6 py-5 border-b border-white/5">
                  <h3 className="text-[11px] font-bold text-white uppercase tracking-widest mb-4">搭配建议</h3>
                  <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                    {agent.partnerIds.map((pid) => {
                      const partner = marketplaceAgents.find((a) => a.id === pid);
                      if (!partner) return null;
                      return (
                        <button
                          key={pid}
                          onClick={() => useMarketplaceStore.getState().openAgentDrawer(pid)}
                          className="flex flex-col items-center gap-2 shrink-0 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-accent-marketplace/30 hover:bg-accent-marketplace/5 transition-all w-24"
                        >
                          <img src={partner.avatar} className="w-10 h-10 rounded-xl bg-slate-800" alt={partner.name} />
                          <span className="text-[10px] font-bold text-slate-300 text-center leading-tight">{partner.name}</span>
                          <span className="text-[9px] text-slate-600 text-center leading-tight">{partner.role}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 开发商信息 */}
              {agent.provider && (
                <div className="px-6 py-5">
                  <h3 className="text-[11px] font-bold text-white uppercase tracking-widest mb-4">开发商</h3>
                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-start/30 to-accent-marketplace/20 flex items-center justify-center text-[11px] font-bold text-white border border-white/10">
                      {agent.provider.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-white truncate">{agent.provider.name}</span>
                        {agent.provider.verified
                          ? <Shield size={11} className="text-status-success shrink-0" />
                          : <ShieldOff size={11} className="text-slate-600 shrink-0" />
                        }
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock size={9} />
                          更新 {agent.provider.lastUpdated}
                        </span>
                        <span className="text-[10px] text-slate-500">SLA {agent.provider.slaHours}h</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-white/5 bg-slate-950 grid grid-cols-3 gap-2">
              <button className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold hover:bg-white/10 hover:text-white transition-all">
                试用
              </button>
              <button
                onClick={() => { addToCompare(agent.id); closeAgentDrawer(); }}
                className={cn(
                  "py-2.5 rounded-xl text-[11px] font-bold transition-all border",
                  inCompare
                    ? "bg-accent-marketplace/20 border-accent-marketplace/40 text-accent-marketplace"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-accent-marketplace/10 hover:border-accent-marketplace/30 hover:text-accent-marketplace"
                )}
              >
                {inCompare ? '已加入对比' : '加入对比'}
              </button>
              <button
                onClick={() => { openHireModal([agent.id]); closeAgentDrawer(); }}
                className="py-2.5 rounded-xl bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent-marketplace/20"
              >
                立即入职 →
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    working:     { label: '工作中', cls: 'bg-status-success/10 text-status-success border-status-success/20' },
    idle:        { label: '待命',   cls: 'bg-slate-800 text-slate-400 border-white/10' },
    blocked:     { label: '阻塞',   cls: 'bg-status-warning/10 text-status-warning border-status-warning/20' },
    offline:     { label: '离线',   cls: 'bg-slate-900 text-slate-600 border-white/5' },
    hired:       { label: '已入职', cls: 'bg-brand-start/10 text-brand-start border-brand-start/20' },
    interviewing:{ label: '面试中', cls: 'bg-accent-marketplace/10 text-accent-marketplace border-accent-marketplace/20' },
  };
  const s = map[status] ?? map['idle'];
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold border', s.cls)}>
      {s.label}
    </span>
  );
}

function DrawerMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
      <p className="text-[9px] text-slate-600 font-bold uppercase mb-1">{label}</p>
      <p className={cn('text-sm font-bold font-mono', highlight ? 'text-status-success' : 'text-white')}>{value}</p>
    </div>
  );
}

function IOSection({ label, items, color, dotColor }: { label: string; items: string[]; color: string; dotColor: string }) {
  return (
    <div>
      <p className={cn('text-[9px] font-bold uppercase mb-2', color)}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 text-[10px] text-slate-400">
            <span className={cn('w-1 h-1 rounded-full shrink-0', dotColor)} />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
