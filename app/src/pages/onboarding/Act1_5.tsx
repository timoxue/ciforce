import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore, type BossProfile } from '../../store/useAppStore';
import VegaHUD from '../../components/VegaHUD';
import { Check } from 'lucide-react';

// ─── Question config ──────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 'industry',
    vegaMessage: '在为您筛选候选人之前，我需要了解一下您的业务方向。',
    options: [
      { value: '电商内容营销', label: '电商 · 内容营销', icon: '🛒', desc: '种草、带货、爆款文案' },
      { value: '数据分析洞察', label: '数据 · 市场洞察', icon: '📊', desc: '竞品、趋势、决策支持' },
      { value: '多语言出海', label: '出海 · 多语言', icon: '🌐', desc: '翻译、本地化、全球扩张' },
      { value: '软件开发自动化', label: '软件 · 开发自动化', icon: '💻', desc: '代码生成、测试、部署' },
    ],
  },
  {
    id: 'bottleneck',
    vegaMessage: '明白了。当前您最大的生产力瓶颈是什么？',
    options: [
      { value: '内容生产效率低', label: '内容产出太慢', icon: '✍️', desc: '文案、视频、素材不够用' },
      { value: '数据洞察缺失', label: '缺少数据支撑', icon: '🔍', desc: '凭感觉做决策，没有依据' },
      { value: '重复劳动太多', label: '重复工作占用', icon: '🔄', desc: '翻译、整理、归类消耗时间' },
      { value: '协作流程混乱', label: '团队协作效率差', icon: '🔗', desc: 'Pipeline 不顺畅，多人协作卡顿' },
    ],
  },
  {
    id: 'teamSize',
    vegaMessage: '最后一个问题：您的团队规模是？',
    options: [
      { value: 'solo', label: '就我一个人', icon: '🧑', desc: '独立创作者 / 个体经营' },
      { value: 'small', label: '10 人以内', icon: '👥', desc: '小团队，需要放大人效' },
      { value: 'medium', label: '10-50 人', icon: '🏢', desc: '成长期，正在规模化' },
      { value: 'large', label: '50 人以上', icon: '🏭', desc: '规模企业，流程复杂' },
    ],
  },
];

// ─── Option card ──────────────────────────────────────────────────────────────

function OptionCard({
  option, selected, onClick,
}: {
  option: typeof QUESTIONS[0]['options'][0];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative w-full text-left p-4 rounded-2xl border transition-all duration-200
        ${selected
          ? 'bg-accent-blue/10 border-accent-blue/50 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
          : 'bg-slate-900/60 border-white/8 hover:border-white/20 hover:bg-slate-900/80'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{option.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold mb-0.5 ${selected ? 'text-accent-blue' : 'text-white'}`}>
            {option.label}
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">{option.desc}</p>
        </div>
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="shrink-0 w-5 h-5 rounded-full bg-accent-blue flex items-center justify-center"
            >
              <Check size={11} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Act1_5() {
  const navigate = useNavigate();
  const { setFlag, setBossProfile } = useOnboardingStore();

  const [step, setStep] = useState(0);           // 0-2: question index
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'asking' | 'analyzing' | 'done'>('asking');

  const currentQ = QUESTIONS[step];
  const selectedValue = answers[currentQ.id];

  const handleSelect = (value: string) => {
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      // Move to next question after short delay
      setTimeout(() => setStep(step + 1), 480);
    } else {
      // All answered — VEGA analyzes
      setTimeout(() => {
        setPhase('analyzing');
        const profile: BossProfile = {
          industry: newAnswers['industry'] || '',
          bottleneck: newAnswers['bottleneck'] || '',
          teamSize: newAnswers['teamSize'] || '',
        };
        setBossProfile(profile);
        setFlag('discovery_completed', true);
        setTimeout(() => {
          setPhase('done');
          setTimeout(() => navigate('/onboarding/act-2'), 1200);
        }, 2200);
      }, 480);
    }
  };

  const vegaMsg = phase === 'analyzing'
    ? '收到。我已了解您的业务画像，正在为您筛选最匹配的候选人...'
    : phase === 'done'
    ? '候选人已就绪，请您审阅。'
    : currentQ.vegaMessage;

  return (
    <div className="relative min-h-screen bg-[#020617] flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(rgba(56,189,248,1) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Progress dots */}
      <div className="absolute top-8 flex items-center gap-2 z-10">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i < step ? 'w-4 h-1.5 bg-accent-blue' :
              i === step ? 'w-6 h-1.5 bg-accent-blue' :
              'w-1.5 h-1.5 bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Question area */}
      <AnimatePresence mode="wait">
        {phase === 'asking' && (
          <motion.div
            key={`q-${step}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-lg z-10 mb-28"
          >
            {/* Step indicator */}
            <p className="text-[10px] text-slate-600 uppercase font-bold tracking-[0.2em] text-center mb-6">
              {step + 1} / {QUESTIONS.length}
            </p>

            {/* Options grid */}
            <div className="grid grid-cols-2 gap-3">
              {currentQ.options.map((opt) => (
                <OptionCard
                  key={opt.value}
                  option={opt}
                  selected={selectedValue === opt.value}
                  onClick={() => handleSelect(opt.value)}
                />
              ))}
            </div>

            {/* Previous answers summary */}
            {step > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 flex flex-wrap gap-2 justify-center"
              >
                {Object.entries(answers).map(([key, val]) => {
                  const q = QUESTIONS.find(q => q.id === key);
                  const opt = q?.options.find(o => o.value === val);
                  return opt ? (
                    <span key={key} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/25 text-[10px] text-accent-blue font-medium">
                      <Check size={9} />
                      {opt.label}
                    </span>
                  ) : null;
                })}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Analyzing phase */}
        {(phase === 'analyzing' || phase === 'done') && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="z-10 mb-28 flex flex-col items-center gap-6"
          >
            {/* Summary of all answers */}
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.entries(answers).map(([key, val]) => {
                const q = QUESTIONS.find(q => q.id === key);
                const opt = q?.options.find(o => o.value === val);
                return opt ? (
                  <motion.span
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/25 text-sm text-accent-blue font-medium"
                  >
                    <span>{opt.icon}</span>
                    {opt.label}
                  </motion.span>
                ) : null;
              })}
            </div>

            {/* Analyzing indicator */}
            {phase === 'analyzing' && (
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-accent-blue"
                  />
                ))}
                <span className="text-sm text-slate-500 ml-1 font-light">VEGA 正在匹配候选人...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* VEGA HUD */}
      <VegaHUD visible message={vegaMsg} />
    </div>
  );
}
