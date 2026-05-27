import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  Settings, 
  ArrowUpRight, 
  Users, 
  DollarSign, 
  Layout, 
  Play, 
  Code,
  Plus,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function ProviderConsole() {
  const navigate = useNavigate();
  return (
    <div className="h-full overflow-y-auto text-slate-300 font-sans custom-scrollbar">
      {/* Provider sub-nav */}
      <div className="border-b border-white/5 px-8 py-2 flex items-center justify-between sticky top-0 bg-bg-dark/90 backdrop-blur-md z-10">
        <nav className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest">
          <a href="#" className="text-emerald-500">概览</a>
          <a href="#" className="text-slate-500 hover:text-white transition-colors">Agent 管理</a>
          <a href="#" className="text-slate-500 hover:text-white transition-colors">API 文档</a>
        </nav>
        <button className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all">
          <Plus size={13} />
          <span>上架新 Agent</span>
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-12 gap-8">
        {/* Left Stats & Main Charts (8 col) */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <ProviderStatCard label="总收益" value="￥245,210" trend="+18.5%" isUp />
              <ProviderStatCard label="累积入职" value="1,402 次" trend="+12.3%" isUp />
              <ProviderStatCard label="活跃试用" value="842 人" trend="-2.1%" isUp={false} />
           </div>

           <div className="business-card p-8 bg-slate-900/40">
              <div className="flex items-center justify-between mb-10">
                 <h2 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 size={16} className="text-emerald-500" />
                    收益漏斗分析
                 </h2>
                 <select className="bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-[10px] text-slate-500 font-bold uppercase outline-none focus:border-emerald-500/50 transition-all">
                   <option>最近 30 天</option>
                   <option>最近 90 天</option>
                 </select>
              </div>
              
              <div className="space-y-8">
                 <FunnelStep label="人才市场曝光" value="45,000" percent={100} />
                 <FunnelStep label="详情页点击" value="12,400" percent={27.5} />
                 <FunnelStep label="试用启动" value="3,200" percent={25.8} color="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                 <FunnelStep label="正式入职" value="840" percent={26.2} color="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
              </div>
           </div>

           <div className="business-card p-8 bg-slate-900/40">
              <h2 className="text-[11px] font-bold text-white uppercase tracking-widest mb-8">管理我的资产</h2>
              <div className="space-y-4">
                 <AgentStatusItem name="小王" agentId="agent-1" status="在线 / 稳定" downloads="1.2k" income="￥12,400" />
                 <AgentStatusItem name="代码禅师" agentId="agent-5" status="在线 / 稳定" downloads="842" income="￥5,200" />
                 <AgentStatusItem name="数据侠" agentId="agent-4" status="开发中" downloads="0" income="￥0" opacity />
              </div>
           </div>
        </div>

        {/* Right Sidebar (4 col) */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
           <div className="business-card p-8 bg-linear-to-br from-emerald-500/[0.03] to-transparent border-emerald-500/20">
              <h3 className="text-emerald-500 font-bold text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Cpu size={18} />
                 职场模拟器
              </h3>
              <p className="text-xs text-slate-400 mb-8 leading-relaxed font-medium">在发布前，将你的 Agent 放入 CIForce 企业环境进行模拟压力测试，获取绩效预估报告。</p>
              <button
                onClick={() => navigate('/provider/simulator')}
                className="w-full py-4 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-emerald-500/10"
              >
                <Play size={18} fill="currentColor" />
                <span>进入模拟器</span>
              </button>
           </div>

           <div className="business-card p-8 bg-slate-900/40">
              <h3 className="text-white font-bold text-[11px] uppercase tracking-widest mb-8">上架路线图</h3>
              <div className="space-y-8 font-sans">
                 <GuideStep num={1} title="定义能力协议" desc="标准化 IO 接口，确保语义握手。" active />
                 <GuideStep num={2} title="注入知识矩阵" desc="上传领域知识库与偏好模版。" />
                 <GuideStep num={3} title="策略定价" desc="设置单次任务定价或分成比例。" />
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

function ProviderStatCard({ label, value, trend, isUp }: any) {
  return (
    <div className="glass-panel p-6 border-white/5">
       <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">{label}</p>
       <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-white">{value}</span>
          <span className={cn("text-xs font-bold", isUp ? "text-emerald-500" : "text-red-500")}>
            {trend} {isUp ? '↑' : '↓'}
          </span>
       </div>
    </div>
  );
}

function FunnelStep({ label, value, percent, color }: any) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between items-end">
          <span className="text-xs font-medium text-slate-400">{label}</span>
          <div className="text-right">
             <span className="text-sm font-bold text-white">{value}</span>
             <span className="text-[10px] text-slate-500 ml-2">({percent}%)</span>
          </div>
       </div>
       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn("h-full", color || "bg-indigo-500")} 
          />
       </div>
    </div>
  );
}

function AgentStatusItem({ name, agentId, status, downloads, income, opacity }: any) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => agentId && navigate(`/provider/simulator/${agentId}`)}
      className={cn("flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-emerald-500/20 transition-all cursor-pointer", opacity && "opacity-50")}
    >
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

function GuideStep({ num, title, desc, active }: any) {
  return (
    <div className="flex items-start space-x-4">
       <div className={cn(
         "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
         active ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-slate-500 border border-white/10"
       )}>
          {num}
       </div>
       <div>
          <h4 className={cn("text-xs font-bold mb-1", active ? "text-white" : "text-slate-400")}>{title}</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
       </div>
    </div>
  );
}
