const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL ?? '';

export type VegaStreamEvent =
  | { type: 'status'; message?: string; thread_id?: string; task_run_id?: string; workspace_id?: string }
  | { type: 'output'; worker?: string; content?: string; task_run_id?: string; workspace_id?: string; meta?: Record<string, unknown> }
  | { type: 'final'; message?: string; task_run_id?: string; workspace_id?: string }
  | { type: 'done'; thread_id?: string; task_run_id?: string; workspace_id?: string; workers_run?: string[] }
  | { type: 'error'; message?: string; task_run_id?: string; workspace_id?: string };

export interface VegaChatInput {
  goal: string;
  userId?: string;
  tenantId?: string;
  businessSectorId?: string;
  workspaceId?: string;
  workspaceName?: string;
  requestTags?: Record<string, string>;
  billingTags?: Record<string, string>;
}

function apiUrl(path: string) {
  return `${BACKEND}${path}`;
}

export async function streamVegaChat(
  input: VegaChatInput,
  onEvent: (event: VegaStreamEvent) => void,
) {
  const resp = await fetch(apiUrl('/api/vega/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: input.goal,
      user_id: input.userId,
      tenant_id: input.tenantId ?? 'default',
      business_sector_id: input.businessSectorId,
      workspace_id: input.workspaceId,
      workspace_name: input.workspaceName,
      request_tags: input.requestTags ?? {},
      billing_tags: input.billingTags ?? {},
    }),
  });

  if (!resp.ok || !resp.body) {
    const body = await resp.text().catch(() => '');
    throw new Error(`VEGA HTTP ${resp.status}: ${body.slice(0, 180)}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const flushFrame = (frame: string) => {
    for (const line of frame.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        onEvent(JSON.parse(payload) as VegaStreamEvent);
      } catch {
        // Ignore malformed SSE frames; the stream can continue.
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      flushFrame(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) flushFrame(buffer);
}
