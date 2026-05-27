import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore, useWorkspaceStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import VegaHUD from '../../components/VegaHUD';
import { Heart, Zap, Check } from 'lucide-react';

export default function Act4() {
  const navigate = useNavigate();
  const setFlag = useOnboardingStore((s) => s.setFlag);
  const setWorkspaceMode = useWorkspaceStore((s) => s.setMode);
  const markOnboardingDone = useAuthStore((s) => s.markOnboardingDone);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isAuto, setIsAuto] = useState(false);

  const handleFeedback = () => {
    setFeedbackSent(true);
    setFlag('first_feedback_submitted', true);
  };

  const handleAuthorizeAuto = () => {
    if (!feedbackSent || isAuto) return;
    setIsAuto(true);
    setFlag('auto_mode_previewed', true);
    setWorkspaceMode('auto');
    // Persist onboarding completion to the server so future logins skip Acts.
    markOnboardingDone();
    setTimeout(() => navigate('/dashboard'), 2600);
  };

  const vegaMessage = isAuto
    ? '感谢授权。CIForce 已进入全速运转，我会持续监控并优化团队表现。'
    : feedbackSent
    ? '偏好已写入小王的记忆模块。团队完成磨合，建议切换至自主运营模式。'
    : '小王完成了第一条输出。如果您认可这个风格，请点赞——我会将其作为偏好基准。';

  return (
    <div className="relative min-h-screen bg-[#020617] flex flex-col items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,1) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <div className="w-full max-w-lg z-10 mb-28 space-y-6">
        {/* Output card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-6 transition-all duration-500 backdrop-blur-sm ${feedbackSent ? 'opacity-50 border-white/5 bg-slate-900/40' : 'border-white/10 bg-slate-900/80 ring-2 ring-brand-start/20 shadow-2xl shadow-brand-start/10'}`}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-10 h-10 rounded-xl bg-slate-800" alt="小王" />
              <div>
                <p className="text-sm font-bold text-white">小王 · 已完成草稿</p>
                <p className="text-[10px] text-slate-500 font-mono">刚刚</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[9px] font-bold rounded border border-yellow-500/20 uppercase">待确认</span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed italic mb-5">
            "关于智能生产力的三种趋势预测：1. 自动化流水线化 2. 人才 Agent 规模化 3. 个性化带教核心化..."
          </p>

          <button
            onClick={handleFeedback} disabled={feedbackSent}
            className="flex items-center gap-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 border border-pink-500/20 px-4 py-2 rounded-xl transition-colors group disabled:opacity-60"
          >
            <Heart className={`w-4 h-4 ${feedbackSent ? 'fill-current' : 'group-hover:scale-125 transition-transform'}`} />
            <span className="text-sm font-medium">{feedbackSent ? '偏好已记录' : '认可此风格'}</span>
          </button>
        </motion.div>

        {/* Auto authorization */}
        <AnimatePresence>
          {feedbackSent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-5 pt-4"
            >
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Zap size={14} className="text-accent-blue" />
                <span>团队磨合完成，可切换至自主运营模式</span>
              </div>

              <div className="flex items-center gap-4 bg-slate-900/80 border border-white/10 p-1.5 rounded-2xl backdrop-blur-sm">
                <div className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${!isAuto ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-600'}`}>
                  COACH
                </div>
                <button
                  onClick={handleAuthorizeAuto}
                  className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isAuto ? 'bg-gradient-to-r from-accent-auto to-brand-start text-white shadow-xl animate-pulse' : 'text-slate-400 hover:text-white'}`}
                >
                  <Zap size={14} className={isAuto ? 'fill-current' : ''} />
                  AUTO
                </button>
              </div>

              {!isAuto && (
                <p className="text-[11px] text-slate-600 font-mono tracking-widest animate-pulse">
                  授权后 VEGA 将全权管理数字员工团队
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full-screen launch animation */}
      <AnimatePresence>
        {isAuto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]"
          >
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 80 }} className="flex flex-col items-center gap-6">
              <svg width="80" height="80" viewBox="0 0 28 28" fill="none">
                <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="rgba(56,189,248,0.9)" strokeWidth="1.5" fill="rgba(56,189,248,0.08)" />
                <polygon points="14,6 22,10 22,18 14,22 6,18 6,10" stroke="rgba(99,102,241,0.6)" strokeWidth="1" fill="rgba(99,102,241,0.05)" />
                <circle cx="14" cy="14" r="4" fill="rgba(56,189,248,1)">
                  <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </svg>
              <div className="text-center">
                <p className="text-2xl font-bold text-white tracking-widest uppercase mb-2">VEGA 全速运转中</p>
                <p className="text-slate-500 text-sm font-mono">WORKFORCE INITIALIZING...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <VegaHUD visible message={vegaMessage} />
    </div>
  );
}
