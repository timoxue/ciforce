/**
 * RunPanel — the agent parameter UI, embedded INSIDE the VEGA panel back face.
 *
 * NOT a drawer / overlay. Pure content; outer container is the flip card.
 * Layout adapts to the parent's measured width via ResizeObserver:
 *   < 480px  : single column, vertical scroll
 *   480–700  : two columns (upload | prompt+params)
 *   ≥ 700    : three columns (upload | prompt | params)
 *
 * Sticky CTA stays pinned to bottom of the panel regardless of layout.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Upload, Play, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import {
  useProductShotStore,
  SCENE_LABEL, RATIO_LABEL,
  type SceneId, type RatioId,
} from './store';
import { simulateRun } from './mockEngine';

const SCENES: SceneId[] = ['studio', 'lifestyle', 'nature', 'minimal', 'festive'];
const RATIOS: RatioId[] = ['1:1', '4:5', '16:9', '9:16'];

const PRESET_PROMPTS = [
  '柔光摄影棚，米色背景，自然阴影，杂志级质感',
  '清晨自然光厨房台面，逆光柔焦，生活感氛围',
  '极简白色背景，超清晰商品摄影，悬浮姿态',
  '霓虹赛博风格，紫蓝灯光氛围，潮流感',
];

type Layout = 'narrow' | 'medium' | 'wide' | 'xl';

function layoutFor(w: number): Layout {
  if (w < 480) return 'narrow';
  if (w < 700) return 'medium';
  if (w < 1100) return 'wide';
  return 'xl';
}

/** Per-layout scale tokens. Bigger layouts get larger upload tile, bigger text,
 *  more presets, taller hero, more breathing space. */
const SCALE = {
  narrow: { uploadCol: 'auto',  promptCol: '1fr', paramsCol: 'auto',
            uploadAspect: 'aspect-square', hero: 'py-3', heroAvatar: 36, heroIcon: 14,
            heroTitle: 13, heroSub: 10, body: 'px-5 py-4',
            sectionGap: 5, promptRows: 3, presetCount: 2,
            promptFont: 12, chipFont: 10, labelFont: 9.5,
            chipPy: 'py-1.5', cta: 'py-2 text-[12.5px]', ctaIcon: 12 },
  medium: { uploadCol: '180px', promptCol: '1fr', paramsCol: 'none',
            uploadAspect: 'aspect-square', hero: 'py-3', heroAvatar: 36, heroIcon: 14,
            heroTitle: 13, heroSub: 10, body: 'px-5 py-4',
            sectionGap: 5, promptRows: 3, presetCount: 4,
            promptFont: 12, chipFont: 10, labelFont: 9.5,
            chipPy: 'py-1.5', cta: 'py-2 text-[12.5px]', ctaIcon: 12 },
  wide:   { uploadCol: '220px', promptCol: '1fr', paramsCol: '260px',
            uploadAspect: 'aspect-square', hero: 'py-3.5', heroAvatar: 40, heroIcon: 16,
            heroTitle: 14, heroSub: 11, body: 'px-6 py-5',
            sectionGap: 6, promptRows: 5, presetCount: 4,
            promptFont: 13, chipFont: 11, labelFont: 10,
            chipPy: 'py-2', cta: 'py-2.5 text-[13.5px]', ctaIcon: 14 },
  xl:     { uploadCol: '320px', promptCol: '1fr', paramsCol: '360px',
            uploadAspect: 'aspect-square', hero: 'py-5', heroAvatar: 52, heroIcon: 22,
            heroTitle: 18, heroSub: 13, body: 'px-10 py-8',
            sectionGap: 8, promptRows: 8, presetCount: 4,
            promptFont: 15, chipFont: 13, labelFont: 12,
            chipPy: 'py-3', cta: 'py-4 text-[16px]', ctaIcon: 18 },
} as const;

export function RunPanel() {
  const draft     = useProductShotStore(s => s.draftParams);
  const setDraft  = useProductShotStore(s => s.setDraft);
  const isRunning = useProductShotStore(s => s.runs.some(r => r.status === 'running'));
  const versions  = useProductShotStore(s => s.versions);

  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>('medium');

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setLayout(layoutFor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleFile = (f?: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => setDraft({ productImageUrl: e.target?.result as string });
    reader.readAsDataURL(f);
  };

  const onRun = () => { simulateRun().catch(console.error); };

  const s = SCALE[layout];

  // ── sub-blocks (composable across layouts) ────────────────────────────
  const UploadBlock = (
    <Section title="商品图" labelSize={s.labelFont} compact={layout === 'narrow'}>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
        className={`relative ${s.uploadAspect} rounded-xl cursor-pointer
                    border border-dashed transition-colors overflow-hidden
                    ${draft.productImageUrl
                      ? 'border-violet-400/40 bg-violet-500/5'
                      : 'border-white/12 hover:border-violet-400/40 bg-white/[0.02]'}`}
      >
        {draft.productImageUrl ? (
          <img src={draft.productImageUrl} alt="" className="w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <Upload size={layout === 'xl' ? 32 : 18} className="text-slate-500" />
            <div className="text-slate-400" style={{ fontSize: s.labelFont + 1 }}>拖入或点击</div>
            <div className="text-slate-600" style={{ fontSize: s.labelFont }}>JPG / PNG · 建议白底</div>
          </div>
        )}
        {draft.productImageUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); setDraft({ productImageUrl: null }); }}
            className="absolute top-1.5 right-1.5 p-1 rounded bg-black/50 backdrop-blur
                       text-white/70 hover:text-white"
          >
            <X size={11} />
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
               onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
    </Section>
  );

  const PromptBlock = (
    <Section title="场景描述" labelSize={s.labelFont}
             hint={layout !== 'narrow' ? '一句话告诉 agent 你想要的画面感' : undefined}>
      <textarea
        value={draft.prompt}
        onChange={(e) => setDraft({ prompt: e.target.value })}
        placeholder="例如：清晨自然光厨房台面，逆光柔焦，生活感氛围"
        rows={s.promptRows}
        style={{ fontSize: s.promptFont }}
        className="w-full px-3 py-2.5 rounded-lg
                   bg-white/5 border border-white/10
                   text-white placeholder-slate-600
                   focus:outline-none focus:border-violet-400/50 focus:bg-white/[0.07]
                   resize-none"
      />
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {PRESET_PROMPTS.slice(0, s.presetCount).map((p, i) => (
          <button key={i}
                  onClick={() => setDraft({ prompt: p })}
                  style={{ fontSize: s.chipFont - 0.5 }}
                  className="px-2 py-1 rounded
                             bg-white/[0.04] border border-white/10
                             text-slate-400 hover:text-white hover:border-violet-400/30
                             transition-colors">
            {p.slice(0, layout === 'xl' ? 18 : 10)}...
          </button>
        ))}
      </div>
    </Section>
  );

  const ParamsBlock = (
    <Section title="渲染参数" labelSize={s.labelFont}>
      <Label text="场景" size={s.labelFont} />
      <div className="grid grid-cols-5 gap-1">
        {SCENES.map(sc => (
          <Chip key={sc}
                selected={draft.scene === sc}
                py={s.chipPy} fontSize={s.chipFont}
                onClick={() => setDraft({ scene: sc })}>
            {SCENE_LABEL[sc].slice(0, layout === 'xl' ? 6 : 4)}
          </Chip>
        ))}
      </div>
      <Label text="尺寸" size={s.labelFont} />
      <div className="grid grid-cols-4 gap-1">
        {RATIOS.map(r => (
          <Chip key={r}
                selected={draft.ratio === r}
                py={s.chipPy} fontSize={s.chipFont}
                onClick={() => setDraft({ ratio: r })}>
            {r}
          </Chip>
        ))}
      </div>
      <Label text={`生成数量 · ${draft.variants} 张`} size={s.labelFont} />
      <input
        type="range" min={1} max={4} step={1}
        value={draft.variants}
        onChange={(e) => setDraft({ variants: Number(e.target.value) })}
        className="w-full accent-violet-400"
      />
    </Section>
  );

  // ── layout composition ────────────────────────────────────────────────
  const gapClass = `gap-${s.sectionGap}`;
  let body: React.ReactNode;
  if (layout === 'narrow') {
    body = <div className={`space-y-${s.sectionGap}`}>{UploadBlock}{PromptBlock}{ParamsBlock}</div>;
  } else if (layout === 'medium') {
    body = (
      <div className={`grid grid-cols-[${s.uploadCol}_1fr] ${gapClass}`}
           style={{ gridTemplateColumns: `${s.uploadCol} 1fr` }}>
        <div>{UploadBlock}</div>
        <div className={`space-y-${s.sectionGap}`}>{PromptBlock}{ParamsBlock}</div>
      </div>
    );
  } else {
    // wide & xl share three-column layout, only proportions differ
    body = (
      <div className={gapClass}
           style={{ display: 'grid', gridTemplateColumns: `${s.uploadCol} ${s.promptCol} ${s.paramsCol}`, gap: layout === 'xl' ? 40 : 16 }}>
        <div>{UploadBlock}</div>
        <div>{PromptBlock}</div>
        <div>{ParamsBlock}</div>
      </div>
    );
  }

  const lastVerNum = versions.length;

  return (
    <div ref={wrapRef} className="w-full h-full flex flex-col">
      {/* Hero strip — animated context summary */}
      <motion.div
        key={layout}
        layout
        className={`${s.hero} px-5 border-b border-white/[0.06] shrink-0
                   flex items-center gap-3
                   bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent`}
      >
        <div className="rounded-lg bg-gradient-to-br from-violet-400 to-fuchsia-500
                        flex items-center justify-center shrink-0"
             style={{ width: s.heroAvatar, height: s.heroAvatar }}>
          <Sparkles size={s.heroIcon} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-white truncate" style={{ fontSize: s.heroTitle }}>
            产品摄影师
          </div>
          <div className="text-violet-200/65" style={{ fontSize: s.heroSub }}>
            dashscope · wanx-v2 · 已生成 {lastVerNum} 个版本
          </div>
        </div>
        <span className="px-1.5 py-0.5 rounded font-bold
                         bg-violet-400/15 border border-violet-400/30 text-violet-200 shrink-0"
              style={{ fontSize: Math.max(9, s.heroSub - 1) }}>
          AGENT
        </span>
      </motion.div>

      {/* Scrollable body */}
      <motion.div
        layout
        className={`flex-1 overflow-y-auto custom-scrollbar ${s.body}`}
      >
        {body}
      </motion.div>

      {/* Sticky CTA */}
      <div className={`shrink-0 px-5 ${layout === 'xl' ? 'py-5' : 'py-3'} border-t border-white/[0.06]
                      bg-slate-950/60 backdrop-blur
                      flex items-center gap-2`}>
        <button
          onClick={() => setDraft({ prompt: '' })}
          style={{ fontSize: s.chipFont + 1 }}
          className="px-3 py-2 rounded-lg text-slate-400 hover:text-white
                     hover:bg-white/5 flex items-center gap-1.5 transition-colors">
          <RotateCcw size={s.ctaIcon - 1} /> 清空
        </button>
        <button
          disabled={isRunning}
          onClick={onRun}
          className={`flex-1 relative overflow-hidden rounded-lg font-bold ${s.cta}
                     disabled:opacity-60 disabled:cursor-not-allowed
                     bg-gradient-to-r from-violet-500 to-fuchsia-500
                     shadow-[0_6px_22px_-8px_rgba(168,85,247,0.6)]
                     hover:shadow-[0_8px_28px_-6px_rgba(168,85,247,0.85)]
                     transition-shadow text-white`}>
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isRunning ? (
              <><Loader2 size={s.ctaIcon} className="animate-spin" /> 生成中...</>
            ) : (
              <><Play size={s.ctaIcon - 1} className="fill-white" /> 运行 Agent</>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

function Section({ title, hint, compact, labelSize, children }: {
  title: string; hint?: string; compact?: boolean; labelSize: number; children: React.ReactNode;
}) {
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
      <div className="flex items-center justify-between">
        <div className="font-bold text-white uppercase tracking-widest"
             style={{ fontSize: labelSize + 1 }}>{title}</div>
        {hint && <div className="text-slate-500" style={{ fontSize: labelSize }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Label({ text, size }: { text: string; size: number }) {
  return <div className="text-slate-500 mt-1.5 mb-1" style={{ fontSize: size }}>{text}</div>;
}

function Chip({ selected, onClick, py, fontSize, children }: {
  selected: boolean; onClick: () => void; py: string; fontSize: number; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
            style={{ fontSize }}
            className={`${py} rounded border font-medium transition-colors
                        ${selected
                          ? 'bg-violet-500/25 border-violet-400/50 text-white'
                          : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}>
      {children}
    </button>
  );
}
