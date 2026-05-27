import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface VegaHUDProps {
  message: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
  className?: string;
  visible?: boolean;
}

// VEGA geometric icon
function VegaIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <polygon
        points="14,2 26,8 26,20 14,26 2,20 2,8"
        stroke="rgba(56,189,248,0.8)"
        strokeWidth="1.5"
        fill="rgba(56,189,248,0.08)"
      />
      <polygon
        points="14,6 22,10 22,18 14,22 6,18 6,10"
        stroke="rgba(99,102,241,0.6)"
        strokeWidth="1"
        fill="rgba(99,102,241,0.05)"
      />
      <circle cx="14" cy="14" r="3" fill="rgba(56,189,248,0.9)" />
      <circle cx="14" cy="14" r="5" stroke="rgba(56,189,248,0.3)" strokeWidth="1" fill="none">
        <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// Typewriter hook
function useTypewriter(text: string, speed = 28) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return displayed;
}

export default function VegaHUD({ message, action, className, visible = true }: VegaHUDProps) {
  const displayed = useTypewriter(message);
  const isTyping = displayed.length < message.length;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="vega-hud"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={cn(
            'fixed bottom-0 left-0 right-0 z-40',
            className
          )}
        >
          {/* Glow line */}
          <div className="h-px bg-gradient-to-r from-transparent via-accent-blue/50 to-transparent" />

          <div className="bg-slate-950/92 backdrop-blur-xl border-t border-accent-blue/15 px-8 py-4 flex items-center gap-5">
            {/* VEGA icon */}
            <div className="shrink-0">
              <VegaIcon size={32} />
            </div>

            {/* Name badge */}
            <div className="shrink-0 flex flex-col items-center">
              <span className="text-[9px] font-bold text-accent-blue uppercase tracking-[0.2em]">VEGA</span>
              <span className="text-[8px] text-slate-600 uppercase tracking-widest mt-0.5">数字 COO</span>
            </div>

            <div className="w-px h-8 bg-white/8 shrink-0" />

            {/* Message */}
            <p className="flex-1 text-sm text-slate-200 font-light leading-relaxed">
              {displayed}
              {isTyping && (
                <span className="inline-block w-[2px] h-4 bg-accent-blue ml-0.5 animate-pulse align-middle" />
              )}
            </p>

            {/* Action button */}
            {action && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: isTyping ? 0.3 : 1, x: 0 }}
                transition={{ delay: 0.3 }}
                onClick={action.onClick}
                disabled={action.disabled || isTyping}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-start to-accent-blue text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-brand-start/20 whitespace-nowrap"
              >
                {action.label}
                <span className="opacity-60">→</span>
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
