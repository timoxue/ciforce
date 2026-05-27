import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cpu, Play, ChevronLeft, Download, History,
  ArrowUpRight, CheckCircle2, AlertCircle, XCircle,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { marketplaceAgents } from '../../mocks/fixtures';
import { useSimulatorStore, useAgentStore, useWorkspaceStore } from '../../store/useAppStore';
import type { SimParams, SimScenario } from '../../types';
import { cn } from '../../lib/utils';

const CHANNELS = ['小红书', '抖音', '全渠道（3平台）'];
const SCENARIO_TAGS = ['电商促销', '品牌种草', '节日营销', '日常运营'];
const CONCURRENCY_OPTIONS = [10, 50, 200] as const;

export default function ProviderSimulator() {
  const { agentId } = useParams<{ agentId?: string }>();
  const navigate = useNavigate();
  const { status, report, runSimulation, resetReport } = useSimulatorStore();
  const { hiredAgents } = useAgentStore();
  const { setActiveTab } = useWorkspaceStore();

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
            onClick={() => { setActiveTab('provider'); navigate('/app'); }}
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
          onClick={() => { setActiveTab('provider'); navigate('/app'); }}
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
                <img
                  src={agent.avatar}
                  className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 shrink-0"
                  alt={agent.name}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{agent.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{agent.role} · {agent.provider?.name}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] shrink-0" />
              </div>
            ) : (
              <div className="p-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-[11px] text-slate-500 text-center">
                请先在 Agent 管理中选择测试目标
              </div>
            )}
          </div>

          <div className="h-px bg-white/5" />

          {/* Params */}
          <div className="flex flex-col gap-4">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">模拟参数</p>

            {/* Channel */}
            <div>
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">目标渠道</p>
              <select
                value={params.channel}
                onChange={(e) => setParams((p) => ({ ...p, channel: e.target.value }))}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[11px] text-slate-300 outline-none focus:border-emerald-500/40 transition-all appearance-none cursor-pointer"
              >
                {CHANNELS.map((ch) => <option key={ch}>{ch}</option>)}
              </select>
            </div>

            {/* Scenario Tags */}
            <div>
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
                          : 'bg-white/[0.02] border-white/[0.08] text-slate-500 hover:border-white/20',
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Concurrency */}
            <div>
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
                        : 'bg-white/[0.02] border-white/[0.08] text-slate-500 hover:border-white/20',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold */}
            <div>
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">
                合格率基准
                {jobSpec && (
                  <span className="ml-1.5 text-emerald-500/60 normal-case font-normal tracking-normal">
                    (来自 JobSpec)
                  </span>
                )}
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
                  <KpiCard
                    label="综合通过率"
                    value={`${report.overallPassRate}%`}
                    color={report.overallPassRate >= params.qualityThreshold ? 'green' : 'yellow'}
                  />
                  <KpiCard label="平均延迟" value={`${report.avgLatencyMs}ms`} color="blue" />
                  <KpiCard
                    label="失败率"
                    value={`${report.failRate}%`}
                    color={report.failRate > 10 ? 'red' : 'yellow'}
                  />
                  <KpiCard label="完成测试" value={`${report.totalTests}/${report.totalTests}`} color="slate" />
                </div>

                {/* Scenario Breakdown */}
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3">场景分项结果</p>
                <div className="space-y-2 mb-5">
                  {report.scenarios.map((sc, i) => (
                    <React.Fragment key={i}>
                      <ScenarioRow scenario={sc} />
                    </React.Fragment>
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
                  <button className="flex-1 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-500 text-[10px] font-bold hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest">
                    <Download size={13} /> 下载报告
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-500 text-[10px] font-bold hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest">
                    <History size={13} /> 历史记录
                  </button>
                  <button
                    className={cn(
                      'flex-[2] py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest',
                      passed
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95'
                        : 'bg-white/[0.03] border border-white/[0.08] text-slate-600 cursor-not-allowed opacity-60',
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

function KpiCard({ label, value, color }: {
  label: string;
  value: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'slate';
}) {
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

function ScenarioRow({ scenario }: { scenario: SimScenario }) {
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
