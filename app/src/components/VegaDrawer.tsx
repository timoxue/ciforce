import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, ChevronRight, Send, Zap } from 'lucide-react';
import { useVegaStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

// ─── Mock VEGA data ───────────────────────────────────────────────────────────

const BRIEF = {
  greeting: '早上好，Boss。',
  summary: '今日团队整体健康，3 条 Pipeline 正常运转。小王产出效率本周环比 +8%，LING 翻译队列有轻微积压，已自动降低优先级处理。',
  metrics: [
    { label: '今日任务完成', value: '47', unit: '条', trend: 'up', delta: '+12%' },
    { label: '平均响应时长', value: '38', unit: 's', trend: 'up', delta: '-6s' },
    { label: '节省人工工时', value: '6.2', unit: 'h', trend: 'up', delta: '+0.8h' },
    { label: '当前阻塞数', value: '1', unit: '个', trend: 'down', delta: '' },
  ],
  recommendations: [
    { id: 'r1', priority: 'high', text: '数据侠已阻塞 2 小时，建议注入私有数据源或切换 API 端点。', action: '去处理' },
    { id: 'r2', priority: 'medium', text: 'LING 翻译队列积压 12 条，可考虑在低峰时段扩容任务并发。', action: '查看' },
    { id: 'r3', priority: 'low', text: '小王本周 ROI 达 920%，建议考虑增加同类文案任务配额。', action: '调整' },
  ],
  insight: '根据 Graphfy 执行图分析，小王 → 小陈的协作链路是当前产出效率最高的流水线，建议优先保障该链路的稳定性。',
};

const PRIORITY_STYLE: Record<string, string> = {
  high:   'bg-status-error/8 border-status-error/25 text-status-error',
  medium: 'bg-status-warning/8 border-status-warning/25 text-status-warning',
  low:    'bg-status-success/8 border-status-success/25 text-status-success',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: '急', medium: '中', low: '优',
};

// VEGA hex icon (reused)
function VegaIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="rgba(56,189,248,0.8)" strokeWidth="1.5" fill="rgba(56,189,248,0.08)" />
      <polygon points="14,6 22,10 22,18 14,22 6,18 6,10" stroke="rgba(99,102,241,0.6)" strokeWidth="1" fill="rgba(99,102,241,0.05)" />
      <circle cx="14" cy="14" r="3" fill="rgba(56,189,248,0.9)" />
      <circle cx="14" cy="14" r="5" stroke="rgba(56,189,248,0.3)" strokeWidth="1" fill="none">
        <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export default function VegaDrawer() {
  const { drawerOpen, closeDrawer } = useVegaStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'vega' | 'boss'; text: string }[]>([]);

  const handleSend = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'boss', text: q }]);
    setTimeout(() => {
      setMessages((m) => [...m, {
        role: 'vega',
        text: '收到，Boss。我正在分析相关数据，稍后为您提供完整方案。',
      }]);
    }, 800);
  };

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="vega-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <motion.aside
            key="vega-drawer"
            initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-[400px] bg-slate-950 border-l border-accent-blue/15 z-50 flex flex-col shadow-2xl"
          >
            {/* Glow line */}
            <div className="h-px bg-gradient-to-r from-transparent via-accent-blue/40 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <VegaIcon size={30} />
                <div>
                  <p className="text-[11px] font-bold text-accent-blue uppercase tracking-[0.2em]">VEGA</p>
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">数字 COO · 今日简报</p>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-1.5 text-slate-600 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                <X size={15} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6">

              {/* Greeting + summary */}
              <div className="p-4 rounded-xl bg-accent-blue/5 border border-accent-blue/15">
                <p className="text-[10px] font-bold text-accent-blue uppercase tracking-widest mb-2">{BRIEF.greeting}</p>
                <p className="text-sm text-slate-300 leading-relaxed font-light">{BRIEF.summary}</p>
              </div>

              {/* Metrics */}
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">关键指标</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {BRIEF.metrics.map((m) => (
                    <div key={m.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                      <p className="text-[9px] text-slate-600 font-bold uppercase mb-1">{m.label}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white">{m.value}</span>
                        <span className="text-[10px] text-slate-500">{m.unit}</span>
                      </div>
                      {m.delta && (
                        <div className={cn('flex items-center gap-1 mt-1', m.trend === 'up' ? 'text-status-success' : 'text-status-error')}>
                          {m.trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          <span className="text-[9px] font-mono font-bold">{m.delta}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">VEGA 建议</p>
                <div className="space-y-2.5">
                  {BRIEF.recommendations.map((r) => (
                    <div key={r.id} className={cn('flex items-start gap-3 p-3 rounded-xl border', PRIORITY_STYLE[r.priority])}>
                      <span className="shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center text-[9px] font-bold mt-0.5">
                        {PRIORITY_LABEL[r.priority]}
                      </span>
                      <p className="flex-1 text-[11px] leading-relaxed">{r.text}</p>
                      <button className="shrink-0 flex items-center gap-1 text-[10px] font-bold opacity-70 hover:opacity-100 transition-opacity whitespace-nowrap">
                        {r.action} <ChevronRight size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphfy insight */}
              <div className="p-4 rounded-xl bg-brand-start/5 border border-brand-start/15">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={13} className="text-brand-start" />
                  <span className="text-[10px] font-bold text-brand-start uppercase tracking-widest">Graphfy 洞察</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{BRIEF.insight}</p>
              </div>

              {/* Chat messages */}
              {messages.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">对话记录</p>
                  {messages.map((msg, i) => (
                    <div key={i} className={cn('flex', msg.role === 'boss' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed',
                        msg.role === 'boss'
                          ? 'bg-brand-start/20 border border-brand-start/30 text-white'
                          : 'bg-accent-blue/8 border border-accent-blue/20 text-slate-300'
                      )}>
                        {msg.role === 'vega' && <span className="text-[9px] font-bold text-accent-blue uppercase tracking-widest block mb-1">VEGA</span>}
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat input */}
            <div className="shrink-0 px-5 pb-5 pt-3 border-t border-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="向 VEGA 提问或下达指令..."
                  className="w-full bg-slate-900/60 border border-white/8 rounded-xl py-3 pl-4 pr-11 text-[12px] text-slate-300 focus:border-accent-blue/40 outline-none transition-all placeholder:text-slate-700"
                />
                <button
                  onClick={handleSend}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-accent-blue hover:opacity-80 transition-opacity"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[9px] text-slate-700 mt-2 text-center font-mono tracking-wider">VEGA 会根据实时 Graphfy 数据作答</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
