import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../store/useAppStore';

const BOOT_LINES = [
  { text: '> VEGA_CORE............LOADING', delay: 0 },
  { text: '> NEURAL_MESH...........SYNC', delay: 400 },
  { text: '> WORKFORCE_MODULE......READY', delay: 800 },
  { text: '> GRAPHFY_ENGINE........ONLINE', delay: 1200 },
  { text: '> HQ_ENVIRONMENT........OK', delay: 1600 },
  { text: '', delay: 2000 },
  { text: '✦  VEGA v1.0 — 数字 COO 已上线', delay: 2200 },
];

// Narrative lines — appear one by one after terminal
const NARRATIVE = [
  { text: 'AI 时代，硅基劳动力正式入场。', delay: 600 },
  { text: '数字员工不眠不休，以毫秒为单位思考。', delay: 1800 },
  { text: '人机协同，重构生产力的边界。', delay: 3200 },
  { text: '聪明的 Boss，正在组建他们的数字团队。', delay: 4600 },
];
const NARRATIVE_HERO_DELAY = 6200; // "Boss，你的数字公司，从今天开始。"
const NARRATIVE_TOTAL = 8200;      // total time before transitioning to building

const FLOORS = [
  { windows: 8, height: 44 },
  { windows: 8, height: 44 },
  { windows: 6, height: 40 },
  { windows: 6, height: 40 },
  { windows: 4, height: 36 },
  { windows: 4, height: 36 },
  { windows: 2, height: 32 },
];

type Phase = 'terminal' | 'narrative' | 'building' | 'ready';

export default function Act1() {
  const [phase, setPhase] = useState<Phase>('terminal');
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [visibleNarrative, setVisibleNarrative] = useState<number>(0);
  const [showHero, setShowHero] = useState(false);
  const navigate = useNavigate();
  const setFlag = useOnboardingStore((s) => s.setFlag);

  useEffect(() => {
    // Boot sequence
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => setVisibleLines(i + 1), line.delay);
    });

    // Terminal → narrative
    setTimeout(() => setPhase('narrative'), 5000);
  }, []);

  // Narrative phase timers
  useEffect(() => {
    if (phase !== 'narrative') return;
    NARRATIVE.forEach((_, i) => {
      setTimeout(() => setVisibleNarrative(i + 1), NARRATIVE[i].delay);
    });
    setTimeout(() => setShowHero(true), NARRATIVE_HERO_DELAY);
    setTimeout(() => setPhase('building'), NARRATIVE_TOTAL);
    setTimeout(() => setPhase('ready'), NARRATIVE_TOTAL + FLOORS.length * 280 + 600);
  }, [phase]);

  const handleAuthorize = () => {
    setFlag('lighting_completed', true);
    navigate('/onboarding/act-1-5');
  };

  return (
    <div className="relative min-h-screen bg-[#020617] flex flex-col items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: 'linear-gradient(rgba(56,189,248,1) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-48 bg-accent-blue/8 blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">

        {/* ── Terminal boot ── */}
        {phase === 'terminal' && (
          <motion.div
            key="terminal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-xl px-8 font-mono z-10"
          >
            <div className="space-y-1">
              {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={line.text.startsWith('✦') ? 'text-accent-blue text-base font-bold mt-4' : 'text-slate-400 text-xs tracking-widest'}
                >
                  {line.text}
                </motion.p>
              ))}
              {visibleLines < BOOT_LINES.length && (
                <span className="inline-block w-2 h-3.5 bg-accent-blue animate-pulse" />
              )}
            </div>
          </motion.div>
        )}

        {/* ── Narrative ── */}
        {phase === 'narrative' && (
          <motion.div
            key="narrative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-2xl px-10 z-10 flex flex-col items-center gap-8 text-center"
          >
            {/* Story lines */}
            <div className="space-y-5 w-full">
              {NARRATIVE.slice(0, visibleNarrative).map((item, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="text-slate-400 text-lg font-light leading-relaxed tracking-wide"
                >
                  {item.text}
                </motion.p>
              ))}
            </div>

            {/* Hero line */}
            <AnimatePresence>
              {showHero && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.94, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="text-2xl md:text-3xl font-bold text-white mt-4 leading-snug"
                >
                  Boss，你的数字公司，<br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-blue to-brand-start">
                    从今天开始。
                  </span>
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Building lights up + ready ── */}
        {(phase === 'building' || phase === 'ready') && (
          <motion.div
            key="building"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center z-10 gap-0"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6 flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
                <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="rgba(56,189,248,0.8)" strokeWidth="1.5" fill="rgba(56,189,248,0.08)" />
                <circle cx="14" cy="14" r="3" fill="rgba(56,189,248,0.9)" />
              </svg>
              <span className="text-[11px] font-bold text-accent-blue uppercase tracking-[0.25em]">VEGA 正在初始化总部</span>
            </motion.div>

            {/* Building */}
            <div className="flex flex-col items-center">
              {[...FLOORS].reverse().map((floor, displayIdx) => {
                const floorIdx = FLOORS.length - 1 - displayIdx;
                const delay = (FLOORS.length - 1 - floorIdx) * 0.26;
                return (
                  <motion.div
                    key={floorIdx}
                    initial={{ borderColor: 'rgba(56,189,248,0.04)', backgroundColor: 'rgba(2,6,23,0.4)' }}
                    animate={{
                      borderColor: ['rgba(56,189,248,0.04)', 'rgba(56,189,248,0.7)', 'rgba(56,189,248,0.25)'],
                      backgroundColor: ['rgba(2,6,23,0.4)', 'rgba(56,189,248,0.12)', 'rgba(56,189,248,0.04)'],
                    }}
                    transition={{ delay, duration: 0.35, ease: 'easeOut' }}
                    className="relative border-l border-r border-t"
                    style={{ width: 300 - displayIdx * 16, height: floor.height }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center gap-2 px-4">
                      {Array.from({ length: floor.windows }).map((_, wi) => (
                        <motion.div
                          key={wi}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, backgroundColor: 'rgba(56,189,248,0.5)' }}
                          transition={{ delay: delay + 0.15 + wi * 0.035, duration: 0.25 }}
                          className="rounded-sm shadow-[0_0_6px_rgba(56,189,248,0.7)]"
                          style={{ width: 13, height: floor.height * 0.42 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-x border-b border-accent-blue/20 bg-accent-blue/4"
                style={{ width: 300, height: 14, borderRadius: '0 0 4px 4px' }}
              />
            </div>

            {/* CTA */}
            <AnimatePresence>
              {phase === 'ready' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-10 text-center flex flex-col items-center gap-5"
                >
                  <div>
                    <p className="text-white text-xl font-medium mb-1">Boss，数字总部已就绪。</p>
                    <p className="text-slate-400 text-sm">现在，让我为你物色第一批数字员工。</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAuthorize}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand-start to-accent-blue text-white text-sm font-bold shadow-xl shadow-brand-start/25 hover:brightness-110 transition-all"
                  >
                    授权 VEGA 开始运营 →
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
