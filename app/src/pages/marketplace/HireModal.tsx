import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, AlertTriangle, Info, Heart,
  ChevronRight, ChevronLeft,
} from 'lucide-react';
import { useMarketplaceStore, useAgentStore } from '../../store/useAppStore';
import { marketplaceAgents, handshakeMatrix } from '../../mocks/fixtures';
import type { JobSpec } from '../../types';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

const CHANNELS = ['小红书', '抖音', '微博', '视频号', '私域', '全渠道'];
const CONTENT_TAGS = ['爆款标题', '带 Emoji', '含 Hashtag', '口语化', '专业风格', '500字内'];

const defaultJobSpec = (): Partial<JobSpec> => ({
  channels: [],
  contentTags: [],
  scenario: '',
  qualityThreshold: 85,
});

export default function HireModal() {
  const navigate = useNavigate();
  const { hireModalOpen, hireModalAgentIds, closeHireModal, clearCompare } = useMarketplaceStore();
  const { hireAgent } = useAgentStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [jobSpec, setJobSpec] = useState<Partial<JobSpec>>(defaultJobSpec());
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const agents = hireModalAgentIds
    .map((id) => marketplaceAgents.find((a) => a.id === id))
    .filter(Boolean) as typeof marketplaceAgents;

  const isTeam = agents.length >= 2;

  const pairs = agents.slice(0, -1).map((a, i) => ({
    from: a,
    to: agents[i + 1],
    status: handshakeMatrix[a.id]?.[agents[i + 1].id] ?? 'warn',
  }));

  const handleClose = () => {
    closeHireModal();
    setStep(1);
    setJobSpec(defaultJobSpec());
  };

  const handleConfirm = () => {
    agents.forEach((a) => hireAgent(a, jobSpec as JobSpec));

    const newHearts = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 30,
    }));
    setHearts(newHearts);
    setStep(3);

    setTimeout(() => setHearts([]), 1800);
  };

  const toggleChannel = (ch: string) => {
    setJobSpec((prev) => {
      const list = prev.channels ?? [];
      return {
        ...prev,
        channels: list.includes(ch) ? list.filter((x) => x !== ch) : [...list, ch],
      };
    });
  };

  const toggleTag = (tag: string) => {
    setJobSpec((prev) => {
      const list = prev.contentTags ?? [];
      return {
        ...prev,
        contentTags: list.includes(tag) ? list.filter((x) => x !== tag) : [...list, tag],
      };
    });
  };

  const stepLabels = ['协议', '配置', '确认'];

  return (
    <AnimatePresence>
      {hireModalOpen && (
        <>
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={step !== 3 ? handleClose : undefined}
          />

          <motion.div
            key="modal"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md mx-4 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
              {/* Confetti Hearts */}
              {hearts.map((h) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -80, scale: 1.4 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute pointer-events-none text-pink-400 text-2xl z-10"
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                >
                  ❤️
                </motion.div>
              ))}

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">
                  {step === 3 ? '入职成功' : isTeam ? '确认组队入职' : '确认入职'}
                </h3>
                {step !== 3 && (
                  <button onClick={handleClose} className="p-1.5 text-slate-600 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Steps Bar */}
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
                        )}>
                          {label}
                        </span>
                      </div>
                      {i < 2 && <div className="flex-1 h-px bg-white/5 mx-1 max-w-[24px]" />}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Step Content */}
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                    <div className="px-6 py-5 space-y-4">
                      <div className={cn('flex gap-3', isTeam ? 'justify-center' : '')}>
                        {agents.map((a) => (
                          <div key={a.id} className={cn('flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl', isTeam ? 'flex-col text-center w-28' : 'flex-1')}>
                            <img src={a.avatar} className={cn('bg-slate-900 rounded-xl border border-white/10', isTeam ? 'w-14 h-14' : 'w-12 h-12')} alt={a.name} />
                            <div>
                              <p className="text-sm font-bold text-white">{a.name}</p>
                              <p className="text-[10px] text-slate-500">{a.role}</p>
                              <p className="text-[10px] text-accent-marketplace font-mono mt-0.5">{a.metrics.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {!isTeam && (
                        <div className="flex items-start gap-2.5 p-3 bg-brand-start/5 border border-brand-start/15 rounded-xl">
                          <Info size={14} className="text-brand-start shrink-0 mt-0.5" />
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            该 Agent 可<span className="text-white font-medium">独立运行</span>，无需与其他 Agent 握手对齐。入职后可在工作台手动区直接下任务，或后续加入 Pipeline 自动运行。
                          </p>
                        </div>
                      )}

                      {isTeam && pairs.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">语义握手预检</p>
                          <div className="space-y-2">
                            {pairs.map((p, i) => (
                              <div key={i} className={cn(
                                'flex items-center justify-between px-3 py-2 rounded-xl border text-[11px]',
                                p.status === 'ok' ? 'bg-status-success/5 border-status-success/20' : 'bg-status-warning/5 border-status-warning/20',
                              )}>
                                <span className="text-slate-300 font-medium">{p.from.name} → {p.to.name}</span>
                                {p.status === 'ok' ? (
                                  <span className="flex items-center gap-1 text-status-success font-bold"><Check size={11} />协议兼容，自动连线</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-status-warning font-bold"><AlertTriangle size={11} />需手动配置</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isTeam && (
                        <div className="flex items-start gap-2.5 p-3 bg-accent-auto/5 border border-accent-auto/15 rounded-xl">
                          <Info size={14} className="text-accent-auto shrink-0 mt-0.5" />
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            入职后将在工作台<span className="text-white font-medium">自动连线</span>为 Pipeline，兼容的 Agent 对之间立即可运行。
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="px-6 pb-5 flex gap-3">
                      <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold hover:bg-white/10 hover:text-white transition-all">
                        取消
                      </button>
                      <button
                        onClick={() => setStep(2)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent-marketplace/20 flex items-center justify-center gap-1.5"
                      >
                        下一步 <ChevronRight size={13} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                    <div className="px-6 py-5 space-y-4">
                      {/* 渠道 */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">目标渠道</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {CHANNELS.map((ch) => {
                            const sel = (jobSpec.channels ?? []).includes(ch);
                            return (
                              <button
                                key={ch}
                                onClick={() => toggleChannel(ch)}
                                className={cn(
                                  'py-2 rounded-lg border text-[10px] font-bold transition-all',
                                  sel
                                    ? 'bg-accent-marketplace/15 border-accent-marketplace/40 text-accent-marketplace'
                                    : 'bg-white/[0.02] border-white/[0.08] text-slate-500 hover:border-white/20 hover:text-slate-300',
                                )}
                              >
                                {ch}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 内容要求 */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">内容要求</p>
                        <div className="flex flex-wrap gap-1.5">
                          {CONTENT_TAGS.map((tag) => {
                            const sel = (jobSpec.contentTags ?? []).includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={cn(
                                  'px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
                                  sel
                                    ? 'bg-accent-marketplace/15 border-accent-marketplace/40 text-accent-marketplace'
                                    : 'bg-white/[0.02] border-white/[0.08] text-slate-500 hover:border-white/20',
                                )}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 业务场景 */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">业务场景</p>
                        <textarea
                          value={jobSpec.scenario ?? ''}
                          onChange={(e) => setJobSpec((p) => ({ ...p, scenario: e.target.value }))}
                          placeholder="描述业务场景，如：618大促防晒霜推广，目标 18-25 岁女性..."
                          rows={2}
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[11px] text-slate-300 placeholder:text-slate-700 outline-none focus:border-accent-marketplace/40 transition-all resize-none leading-relaxed"
                        />
                      </div>

                      {/* 合格率基准 */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">合格率基准</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={60}
                            max={99}
                            value={jobSpec.qualityThreshold ?? 85}
                            onChange={(e) => setJobSpec((p) => ({ ...p, qualityThreshold: Number(e.target.value) }))}
                            className="w-16 h-8 text-center bg-white/[0.02] border border-white/[0.08] rounded-lg text-sm font-bold font-mono text-status-success outline-none focus:border-status-success/40 transition-all"
                          />
                          <span className="text-[10px] text-slate-500">% 以上视为合格输出</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 pb-5 flex gap-3">
                      <button
                        onClick={() => setStep(1)}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-1"
                      >
                        <ChevronLeft size={13} /> 返回
                      </button>
                      <button
                        onClick={handleConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-marketplace to-brand-end text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent-marketplace/20 flex items-center justify-center gap-1.5"
                      >
                        <Heart size={13} /> 确认入职
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                    <div className="px-6 py-8 text-center">
                      <div className="text-4xl mb-4">🎉</div>
                      <h4 className="text-base font-bold text-white mb-2">
                        {agents.map((a) => a.name).join(' & ')} 已入职！
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
                        {(jobSpec.channels ?? []).length > 0 && (
                          <span>渠道：{(jobSpec.channels ?? []).join(' / ')} · </span>
                        )}
                        基准：≥{jobSpec.qualityThreshold ?? 85}%
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            handleClose();
                            navigate('/dashboard');
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-accent-marketplace/10 border border-accent-marketplace/20 text-accent-marketplace text-[11px] font-bold hover:bg-accent-marketplace/20 transition-all"
                        >
                          前往工作台
                        </button>
                        <button
                          onClick={() => {
                            clearCompare();
                            setStep(1);
                            setJobSpec(defaultJobSpec());
                            closeHireModal();
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success text-[11px] font-bold hover:bg-status-success/20 transition-all"
                        >
                          继续招募
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
