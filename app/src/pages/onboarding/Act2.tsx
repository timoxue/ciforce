import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../store/useAppStore';
import VegaHUD from '../../components/VegaHUD';
import { Check } from 'lucide-react';

function buildVegaRecommendMessage(industry: string | undefined, hired: boolean): string {
  if (hired) return '小王已完成入职登记。接下来，我建议为她配备一位协作搭档。';
  if (!industry) return '根据您的业务方向，我为您物色了这位文案专员。样例输出已就绪，满意即可授权入职。';
  const map: Record<string, string> = {
    '电商内容营销': '您做电商内容营销，最需要高效的文案产能。小王爆款率 98%，日均产出稳定，样例已针对您的品类生成，满意即可授权。',
    '数据分析洞察': '您需要数据支撑决策，不过内容分发同样关键。小王擅长把数据洞察转化为传播力强的内容，先让她跑起来。',
    '多语言出海': '出海业务对内容本地化要求高。小王的文案可直接对接 LING 翻译链路，先让她生产原始素材。',
    '软件开发自动化': '开发团队也需要内容曝光。小王可以帮您把技术优势转化为用户能理解的传播内容。',
  };
  return map[industry] || `根据您的业务需求，小王是最优先的候选人。样例输出已就绪，满意即可授权入职。`;
}

const SAMPLE_OUTPUT =
  '☀️ 夏天最后的倔强！这款防晒真的绝了～ SPF50+清爽不闷痘，敏感肌也能放心用！涂上就是隐形防晒衣那种感觉✨ #防晒推荐 #夏日必备 #清爽防晒';

export default function Act2() {
  const navigate = useNavigate();
  const { setFlag, bossProfile } = useOnboardingStore();
  const [cardVisible, setCardVisible] = useState(false);
  const [outputText, setOutputText] = useState('');
  const [hired, setHired] = useState(false);

  useEffect(() => { setTimeout(() => setCardVisible(true), 600); }, []);

  useEffect(() => {
    if (!cardVisible) return;
    setTimeout(() => {
      let i = 0;
      const timer = setInterval(() => {
        i++;
        setOutputText(SAMPLE_OUTPUT.slice(0, i));
        if (i >= SAMPLE_OUTPUT.length) clearInterval(timer);
      }, 30);
      return () => clearInterval(timer);
    }, 800);
  }, [cardVisible]);

  const handleHire = () => {
    if (hired) return;
    setHired(true);
    setFlag('agent_xiaowang_hired', true);
    setTimeout(() => navigate('/onboarding/act-3'), 1600);
  };

  return (
    <div className="relative min-h-screen bg-[#020617] flex flex-col items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,1) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <AnimatePresence>
        {cardVisible && (
          <motion.div
            initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -120, opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="w-full max-w-lg z-10 mb-28"
          >
            <div className={`relative rounded-2xl border p-7 transition-all duration-500 backdrop-blur-sm ${hired ? 'bg-status-success/5 border-status-success/30 shadow-[0_0_40px_rgba(16,185,129,0.12)]' : 'bg-slate-900/80 border-white/10 shadow-2xl'}`}>
              <AnimatePresence>
                {hired && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-3 -right-3 w-8 h-8 bg-status-success rounded-full flex items-center justify-center shadow-lg">
                    <Check size={16} className="text-white" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-start/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-full h-full bg-slate-800" alt="小王" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white">小王</h3>
                    <span className="px-2 py-0.5 rounded-full bg-brand-start/10 border border-brand-start/20 text-[9px] font-bold text-brand-start uppercase tracking-wider">VEGA 推荐</span>
                  </div>
                  <p className="text-sm text-accent-marketplace mb-2">社交媒体文案专家</p>
                  <div className="flex gap-2">
                    {['爆款率 98%', '均时 45s', 'ROI 850%'].map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-slate-400">{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 rounded-xl border border-white/5 p-4 mb-6 min-h-[80px]">
                <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mb-2">样例输出</p>
                <p className="text-sm text-slate-300 leading-relaxed font-light">
                  {outputText}
                  {outputText.length < SAMPLE_OUTPUT.length && <span className="inline-block w-[2px] h-4 bg-brand-start ml-0.5 animate-pulse align-middle" />}
                </p>
              </div>

              <motion.button
                whileHover={!hired ? { scale: 1.02 } : {}} whileTap={!hired ? { scale: 0.98 } : {}}
                onClick={handleHire} disabled={hired}
                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${hired ? 'bg-status-success/20 border border-status-success/30 text-status-success cursor-default' : 'bg-gradient-to-r from-brand-start to-accent-blue text-white shadow-xl shadow-brand-start/20 hover:brightness-110'}`}
              >
                {hired ? <><Check size={16} />已授权入职</> : '授权入职 →'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <VegaHUD
        visible={cardVisible}
        message={buildVegaRecommendMessage(bossProfile?.industry, hired)}
      />
    </div>
  );
}
