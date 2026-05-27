/**
 * Real run engine — talks to `POST /api/agents/product-shot/run` and streams
 * SSE events into the store. Falls back to the SVG mock if the user hasn't
 * uploaded a product image yet (DashScope requires one).
 *
 * Event schema (matches backend/routes/agents.py):
 *   { type: 'info'  | 'work' | 'ok',   text: string }
 *   { type: 'done',  images: string[], prompt: string }
 *   { type: 'error', text: string }
 */
import { useProductShotStore, type RunParams, SCENE_LABEL, RATIO_LABEL } from './store';

// Empty BACKEND → same-origin /api (nginx proxies in docker). Non-empty for local dev.
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL ?? 'http://localhost:8000';
const ENDPOINT = `${BACKEND}/api/agents/product-shot/run`;

// ── public entry point ───────────────────────────────────────────────────────

export async function simulateRun(): Promise<string> {
  const s = useProductShotStore.getState();
  const params = s.draftParams;

  if (!params.productImageUrl) {
    const runId = s.startRun();
    s.pushLog({ level: 'warn', text: '⚠ 请先上传商品图（wanx-background-generation-v2 需要参考图）' });
    useProductShotStore.setState(st => ({
      runs: st.runs.map(r => r.id === runId ? { ...r, status: 'error', finishedAt: Date.now() } : r),
    }));
    return '';
  }

  const runId = s.startRun();
  s.pushLog({
    level: 'info',
    text: `▶ run ${runId} · ${SCENE_LABEL[params.scene]} · ${RATIO_LABEL[params.ratio]} · ${params.variants} 张`,
  });

  try {
    const images = await streamRun(params, (level, text) => {
      useProductShotStore.getState().pushLog({ level, text });
    });

    if (!images.length) {
      useProductShotStore.setState(st => ({
        runs: st.runs.map(r => r.id === runId ? { ...r, status: 'error', finishedAt: Date.now() } : r),
      }));
      return '';
    }

    const versionId = useProductShotStore.getState().finishRun(runId, images);
    const verNum = useProductShotStore.getState().versions.length;
    useProductShotStore.getState().pushLog({
      level: 'ok',
      text: `✓ 完成 · 产出 ${images.length} 张 · 版本 #${verNum}`,
    });
    return versionId;
  } catch (err: any) {
    useProductShotStore.getState().pushLog({
      level: 'warn',
      text: `连接错误: ${err?.message ?? err}`,
    });
    useProductShotStore.setState(st => ({
      runs: st.runs.map(r => r.id === runId ? { ...r, status: 'error', finishedAt: Date.now() } : r),
    }));
    return '';
  }
}

// ── SSE parser over fetch ────────────────────────────────────────────────────

type LogLevel = 'info' | 'work' | 'ok' | 'warn';

async function streamRun(
  params: RunParams,
  onLog: (level: LogLevel, text: string) => void,
): Promise<string[]> {
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_base64: params.productImageUrl,
      prompt: params.prompt,
      scene: params.scene,
      ratio: params.ratio,
      variants: params.variants,
    }),
  });

  if (!resp.ok || !resp.body) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status} ${errText.slice(0, 120)}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let images: string[] = [];

  const flushFrame = (frame: string) => {
    for (const line of frame.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const evt = JSON.parse(payload);
        switch (evt.type) {
          case 'info': onLog('info', evt.text); break;
          case 'work': onLog('work', evt.text); break;
          case 'ok':   onLog('ok',   evt.text); break;
          case 'error':
            onLog('warn', evt.text);
            break;
          case 'done':
            images = Array.isArray(evt.images) ? evt.images : [];
            break;
        }
      } catch {
        // ignore malformed frames
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE frames are separated by blank lines (\n\n).
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      flushFrame(buf.slice(0, idx));
      buf = buf.slice(idx + 2);
    }
  }
  // Drain trailing frame (some servers don't emit a final \n\n before closing).
  buf += decoder.decode();
  if (buf.trim()) flushFrame(buf);

  return images;
}
