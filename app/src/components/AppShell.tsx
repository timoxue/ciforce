import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Settings, Trophy, History, LayoutDashboard, ShoppingBag, Code2, ChevronLeft } from 'lucide-react';
import { useWorkspaceStore, useVegaStore, type ActiveTab } from '../store/useAppStore';
import { cn } from '../lib/utils';
import DashboardContent from '../pages/dashboard/Dashboard';
import MarketplaceContent from '../pages/marketplace/Marketplace';
import ProviderContent from '../pages/provider/Console';
import VegaDrawer from './VegaDrawer';

const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: 'workspace',    label: '工作台',       icon: <LayoutDashboard size={14} /> },
  { id: 'marketplace',  label: '人才市场',     icon: <ShoppingBag size={14} /> },
  { id: 'provider',     label: '开发商控制台', icon: <Code2 size={14} /> },
];

// Bar heights cycle for each of the 4 waveform bars
const WAVE_BARS = [
  { h: [3, 10, 5, 14, 3], dur: '0.9s' },
  { h: [8, 3, 14, 5, 8],  dur: '1.1s' },
  { h: [5, 14, 3, 10, 5], dur: '0.8s' },
  { h: [12, 5, 8, 3, 12], dur: '1.0s' },
];

function VegaWaveform({ active }: { active: boolean }) {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" className="shrink-0">
      {WAVE_BARS.map((bar, i) => {
        const x = 2 + i * 5;
        const vals = bar.h.join(';');
        return (
          <rect key={i} x={x} rx="1.5" width="3"
            fill={active ? 'rgba(56,189,248,1)' : 'rgba(56,189,248,0.55)'}
            style={{ filter: active ? 'drop-shadow(0 0 3px rgba(56,189,248,0.8))' : 'none' }}
          >
            <animate
              attributeName="height"
              values={vals}
              dur={bar.dur}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
            />
            <animate
              attributeName="y"
              values={bar.h.map(h => (16 - h) / 2).join(';')}
              dur={bar.dur}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
            />
          </rect>
        );
      })}
    </svg>
  );
}

function VegaTopBarIcon() {
  const { drawerOpen, openDrawer, closeDrawer } = useVegaStore();
  const PENDING = 3;

  return (
    <button
      onClick={drawerOpen ? closeDrawer : openDrawer}
      title="VEGA 数字 COO"
      className={cn(
        'group relative flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border transition-all duration-200',
        drawerOpen
          ? 'bg-accent-blue/15 border-accent-blue/40'
          : 'border-accent-blue/20 bg-accent-blue/5 hover:bg-accent-blue/12 hover:border-accent-blue/40'
      )}
    >
      {/* Waveform */}
      <VegaWaveform active={drawerOpen} />

      {/* Label area */}
      <div className="relative hidden sm:block overflow-hidden" style={{ width: 52 }}>
        {/* Default: "VEGA" + status dot */}
        <span className={cn(
          'absolute inset-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-200',
          drawerOpen ? 'text-accent-blue' : 'text-slate-300',
          'group-hover:opacity-0 group-hover:-translate-y-2'
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shrink-0">
            <span className="absolute w-1.5 h-1.5 rounded-full bg-accent-blue animate-ping opacity-50" />
          </span>
          VEGA
        </span>
        {/* Hover: pending count */}
        <span className="absolute inset-0 flex items-center text-[10px] font-bold text-accent-blue transition-all duration-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 whitespace-nowrap">
          {PENDING} 条建议
        </span>
        <span className="invisible text-[10px] font-bold">VEGA·</span>
      </div>
    </button>
  );
}

export default function AppShell() {
  const { mode, setMode, activeTab, setActiveTab } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as { tab?: ActiveTab } | null;
    if (state?.tab) setActiveTab(state.tab);
  }, []);

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col overflow-hidden text-slate-300 font-sans">
      {/* ── TopBar — unified with /quant style ── */}
      <header className="h-12 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[#06091a]/90 backdrop-blur-md sticky top-0 z-50 shrink-0">

        {/* Left: Logo + label */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-brand-start to-accent-blue rounded flex items-center justify-center font-bold text-[10px] text-white select-none">CI</div>
            <span className="font-bold tracking-tight text-white text-[14px]">CIFORCE</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-[11px] text-slate-500">数字劳动力平台</span>
        </div>

        {/* Center: Main tabs — same container style as /quant */}
        <nav className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
          {/* Back to canvas */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all border border-transparent"
          >
            <ChevronLeft size={12} />编排画布
          </button>

          <div className="w-px h-4 bg-white/[0.08] mx-0.5" />

          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                activeTab === tab.id
                  ? 'bg-brand-start/20 text-white border border-brand-start/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              )}
            >
              <span className={cn('transition-colors', activeTab === tab.id ? 'text-brand-start' : 'text-slate-600')}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: VEGA + mode + user */}
        <div className="flex items-center gap-3">
          <VegaTopBarIcon />
          <div className="h-4 w-px bg-white/8" />

          {activeTab === 'workspace' && (
            <div className="flex items-center bg-slate-950/60 border border-white/10 rounded-lg p-0.5">
              <button onClick={() => setMode('coach')}
                className={cn('px-3 py-1 rounded-md text-[10px] font-bold transition-all',
                  mode === 'coach' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'
                )}>COACH</button>
              <button onClick={() => setMode('auto')}
                className={cn('px-3 py-1 rounded-md text-[10px] font-bold transition-all',
                  mode === 'auto' ? 'bg-brand-start text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]' : 'text-slate-500 hover:text-slate-400'
                )}>AUTO</button>
            </div>
          )}

          <button className="p-1.5 text-slate-500 hover:text-white transition-colors"><Bell size={15} /></button>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-brand-start cursor-pointer select-none">DX</div>
        </div>
      </header>

      {/* ── Tab Content ── */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="h-full"
          >
            {activeTab === 'workspace'   && <DashboardContent />}
            {activeTab === 'marketplace' && <MarketplaceContent />}
            {activeTab === 'provider'    && <ProviderContent />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom Dock ── */}
      <footer className="h-10 border-t border-white/5 bg-bg-dark/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-40">
        <div className="flex items-center gap-5">
          <button onClick={() => setActiveTab('workspace')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors group">
            <Trophy size={13} className="group-hover:text-status-success transition-colors" />
            <span className="text-[10px] font-medium tracking-tight">绩效中心</span>
          </button>
          <button onClick={() => setActiveTab('workspace')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors">
            <History size={13} />
            <span className="text-[10px] font-medium tracking-tight">存档室</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-status-success rounded-full opacity-80" />
            <span className="text-[9px] text-slate-600 font-mono tracking-tighter uppercase">Status: Operating stably</span>
          </div>
          <div className="h-4 w-px bg-white/5" />
          <button className="p-1 text-slate-600 hover:text-slate-400 transition-colors"><Settings size={13} /></button>
        </div>
      </footer>

      {/* ── VEGA Drawer (global) ── */}
      <VegaDrawer />
    </div>
  );
}
