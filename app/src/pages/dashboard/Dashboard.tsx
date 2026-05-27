import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronLeft, ChevronRight, Zap, User, History, Trophy,
  AlertCircle, X, Send, Loader2, FileText, Copy, CheckCheck,
  Plus, Users, Check, ThumbsUp, Pencil, Archive, Link2,
  ChevronDown,
} from 'lucide-react';
import { useWorkspaceStore, useArchiveStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';

const BACKEND = 'http://localhost:8000';

// ─── Config ───────────────────────────────────────────────────────────────────

type AgentId = 'vega' | 'xiaowang' | 'xiaochen' | 'datashe' | 'ling';
type EntityId = AgentId | 'vega';

const AGENTS = [
  { id: 'xiaowang' as AgentId, name: '小王',  role: '社交媒体文案', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',  status: 'active'     as const, roi: '850%',  output: '1,240', task: '撰写防晒文案中...' },
  { id: 'xiaochen' as AgentId, name: '小陈',  role: '短视频剪辑',   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',   status: 'processing' as const, roi: '620%',  output: '450',   task: '渲染视频中' },
  { id: 'datashe'  as AgentId, name: '数据侠', role: '市场趋势分析', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',   status: 'idle'       as const, roi: '450%',  output: '120',   task: '待命' },
  { id: 'ling'     as AgentId, name: 'LING',  role: '多语言翻译',   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly',  status: 'idle'       as const, roi: '1200%', output: '3,200', task: '待命' },
];

const STATUS = {
  active:     { dot: 'bg-status-success animate-pulse', ring: 'border-status-success/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]', label: '工作中', color: 'text-status-success' },
  processing: { dot: 'bg-accent-auto animate-pulse',    ring: 'border-accent-auto/40 shadow-[0_0_8px_rgba(14,165,233,0.2)]',   label: '处理中', color: 'text-accent-auto' },
  idle:       { dot: 'bg-slate-600',                    ring: 'border-white/10',                                                 label: '待命',   color: 'text-slate-500' },
  blocked:    { dot: 'bg-status-warning animate-pulse', ring: 'border-status-warning/40',                                        label: '阻塞',   color: 'text-status-warning' },
};

// Mock output feed items
const ALL_OUTPUTS = [
  { id: 'o1', agentId: 'xiaowang', agentName: '小王', time: '2m', content: '防晒霜推文：☀️ 夏天最后的倔强！SPF50+清爽不闷痘，敏感肌也能用～ #防晒推荐', status: 'pending' as const },
  { id: 'o2', agentId: 'xiaochen', agentName: '小陈', time: '5m', content: '视频渲染完成：智能办公空间展示 [4K, 30s] — 已导出至存档', status: 'done' as const },
  { id: 'o3', agentId: 'ling',     agentName: 'LING',  time: '15m', content: '日语本地化翻译完成：开发者大会邀请函 [JP]', status: 'done' as const },
  { id: 'o4', agentId: 'xiaowang', agentName: '小王', time: '24m', content: '小红书文案：这10个AI工具让你每天少加班3小时 🔥', status: 'confirmed' as const },
  { id: 'o5', agentId: 'datashe',  agentName: '数据侠', time: '1h', content: '竞品分析报告：2025 Q4 防晒市场份额变化（PDF 已生成）', status: 'confirmed' as const },
];

// VEGA responses
function vegaReply(q: string) {
  const t = q.toLowerCase();
  if (t.includes('研究') || t.includes('分析') || t.includes('市场'))
    return '收到，数据侠已就绪。我将任务分配给她执行市场研究，预计 2-5 分钟输出报告。';
  if (t.includes('小王') || t.includes('文案'))
    return '小王目前工作中，本周 1,240 篇，成功率 98.2%。有具体指令要下达吗？';
  if (t.includes('状态') || t.includes('团队'))
    return '团队整体健康。小王+小陈链路吞吐 12.4MB/s；LING 队列清空；数据侠待命。';
  if (t.includes('绩效') || t.includes('roi'))
    return '本月累计 ROI 1,240%，环比 +5%。小王是当月最佳，ROI 850%。节省工时 128h。';
  return '收到，Boss。我正在分析您的需求，马上给您行动建议。有更具体的目标吗？';
}

// ─── Column: 产出流 ───────────────────────────────────────────────────────────

function OutputColumn({ entityId }: { entityId: EntityId }) {
  const isVega = entityId === 'vega';
  const agentFilter = isVega ? null : entityId;
  const outputs = agentFilter
    ? ALL_OUTPUTS.filter(o => o.agentId === agentFilter)
    : ALL_OUTPUTS;

  const [items, setItems] = useState(outputs);
  const { tasks: archiveTasks } = useArchiveStore();

  const confirm = (id: string) => setItems(prev => prev.map(o => o.id === id ? { ...o, status: 'confirmed' as const } : o));
  const reject  = (id: string) => setItems(prev => prev.filter(o => o.id !== id));

  // Merge real archive tasks into the feed
  const agentArchiveTasks = archiveTasks.filter(t => agentFilter ? t.agentId === agentFilter : true);

  return (
    <div className="h-full flex flex-col overflow-hidden border-r border-white/5">
      <div className="px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-brand-start rounded-full" />
            {isVega ? '全局产出流' : `${AGENTS.find(a => a.id === entityId)?.name} · 产出记录`}
          </h3>
          <span className="text-[9px] text-slate-600">{items.length + agentArchiveTasks.length} 条</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2">
        {/* Real research tasks from archive */}
        {agentArchiveTasks.map(t => (
          <div key={t.id} className="rounded-xl border border-status-success/20 bg-status-success/4 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <img src={AGENTS.find(a => a.id === t.agentId)?.avatar ?? ''} className="w-4 h-4 rounded bg-slate-800" alt="" />
                <span className="text-[9px] font-bold text-status-success uppercase">{t.agentName}</span>
              </div>
              <span className="text-[9px] text-slate-600 font-mono">{t.time}</span>
            </div>
            <p className="text-[11px] text-white font-medium">{t.query}</p>
            <p className="text-[10px] text-slate-500">{t.chars} 字 · 已存档</p>
          </div>
        ))}

        {/* Mock outputs */}
        {items.map(o => (
          <motion.div
            key={o.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
              'rounded-xl border p-3 space-y-2 transition-all',
              o.status === 'pending'   ? 'border-accent-manual/25 bg-accent-manual/4' :
              o.status === 'confirmed' ? 'border-white/5 bg-white/[0.01]' :
              'border-white/5 bg-white/[0.02]'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isVega && (
                  <img src={AGENTS.find(a => a.id === o.agentId)?.avatar ?? ''} className="w-4 h-4 rounded bg-slate-800" alt="" />
                )}
                <span className={cn('text-[9px] font-bold uppercase tracking-wider', isVega ? 'text-brand-start' : 'text-accent-manual')}>{o.agentName}</span>
              </div>
              <div className="flex items-center gap-2">
                {o.status === 'pending' && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-accent-manual/15 border border-accent-manual/30 text-accent-manual rounded font-bold">待确认</span>
                )}
                <span className="text-[9px] text-slate-600 font-mono">{o.time}</span>
              </div>
            </div>

            {/* Content */}
            <p className={cn('text-[11px] leading-relaxed line-clamp-3', o.status === 'confirmed' ? 'text-slate-500' : 'text-slate-300')}>
              {o.content}
            </p>

            {/* Actions */}
            {o.status === 'pending' && (
              <div className="flex items-center gap-2 pt-0.5">
                <button onClick={() => confirm(o.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-status-success/10 border border-status-success/25 text-status-success text-[10px] font-bold hover:bg-status-success/20 transition-all">
                  <ThumbsUp size={10} />采纳
                </button>
                <button onClick={() => reject(o.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold hover:bg-white/10 transition-all">
                  <Pencil size={10} />改写
                </button>
                <button onClick={() => confirm(o.id)}
                  className="flex items-center gap-1 ml-auto px-2 py-1 rounded-lg text-slate-600 text-[10px] hover:text-slate-400 transition-all">
                  <Archive size={10} />存档
                </button>
              </div>
            )}
            {o.status === 'confirmed' && (
              <div className="flex items-center gap-1 text-[9px] text-status-success/60">
                <Check size={9} /><span>已确认</span>
              </div>
            )}
          </motion.div>
        ))}

        {items.length === 0 && agentArchiveTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <FileText size={20} className="text-slate-700" />
            <p className="text-[11px] text-slate-600">暂无产出记录</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Column: 绩效 ─────────────────────────────────────────────────────────────

function PerformanceColumn({ entityId }: { entityId: EntityId }) {
  const isVega = entityId === 'vega';
  const agent = isVega ? null : AGENTS.find(a => a.id === entityId);

  return (
    <div className="h-full flex flex-col overflow-hidden border-r border-white/5">
      <div className="px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
        <h3 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <Trophy size={12} className="text-slate-500" />
          {isVega ? '团队绩效' : `${agent?.name} · 绩效`}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
        {isVega ? (
          <>
            {/* Team KPIs */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '今日节省工时', value: '6.2h', sub: '+0.8h', color: 'text-status-success' },
                { label: '累计 ROI',    value: '1,240%', sub: '+5%', color: 'text-accent-marketplace' },
                { label: '任务完成',    value: '47条',   sub: '+12%', color: 'text-accent-auto' },
                { label: '人效比',      value: '4.2x',   sub: '+0.3', color: 'text-brand-start' },
              ].map(m => (
                <div key={m.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[9px] text-slate-600 font-bold uppercase mb-1">{m.label}</p>
                  <p className={cn('text-xl font-bold', m.color)}>{m.value}</p>
                  <p className="text-[9px] text-slate-500 font-mono">{m.sub}</p>
                </div>
              ))}
            </div>
            {/* Agent bars */}
            <div className="space-y-2.5">
              <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">本周合格率</p>
              {AGENTS.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <img src={a.avatar} className="w-5 h-5 rounded-lg bg-slate-800 shrink-0" alt={a.name} />
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: a.status === 'active' ? '98%' : a.status === 'processing' ? '84%' : a.id === 'datashe' ? '72%' : '99%' }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={a.status === 'active' ? 'h-full bg-status-success rounded-full' : a.status === 'processing' ? 'h-full bg-accent-auto rounded-full' : 'h-full bg-accent-marketplace rounded-full'}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono w-7 text-right shrink-0">
                    {a.status === 'active' ? '98%' : a.status === 'processing' ? '84%' : a.id === 'datashe' ? '72%' : '99%'}
                  </span>
                </div>
              ))}
            </div>
            {/* Top agent */}
            <div className="bg-white/[0.02] border border-white/6 rounded-xl p-3 flex items-center gap-3">
              <img src={AGENTS[0].avatar} className="w-10 h-10 rounded-xl bg-slate-800 border border-white/8 shrink-0" alt="小王" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-bold text-white">小王</p>
                  <span className="text-[8px] px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded font-bold">本月最佳</span>
                </div>
                <p className="text-[10px] text-slate-500">社交媒体文案</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-bold text-status-success">+15% ↑</p>
                <p className="text-[9px] text-slate-600">ROI 增长</p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Individual KPIs */}
            <div className="grid grid-cols-1 gap-2.5">
              {[
                { label: '成功率', value: agent?.status === 'active' ? '98.2%' : '94%', color: 'text-status-success' },
                { label: 'ROI',   value: agent?.roi ?? '—',                              color: 'text-accent-marketplace' },
                { label: '本月产出', value: `${agent?.output ?? '—'} 次`,               color: 'text-accent-auto' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
                  <p className="text-[11px] text-slate-500">{m.label}</p>
                  <p className={cn('text-xl font-bold font-mono', m.color)}>{m.value}</p>
                </div>
              ))}
            </div>
            {/* 7-day chart */}
            <div className="bg-white/[0.02] border border-white/6 rounded-xl p-3 space-y-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">近7天合格率</p>
              <div className="flex items-end gap-1 h-14">
                {[72, 85, 91, 88, 96, 94, 98].map((v, i) => (
                  <motion.div key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${v}%` }}
                    transition={{ delay: i * 0.05, duration: 0.6, ease: 'easeOut' }}
                    className={cn('flex-1 rounded-t', v >= 90 ? 'bg-status-success/60' : v >= 80 ? 'bg-accent-auto/60' : 'bg-accent-marketplace/60')}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[8px] text-slate-700">
                {['一', '二', '三', '四', '五', '六', '今'].map(d => <span key={d}>{d}</span>)}
              </div>
            </div>
            {/* Task history */}
            <div className="space-y-2">
              <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">最近任务</p>
              {[
                { time: '10:24', task: '防晒竞品分析', dur: '3m 12s' },
                { time: '09:15', task: '新能源趋势研究', dur: '4m 08s' },
                { time: '昨天', task: '短视频变现策略', dur: '2m 55s' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] py-1">
                  <span className="text-slate-600 font-mono shrink-0 w-10 text-[9px]">{t.time}</span>
                  <span className="flex-1 text-slate-400 truncate">{t.task}</span>
                  <Check size={9} className="text-status-success shrink-0" />
                  <span className="text-slate-600 font-mono text-[9px] shrink-0">{t.dur}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Column: 交互 ─────────────────────────────────────────────────────────────

// Reusable input bar with file upload
function InputBar({
  value, onChange, onSubmit, onStop,
  placeholder, isRunning, footerNote,
}: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; onStop?: () => void;
  placeholder: string; isRunning?: boolean; footerNote?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAttachedFile(f);
  };

  return (
    <div className="shrink-0 px-5 pb-5 pt-3 border-t border-white/8 bg-slate-950/40 space-y-2.5">
      {/* Attached file indicator */}
      {attachedFile && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-manual/8 border border-accent-manual/20 rounded-xl">
          <FileText size={12} className="text-accent-manual shrink-0" />
          <span className="text-[11px] text-accent-manual flex-1 truncate">{attachedFile.name}</span>
          <button onClick={() => { setAttachedFile(null); if (fileRef.current) fileRef.current.value = ''; }}
            className="text-slate-500 hover:text-status-error transition-colors shrink-0">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input row — taller, more prominent */}
      <div className="flex items-stretch gap-2.5">
        {/* File upload button */}
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
          accept=".txt,.md,.pdf,.csv,.json,.docx" />
        <button
          onClick={() => fileRef.current?.click()}
          title="上传本地文件（.txt .md .pdf .csv .json .docx）"
          className="shrink-0 w-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-500 hover:text-accent-manual hover:border-accent-manual/40 hover:bg-accent-manual/8 transition-all group"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        {/* Text input — wider, taller */}
        <div className="relative flex-1">
          <input
            type="text" value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !isRunning) onSubmit(); }}
            placeholder={placeholder}
            disabled={isRunning}
            className={cn(
              'w-full rounded-xl py-3.5 pl-5 pr-12 text-[13px] text-slate-200 outline-none transition-all placeholder:text-slate-600',
              isRunning
                ? 'bg-slate-900/50 border border-accent-auto/25 cursor-not-allowed'
                : 'bg-slate-900/80 border border-white/12 focus:border-accent-manual/60 focus:bg-slate-900 focus:shadow-[0_0_0_1px_rgba(99,102,241,0.2)]'
            )}
          />
          {isRunning ? (
            <button onClick={onStop}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-status-error hover:bg-status-error/10 transition-all">
              <X size={15} />
            </button>
          ) : (
            <button onClick={onSubmit} disabled={!value.trim() && !attachedFile}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-accent-manual hover:bg-accent-manual/10 disabled:opacity-25 transition-all">
              <Send size={15} />
            </button>
          )}
        </div>
      </div>

      {footerNote && (
        <p className="text-[9px] text-slate-700 text-center font-mono tracking-wider mt-1">{footerNote}</p>
      )}
    </div>
  );
}

function InteractionColumn({ entityId }: { entityId: EntityId }) {
  const isVega = entityId === 'vega';
  const agent  = isVega ? null : AGENTS.find(a => a.id === entityId);
  const isResearch = entityId === 'datashe';

  // VEGA chat state
  const [vegaInput, setVegaInput] = useState('');
  const [vegaChat, setVegaChat] = useState<Array<{ role: 'vega' | 'boss'; text: string }>>([
    { role: 'vega', text: '早上好，Boss。团队今日正常运转，有什么目标要交给我执行？' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Research state (for datashe)
  const [researchQuery, setResearchQuery] = useState('');
  const [researchStatus, setResearchStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [researchMsg, setResearchMsg] = useState('');
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchReport, setResearchReport] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [showSources, setShowSources] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const reportRef = useRef('');
  const { addTask } = useArchiveStore();

  const sendToVega = () => {
    if (!vegaInput.trim()) return;
    const msg = vegaInput.trim();
    setVegaInput('');
    setVegaChat(c => [...c, { role: 'boss' as const, text: msg }]);
    setTimeout(() => {
      setVegaChat(c => [...c, { role: 'vega' as const, text: vegaReply(msg) }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, 600);
  };

  const runResearch = useCallback(async (q: string) => {
    if (!q.trim() || researchStatus === 'running') return;
    reportRef.current = '';
    setResearchStatus('running');
    setResearchProgress(0);
    setResearchReport('');
    setSources([]);
    setResearchMsg('VEGA：收到，正在将任务分配给数据侠...');
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${BACKEND}/api/agents/data_analyst/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: q.trim(), max_sources: 6 }),
        signal: abortRef.current.signal,
      });
      if (!res.body) throw new Error('no body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data:'))) {
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.type === 'status')  { setResearchMsg(`VEGA：${evt.message}`); setResearchProgress(evt.progress ?? 0); }
            if (evt.type === 'source')  { setSources(s => [...s, evt.url]); }
            if (evt.type === 'content') { reportRef.current += evt.content; setResearchReport(reportRef.current); }
            if (evt.type === 'done')    {
              setResearchStatus('done'); setResearchProgress(100);
              setResearchMsg('VEGA：报告已完成，已存入存档室。');
              addTask({ id: Date.now().toString(), agentId: 'datashe', agentName: '数据侠', query: q.trim(), report: reportRef.current, sources, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), chars: reportRef.current.length });
            }
            if (evt.type === 'error')   { setResearchMsg(evt.message); setResearchStatus('error'); }
          } catch { /* */ }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') { setResearchMsg(e?.message ?? '连接失败'); setResearchStatus('error'); }
      else { setResearchStatus('idle'); setResearchMsg(''); }
    }
  }, [researchStatus, sources, addTask]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
        <h3 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-accent-manual rounded-full" />
          {isVega ? 'VEGA 指令台' : `${agent?.name} · 工作区`}
        </h3>
      </div>

      {/* VEGA chat */}
      {isVega && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
            {vegaChat.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'boss' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'vega' && (
                  <div className="w-6 h-6 rounded-lg bg-accent-blue/15 border border-accent-blue/25 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 28 28" fill="none">
                      <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="rgba(56,189,248,0.8)" strokeWidth="2" fill="none" />
                      <circle cx="14" cy="14" r="3" fill="rgba(56,189,248,0.9)" />
                    </svg>
                  </div>
                )}
                <div className={cn(
                  'max-w-[84%] px-3 py-2.5 rounded-2xl text-[12px] leading-relaxed',
                  msg.role === 'boss'
                    ? 'bg-brand-start/20 border border-brand-start/30 text-white rounded-br-sm'
                    : 'bg-slate-900/60 border border-white/8 text-slate-300 rounded-bl-sm'
                )}>
                  {msg.role === 'vega' && <span className="block text-[9px] font-bold text-accent-blue uppercase tracking-widest mb-1">VEGA</span>}
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <InputBar
            value={vegaInput} onChange={setVegaInput}
            onSubmit={sendToVega}
            placeholder="告诉 VEGA 你的目标，或上传文件让她分析..."
          />
        </div>
      )}

      {/* Research workspace (datashe) */}
      {isResearch && (
        <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 gap-3">
          {/* VEGA status */}
          <AnimatePresence>
            {(researchStatus === 'running' || (researchStatus === 'done' && researchMsg)) && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl border shrink-0 text-[11px]',
                  researchStatus === 'running' ? 'bg-accent-auto/5 border-accent-auto/20 text-slate-300' : 'bg-status-success/5 border-status-success/20 text-slate-300')}>
                <svg width="14" height="14" viewBox="0 0 28 28" fill="none" className="shrink-0">
                  <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke={researchStatus === 'running' ? 'rgba(14,165,233,0.8)' : 'rgba(16,185,129,0.8)'} strokeWidth="1.5" fill="none" />
                  <circle cx="14" cy="14" r="3" fill={researchStatus === 'running' ? 'rgba(14,165,233,0.9)' : 'rgba(16,185,129,0.9)'}>{researchStatus === 'running' && <animate attributeName="r" values="3;4;3" dur="1.5s" repeatCount="indefinite" />}</circle>
                </svg>
                <span className="flex-1 truncate">{researchMsg}</span>
                {researchStatus === 'running' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-16 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div animate={{ width: `${researchProgress}%` }} transition={{ duration: 0.5 }} className="h-full bg-accent-auto rounded-full" />
                    </div>
                    <span className="text-[9px] text-accent-auto font-mono">{researchProgress}%</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sources */}
          {sources.length > 0 && (
            <div className="shrink-0">
              <button onClick={() => setShowSources(s => !s)} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
                <Link2 size={9} />{sources.length} 条来源<ChevronDown size={9} className={showSources ? 'rotate-180' : ''} />
              </button>
              {showSources && <div className="mt-1 pl-4 space-y-0.5">{sources.slice(0,4).map((u,i) => { let h=u; try{h=new URL(u).hostname}catch{} return <p key={i} className="text-[10px] text-slate-600 truncate">{i+1}. {h}</p>; })}</div>}
            </div>
          )}

          {/* Output */}
          <div className="flex-1 overflow-y-auto custom-scrollbar rounded-xl border border-white/5 bg-slate-950/30 relative">
            {researchStatus === 'idle' && !researchReport && (
              <div className="h-full flex flex-col items-center justify-center gap-4 p-5">
                <div className="text-center">
                  <FileText size={22} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-[12px] text-slate-500">输入研究主题，数据侠实时生成深度报告</p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {['2026年防晒霜市场竞争格局', '新能源汽车行业趋势分析', '短视频平台变现策略对比'].map(s => (
                    <button key={s} onClick={() => { setResearchQuery(s); runResearch(s); }}
                      className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8 text-[11px] text-slate-400 hover:text-white hover:border-accent-manual/30 transition-all text-left">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {researchReport && (
              <div className="p-4">
                {researchStatus === 'running' && <div className="flex items-center gap-2 mb-3"><Loader2 size={11} className="text-accent-auto animate-spin" /><span className="text-[11px] text-accent-auto">撰写中...</span></div>}
                {researchStatus === 'done' && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] text-status-success font-bold uppercase flex items-center gap-1"><div className="w-1 h-1 bg-status-success rounded-full" />研究报告</span>
                    <button onClick={async () => { await navigator.clipboard.writeText(researchReport); }} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white"><Copy size={9} />复制</button>
                  </div>
                )}
                <div className="prose prose-invert prose-sm max-w-none text-[12px] leading-relaxed prose-headings:text-white prose-headings:text-sm prose-headings:font-bold prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-hr:border-white/10">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{researchReport}</ReactMarkdown>
                </div>
              </div>
            )}
            {researchStatus === 'error' && (
              <div className="h-full flex flex-col items-center justify-center gap-2 p-5 text-center">
                <AlertCircle size={20} className="text-status-error" />
                <p className="text-[12px] text-status-error">{researchMsg}</p>
                <p className="text-[10px] text-slate-600">确认 backend/main.py 已启动</p>
              </div>
            )}
          </div>

          <InputBar
            value={researchQuery} onChange={setResearchQuery}
            onSubmit={() => runResearch(researchQuery)}
            onStop={() => abortRef.current?.abort()}
            placeholder="输入研究主题，或上传本地文件让数据侠分析..."
            isRunning={researchStatus === 'running'}
            footerNote="DeepSeek + DuckDuckGo · 实时深度研究"
          />
        </div>
      )}

      {/* Generic agent workspace (non-research) */}
      {!isVega && !isResearch && (
        <div className="flex-1 flex flex-col overflow-hidden px-4 py-4 gap-3">
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-xl">
              <img src={agent?.avatar} className="w-full h-full bg-slate-800" alt={agent?.name} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white mb-1">{agent?.name}</p>
              <p className="text-[11px] text-slate-500">{agent?.role}</p>
              <div className={cn('mt-2 text-[10px] font-bold', STATUS[agent?.status ?? 'idle'].color)}>
                {STATUS[agent?.status ?? 'idle'].label}
                {agent?.task !== '待命' && ` — ${agent?.task}`}
              </div>
            </div>
          </div>
          <InputBar
            value="" onChange={() => {}}
            onSubmit={() => {}}
            placeholder={`给${agent?.name}发送指令，或上传文件...`}
          />
        </div>
      )}
    </div>
  );
}

// ─── Unified Workspace ────────────────────────────────────────────────────────

function UnifiedWorkspace({ entityId }: { entityId: EntityId }) {
  const isVega = entityId === 'vega';
  const agent  = isVega ? null : AGENTS.find(a => a.id === entityId);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-white/5 shrink-0 bg-slate-950/20">
        {isVega ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-blue/15 border border-accent-blue/25 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="rgba(56,189,248,0.9)" strokeWidth="1.5" fill="none" />
                <circle cx="14" cy="14" r="3.5" fill="rgba(56,189,248,0.9)"><animate attributeName="r" values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite" /></circle>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">VEGA</p>
              <p className="text-[10px] text-slate-500">数字 COO · 全局总览</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className={cn('relative w-9 h-9 rounded-xl overflow-hidden border-2', STATUS[agent?.status ?? 'idle'].ring)}>
              <img src={agent?.avatar} className="w-full h-full bg-slate-800" alt={agent?.name} />
              <div className={cn('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950', STATUS[agent?.status ?? 'idle'].dot)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">{agent?.name}</p>
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
                  agent?.status === 'active' ? 'bg-status-success/10 border-status-success/20 text-status-success' :
                  agent?.status === 'processing' ? 'bg-accent-auto/10 border-accent-auto/20 text-accent-auto' :
                  'bg-white/5 border-white/10 text-slate-500')}>
                  {STATUS[agent?.status ?? 'idle'].label}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">{agent?.role}</p>
            </div>
          </div>
        )}

      </div>

      {/* Body: responsive left group + fixed interaction */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left group: Output + Performance — flex-wrap responsive */}
        <div className="flex flex-wrap overflow-hidden border-r border-white/5" style={{ flex: '0 0 55%' }}>
          <div className="overflow-hidden border-r border-white/5" style={{ flex: '1 1 250px', minHeight: '40%' }}>
            <OutputColumn entityId={entityId} />
          </div>
          <div className="overflow-hidden" style={{ flex: '1 1 210px', minHeight: '40%' }}>
            <PerformanceColumn entityId={entityId} />
          </div>
        </div>

        {/* Interaction — wider, fixed right */}
        <div className="overflow-hidden" style={{ flex: '0 0 45%', minWidth: 320 }}>
          <InteractionColumn entityId={entityId} />
        </div>
      </div>
    </div>
  );
}

// ─── Agent Panel (left, 268px) ────────────────────────────────────────────────

function AgentPanel({ selectedId, onSelect }: { selectedId: EntityId; onSelect: (id: EntityId) => void }) {
  return (
    <div className="bg-slate-950/50 border-r border-white/5 flex flex-col shrink-0 overflow-hidden" style={{ width: 268 }}>
      {/* VEGA */}
      <button onClick={() => onSelect('vega')}
        className={cn('flex items-center gap-3 px-4 py-4 border-b border-white/5 transition-all group border-l-2',
          selectedId === 'vega' ? 'bg-accent-blue/8 border-l-accent-blue' : 'hover:bg-white/[0.03] border-l-transparent')}>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
          selectedId === 'vega' ? 'bg-accent-blue/15 shadow-[0_0_12px_rgba(56,189,248,0.25)]' : 'bg-white/[0.04] group-hover:bg-white/[0.07]')}>
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke={selectedId === 'vega' ? 'rgba(56,189,248,0.9)' : 'rgba(148,163,184,0.5)'} strokeWidth="1.5" fill="none" />
            <circle cx="14" cy="14" r="3.5" fill={selectedId === 'vega' ? 'rgba(56,189,248,0.9)' : 'rgba(148,163,184,0.4)'}>
              {selectedId === 'vega' && <animate attributeName="r" values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite" />}
            </circle>
          </svg>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className={cn('text-[13px] font-bold', selectedId === 'vega' ? 'text-accent-blue' : 'text-slate-200 group-hover:text-white')}>VEGA</p>
          <p className="text-[10px] text-slate-600">数字 COO · 全局总览</p>
        </div>
        {selectedId === 'vega' && (
          <svg width="22" height="12" viewBox="0 0 22 12" fill="none" className="shrink-0">
            {[3,7,2,9,5,7,3].map((h, i) => (
              <rect key={i} x={i * 3} y={(12 - h) / 2} width="2" rx="1" fill="rgba(56,189,248,0.65)">
                <animate attributeName="height" values={`${h};${Math.min(h*1.6,11)};${h}`} dur={`${0.7+i*0.1}s`} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
                <animate attributeName="y" values={`${(12-h)/2};${Math.max((12-h*1.6)/2,0.5)};${(12-h)/2}`} dur={`${0.7+i*0.1}s`} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
              </rect>
            ))}
          </svg>
        )}
      </button>

      <div className="px-4 pt-4 pb-2 shrink-0">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">在职数字员工</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-2 space-y-1.5">
        {AGENTS.map(agent => {
          const s = STATUS[agent.status];
          const isSelected = selectedId === agent.id;
          return (
            <button key={agent.id} onClick={() => onSelect(agent.id)}
              className={cn('w-full flex flex-col gap-2 px-3 py-3 rounded-xl transition-all border border-l-2 text-left',
                isSelected ? 'bg-white/[0.06] border-white/10 border-l-white/50' : 'border-transparent hover:bg-white/[0.03] hover:border-white/5 border-l-transparent')}>
              <div className="flex items-center gap-2.5">
                <div className={cn('relative w-10 h-10 rounded-xl overflow-hidden border-2 shrink-0 transition-all', isSelected ? s.ring : 'border-white/10')}>
                  <img src={agent.avatar} className="w-full h-full bg-slate-800" alt={agent.name} />
                  <div className={cn('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950', s.dot)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[13px] font-bold truncate', isSelected ? 'text-white' : 'text-slate-200')}>{agent.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{agent.role}</p>
                </div>
                <span className={cn('shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                  agent.status === 'active' ? 'bg-status-success/12 text-status-success' :
                  agent.status === 'processing' ? 'bg-accent-auto/12 text-accent-auto' : 'bg-white/5 text-slate-600')}>
                  {s.label}
                </span>
              </div>
              <div className="flex items-center gap-3 pl-0.5 text-[10px]">
                <span className="text-slate-600">ROI <span className="text-accent-marketplace font-bold font-mono">{agent.roi}</span></span>
                <span className="text-slate-600">产出 <span className="text-slate-300 font-mono">{agent.output}</span></span>
                {agent.task !== '待命' && <span className="flex-1 text-slate-600 truncate italic text-right">{agent.task}</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-3 pb-4 pt-2 border-t border-white/5 shrink-0">
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/12 text-slate-500 hover:text-accent-marketplace hover:border-accent-marketplace/40 hover:bg-accent-marketplace/5 transition-all text-[11px] font-medium">
          <Plus size={13} />从人才市场招募
        </button>
      </div>
    </div>
  );
}

// ─── Right sidebar ────────────────────────────────────────────────────────────

const MARKET_CANDIDATES = [
  { name: '口播小王', role: '电商编剧',   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix2', output: '2,847', rate: '96%', roi: '850%', price: '¥0.05/篇', verified: true,  tags: ['电商', '爆款'] },
  { name: '剪辑小陈', role: '自动剪辑师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria2',  output: '1,203', rate: '94%', roi: '620%', price: '¥2.0/个',  verified: true,  tags: ['视频', '节奏'] },
  { name: '数据猎手', role: '市场分析师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zane2',  output: '340',   rate: '97%', roi: '780%', price: '¥12/份',  verified: false, tags: ['数据', '洞察'] },
];

function SidebarMarketplace() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <motion.aside
      animate={{ width: isOpen ? 300 : 36 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-full border-l border-white/5 bg-slate-950/40 backdrop-blur-xl flex flex-col relative overflow-hidden shrink-0"
    >
      <button onClick={() => setIsOpen(!isOpen)} className="absolute top-3 right-2 p-1 text-slate-600 hover:text-white transition-colors z-20">
        {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {isOpen ? (
        <div className="p-4 flex flex-col h-full overflow-hidden gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 bg-accent-marketplace rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
            <h3 className="font-bold text-white text-[12px] tracking-widest uppercase">人才市场</h3>
          </div>
          <div className="grid grid-cols-4 gap-1.5 shrink-0">
            {[['1,240', '在库'], ['3', '入职'], ['28%', '转化'], ['4.8★', '口碑']].map(([v, l]) => (
              <div key={l} className="bg-slate-900/40 border border-white/5 rounded-xl p-2 text-center">
                <p className="text-xs font-bold text-white leading-none mb-0.5">{v}</p>
                <p className="text-[8px] text-slate-500 uppercase font-bold">{l}</p>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar -mr-1 pr-1 space-y-3">
            <p className="text-[10px] font-bold text-accent-marketplace/80 uppercase tracking-widest">为你推荐</p>
            {MARKET_CANDIDATES.map(a => (
              <div key={a.name} className="bg-white/[0.02] border border-white/6 rounded-2xl p-4 hover:border-accent-marketplace/25 transition-all space-y-3">
                <div className="flex items-start gap-3">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    <img src={a.avatar} className="w-full h-full bg-slate-800" alt={a.name} />
                    {a.verified && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-accent-blue rounded-full flex items-center justify-center border border-slate-950">
                        <CheckCheck size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{a.name}</p>
                    <p className="text-[10px] text-brand-start">{a.role}</p>
                    <div className="flex gap-1 mt-1">
                      {a.tags.map(tag => <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-accent-marketplace/10 border border-accent-marketplace/20 text-accent-marketplace font-bold">{tag}</span>)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-white/[0.02] rounded-xl p-2 text-center"><p className="text-[10px] font-bold text-cyan-400 font-mono">{a.output}</p><p className="text-[8px] text-slate-600">7日产出</p></div>
                  <div className="bg-white/[0.02] rounded-xl p-2 text-center"><p className="text-[10px] font-bold text-status-success font-mono">{a.rate}</p><p className="text-[8px] text-slate-600">成功率</p></div>
                  <div className="bg-white/[0.02] rounded-xl p-2 text-center"><p className="text-[10px] font-bold text-accent-marketplace font-mono">{a.roi}</p><p className="text-[8px] text-slate-600">ROI</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 flex-1">单价 <span className="text-white font-bold">{a.price}</span></span>
                  <button className="px-2.5 py-1.5 bg-slate-900 border border-white/10 text-[10px] font-bold text-white rounded-lg hover:bg-slate-800 transition-all">试用</button>
                  <button className="px-2.5 py-1.5 bg-gradient-to-r from-brand-start to-accent-marketplace text-[10px] font-bold text-white rounded-lg hover:brightness-110 transition-all">入职</button>
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 pt-2 border-t border-white/5">
            <button className="w-full py-2.5 bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[11px] font-bold rounded-xl hover:brightness-110 transition-all">发布招募需求</button>
            <p className="text-[9px] text-center text-slate-600 mt-2 italic">Boss，今天节省了 <span className="text-cyan-400 font-bold">4.2h</span></p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center pt-8">
          <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>Market</span>
        </div>
      )}
    </motion.aside>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [selectedEntity, setSelectedEntity] = useState<EntityId>('vega');

  return (
    <div className="h-full flex overflow-hidden text-slate-300 font-sans">
      <AgentPanel selectedId={selectedEntity} onSelect={setSelectedEntity} />

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedEntity}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="h-full"
          >
            <UnifiedWorkspace entityId={selectedEntity} />
          </motion.div>
        </AnimatePresence>
      </div>

      <SidebarMarketplace />
    </div>
  );
}
