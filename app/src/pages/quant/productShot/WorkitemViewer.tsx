/**
 * WorkitemViewer — fullscreen preview of an image artifact version.
 *
 * Layout:
 *   [ Version bar (left)  ] [ Big image (center) ] [ Inspector (right) ]
 * Inspector lets you edit prompt and "re-run from here", which seeds the
 * RunDrawer with this version's params + new prompt.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useProductShotStore,
  SCENE_LABEL, RATIO_LABEL,
} from './store';

export function WorkitemViewer() {
  const isOpen          = useProductShotStore(s => s.isViewerOpen);
  const close           = useProductShotStore(s => s.closeViewer);
  const versions        = useProductShotStore(s => s.versions);
  const activeId        = useProductShotStore(s => s.activeVersionId);
  const selectVersion   = useProductShotStore(s => s.selectVersion);
  const toggleLike      = useProductShotStore(s => s.toggleLike);
  const prepareRerun    = useProductShotStore(s => s.prepareRerunFromVersion);

  const active = versions.find(v => v.id === activeId) ?? null;
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [editedPrompt, setEditedPrompt] = useState('');

  useEffect(() => {
    setActiveImgIdx(0);
    setEditedPrompt(active?.prompt ?? '');
  }, [active?.id]);

  if (!isOpen || !active) return null;

  const versionIdx = versions.findIndex(v => v.id === active.id);
  const img = active.images[activeImgIdx];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl"
        onClick={close}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-6 grid grid-cols-[88px_1fr_340px] gap-4"
        >
          {/* ── Left: version rail ────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02]
                          py-3 overflow-y-auto custom-scrollbar">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest text-center mb-2">
              版本
            </div>
            <div className="space-y-2 px-2">
              {versions.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => selectVersion(v.id)}
                  className={`w-full rounded-lg overflow-hidden border-2 transition-all
                              ${v.id === active.id
                                ? 'border-emerald-400 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]'
                                : 'border-white/8 hover:border-white/20 opacity-70 hover:opacity-100'}`}
                >
                  <div className="aspect-square bg-slate-900">
                    <img src={v.images[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="px-1.5 py-1 text-[9px] flex items-center justify-between
                                  bg-black/30 text-slate-300">
                    <span>v{i + 1}</span>
                    {v.liked && <Heart size={9} className="fill-pink-400 text-pink-400" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Center: big image + thumb strip ───────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-slate-950/60
                          flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="text-[12px] text-white font-medium">
                v{versionIdx + 1} · {SCENE_LABEL[active.scene]} · {RATIO_LABEL[active.ratio]}
              </div>
              <div className="flex items-center gap-1">
                <IconBtn onClick={() => toggleLike(active.id)}
                         active={active.liked}><Heart size={14} /></IconBtn>
                <IconBtn onClick={() => downloadImage(img, `${active.id}-${activeImgIdx + 1}.svg`)}>
                  <Download size={14} />
                </IconBtn>
                <IconBtn onClick={close}><X size={14} /></IconBtn>
              </div>
            </div>

            <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden">
              <motion.img
                key={img}
                src={img} alt=""
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="max-h-full max-w-full object-contain rounded-lg
                           shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
              />
              {active.images.length > 1 && (
                <>
                  <NavBtn side="left"
                          onClick={() => setActiveImgIdx(i =>
                            (i - 1 + active.images.length) % active.images.length)} />
                  <NavBtn side="right"
                          onClick={() => setActiveImgIdx(i =>
                            (i + 1) % active.images.length)} />
                </>
              )}
            </div>

            <div className="px-4 py-3 border-t border-white/8 flex items-center gap-2 justify-center">
              {active.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImgIdx(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors
                              ${i === activeImgIdx
                                ? 'border-emerald-400'
                                : 'border-white/10 hover:border-white/25 opacity-70'}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: inspector + re-run ─────────────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02]
                          flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                源 prompt
              </div>
              <div className="text-[12px] text-slate-300 leading-relaxed">
                {active.prompt}
              </div>
            </div>

            <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto custom-scrollbar">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">
                  修改 prompt 后重跑
                </div>
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2.5 rounded-lg
                             bg-white/5 border border-white/10
                             text-[12px] text-white placeholder-slate-600
                             focus:outline-none focus:border-violet-400/50
                             resize-none"
                />
              </div>

              <div className="space-y-1 text-[10.5px]">
                <Stat label="场景" value={SCENE_LABEL[active.scene]} />
                <Stat label="尺寸" value={RATIO_LABEL[active.ratio]} />
                <Stat label="生成数量" value={`${active.images.length} 张`} />
                <Stat label="创建时间"
                      value={new Date(active.createdAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })} />
              </div>
            </div>

            <div className="p-4 border-t border-white/8">
              <button
                onClick={() => prepareRerun(active.id, editedPrompt)}
                className="w-full py-2.5 rounded-lg font-semibold text-[12.5px] text-white
                           bg-gradient-to-r from-violet-500 to-fuchsia-500
                           shadow-[0_6px_20px_-6px_rgba(168,85,247,0.6)]
                           hover:shadow-[0_8px_28px_-6px_rgba(168,85,247,0.85)]
                           transition-shadow
                           flex items-center justify-center gap-2"
              >
                <RefreshCw size={13} /> 用修改后的 prompt 重跑
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function IconBtn({ children, onClick, active }: {
  children: React.ReactNode; onClick: () => void; active?: boolean;
}) {
  return (
    <button onClick={onClick}
            className={`p-1.5 rounded transition-colors
                        ${active
                          ? 'text-pink-400 bg-pink-400/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/8'}`}>
      {children}
    </button>
  );
}

function NavBtn({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button onClick={onClick}
            className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-3' : 'right-3'}
                        w-9 h-9 rounded-full bg-black/40 backdrop-blur
                        border border-white/10 text-white/80 hover:text-white hover:bg-black/60
                        flex items-center justify-center transition-colors`}>
      <Icon size={18} />
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}

function downloadImage(src: string, name: string) {
  const a = document.createElement('a');
  a.href = src;
  a.download = name;
  a.click();
}
