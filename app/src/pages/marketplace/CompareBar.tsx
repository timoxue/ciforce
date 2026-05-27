import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { useMarketplaceStore } from '../../store/useAppStore';
import { marketplaceAgents } from '../../mocks/fixtures';
import { cn } from '../../lib/utils';

export default function CompareBar() {
  const {
    compareList, removeFromCompare, clearCompare,
    compareExpanded, setCompareExpanded, openHireModal,
  } = useMarketplaceStore();

  const agents = compareList
    .map((id) => marketplaceAgents.find((a) => a.id === id))
    .filter(Boolean) as typeof marketplaceAgents;

  const canHire = compareList.length >= 1;

  return (
    <AnimatePresence>
      {compareList.length > 0 && (
        <motion.div
          key="compare-bar"
          initial={{ y: compareExpanded ? '70vh' : 64 }}
          animate={{ y: 0 }}
          exit={{ y: 200 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed bottom-0 left-0 right-0 z-30"
        >
          {/* Sheet Content (expanded) */}
          <AnimatePresence>
            {compareExpanded && (
              <motion.div
                key="sheet"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '65vh', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-slate-950/98 backdrop-blur-2xl border-t border-white/10 overflow-hidden"
              >
                <CompareSheet agents={agents} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bar */}
          <div className="h-16 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-6 gap-4">
            {/* Agent Slots */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-1 hidden sm:block">对比</span>
              {[0, 1, 2].map((i) => {
                const a = agents[i];
                return a ? (
                  <div key={i} className="relative group">
                    <div className="w-9 h-9 rounded-xl overflow-hidden border border-accent-marketplace/30">
                      <img src={a.avatar} className="w-full h-full bg-slate-900" alt={a.name} />
                    </div>
                    <button
                      onClick={() => removeFromCompare(a.id)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-800 border border-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-status-error"
                    >
                      <X size={8} />
                    </button>
                    <p className="text-[8px] text-slate-500 text-center mt-0.5 w-9 truncate">{a.name}</p>
                  </div>
                ) : (
                  <div key={i} className="w-9 h-9 rounded-xl border border-dashed border-white/15 flex items-center justify-center">
                    <Plus size={12} className="text-slate-700" />
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={clearCompare}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all"
              >
                清空
              </button>
              <button
                onClick={() => setCompareExpanded(!compareExpanded)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-marketplace/10 border border-accent-marketplace/30 text-accent-marketplace text-[11px] font-bold hover:bg-accent-marketplace/20 transition-all"
              >
                {compareExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                {compareExpanded ? '收起' : '展开对比'}
              </button>
              {canHire && (
                <button
                  onClick={() => openHireModal(compareList)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent-marketplace/20"
                >
                  {compareList.length === 1 ? '直接入职' : '组队入职'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CompareSheet({ agents }: { agents: typeof marketplaceAgents }) {
  const n = agents.length;
  const gridCols = n === 1 ? 'grid-cols-1' : n === 2 ? 'grid-cols-2' : 'grid-cols-3';

  // Find best value for each numeric metric
  const bestROI = Math.max(...agents.map((a) => parseFloat(a.metrics.roi)));
  const bestOutput = Math.max(...agents.map((a) => a.metrics.output));
  const bestSuccessRate = Math.max(...agents.map((a) => a.metrics.successRate));
  const bestCompat = Math.max(...agents.map((a) => a.compatibilityScore ?? 0));

  const dimensions = [
    {
      label: '单价',
      render: (a: typeof agents[0]) => a.metrics.price,
      isBest: (_a: typeof agents[0]) => false,
    },
    {
      label: '7日产出',
      render: (a: typeof agents[0]) => String(a.metrics.output),
      isBest: (a: typeof agents[0]) => a.metrics.output === bestOutput,
    },
    {
      label: '成功率',
      render: (a: typeof agents[0]) => `${a.metrics.successRate}%`,
      isBest: (a: typeof agents[0]) => a.metrics.successRate === bestSuccessRate,
    },
    {
      label: '平均耗时',
      render: (a: typeof agents[0]) => a.metrics.avgTime,
      isBest: (_a: typeof agents[0]) => false,
    },
    {
      label: 'ROI',
      render: (a: typeof agents[0]) => a.metrics.roi,
      isBest: (a: typeof agents[0]) => parseFloat(a.metrics.roi) === bestROI,
    },
    {
      label: '兼容度',
      render: (a: typeof agents[0]) => `${a.compatibilityScore ?? '-'}`,
      isBest: (a: typeof agents[0]) => (a.compatibilityScore ?? 0) === bestCompat,
      isProgress: true,
    },
    {
      label: 'IO 输出',
      render: (a: typeof agents[0]) => {
        const txt = a.ioExpectation?.output[0] ?? '—';
        return txt.length > 28 ? txt.slice(0, 28) + '…' : txt;
      },
      isBest: (_a: typeof agents[0]) => false,
    },
  ];

  const bestROIAgent = agents.reduce((prev, cur) =>
    parseFloat(cur.metrics.roi) > parseFloat(prev.metrics.roi) ? cur : prev
  );

  return (
    <div className="h-full flex flex-col px-6 pt-5 pb-2">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">对比分析</h3>
        <span className="text-[10px] text-slate-500">最多同时对比 3 位 Agent</span>
      </div>

      {/* Column Headers */}
      <div className={cn('grid gap-4 mb-4 shrink-0', gridCols)}>
        {agents.map((a) => (
          <div key={a.id} className="flex flex-col items-center gap-2">
            <img src={a.avatar} className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10" alt={a.name} />
            <div className="text-center">
              <p className="text-sm font-bold text-white">{a.name}</p>
              <p className="text-[10px] text-slate-500">{a.role}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dimension Rows */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
        {dimensions.map((dim) => (
          <div key={dim.label} className={cn('grid gap-4 py-2.5 border-b border-white/[0.04]', gridCols)}>
            {agents.map((a) => (
              <div key={a.id} className="flex flex-col items-center gap-1">
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{dim.label}</p>
                {dim.isProgress ? (
                  <div className="w-full">
                    <p className={cn('text-xs font-mono font-bold text-center mb-1', dim.isBest(a) ? 'text-status-success' : 'text-slate-400')}>
                      {dim.render(a)}
                    </p>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', dim.isBest(a) ? 'bg-status-success' : 'bg-slate-600')}
                        style={{ width: `${a.compatibilityScore ?? 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className={cn('text-xs font-mono font-bold', dim.isBest(a) ? 'text-status-success' : 'text-slate-400')}>
                    {dim.render(a)}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="shrink-0 pt-3 border-t border-white/5 mt-2 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-status-success rounded-full" />
        <span className="text-[11px] text-slate-400">
          系统推荐：<span className="text-white font-bold">{bestROIAgent.name}</span> 综合 ROI 最优（{bestROIAgent.metrics.roi}）
        </span>
      </div>
    </div>
  );
}
