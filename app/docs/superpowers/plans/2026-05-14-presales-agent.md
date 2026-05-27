# 售前智能体 ARIA — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现全屏沉浸式售前智能体 ARIA，通过对话收集业务需求，双轨输出：有匹配推荐智能体、无匹配生成数字工位需求单。

**Architecture:** 前端 React 实现 turn-based agent loop，通过 SSE 流式消费后端 FastAPI `/api/presales/chat`；后端调用 DeepSeek function calling 提取结构化需求、搜索 mock 人才市场、持久化需求单（内存存储）；三个触发入口：Onboarding Act2、Marketplace 按钮、VEGA 指令。

**Tech Stack:** React 19 + TypeScript + Zustand 5 + React Router 7 + FastAPI + DeepSeek API (OpenAI-compat) + SSE streaming

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `src/pages/presales/PreSalesPage.tsx` | 路由 `/presales` 的主页面，双栏布局 |
| `src/pages/presales/ConversationPanel.tsx` | 左栏：对话气泡流 + 输入框 |
| `src/pages/presales/RequirementsPanel.tsx` | 右栏：归集维度面板 + 实时匹配预览 |
| `src/pages/presales/MatchResultView.tsx` | 对话结束后的结果展示（推荐/数字工位） |
| `src/pages/presales/usePresalesStore.ts` | Zustand store：消息、阶段、归集信息、匹配结果 |
| `src/pages/presales/agentLoop.ts` | Turn-based agent loop + tool registry + SSE consumer |
| `src/pages/presales/tools.ts` | 3 个工具定义：searchMarketplace / createRequirement / confirmMatch |
| `src/pages/presales/types.ts` | PresalesMessage、RequirementDraft、PresalesPhase 类型 |
| `backend/routes/presales.py` | POST /api/presales/chat (SSE) + GET/POST /api/requirements |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/App.tsx` | 添加 `/presales` 路由 |
| `src/pages/onboarding/Act2.tsx` | 添加「开始需求诊断」跳转按钮 |
| `src/pages/marketplace/Marketplace.tsx` | 顶部添加「需求诊断」按钮 |
| `src/components/VegaDrawer.tsx` | 检测意图词，插入 ARIA 跳转提示 |
| `backend/main.py` | import 并注册 presales router |

---

## Task 1: 类型定义

**Files:**
- Create: `src/pages/presales/types.ts`

- [ ] **Step 1: 创建类型文件**

```typescript
// src/pages/presales/types.ts

export type PresalesPhase =
  | 'greeting'
  | 'collecting'
  | 'probing'
  | 'analyzing'
  | 'presenting_matches'
  | 'creating_requirement'
  | 'done'

export interface PresalesMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  tags?: string[]          // 归集标签，仅 assistant 消息有
  toolName?: string        // 仅 tool 消息有
  isStreaming?: boolean    // 当前正在流式输出
}

export interface RequirementDraft {
  industry: string | null
  teamSize: string | null
  painPoints: string[]
  requiredCapabilities: string[]
  budget: { min: number; max: number } | null
  urgency: 'high' | 'medium' | 'low' | null
  channels: string[]
}

export interface MatchedAgent {
  id: string
  name: string
  role: string
  category: string
  roi: string
  price: string
  rating: number
  description: string
}

export interface RequirementPost {
  id: string
  positionNumber: string
  title: string
  draft: RequirementDraft
  conversationSummary: string
  createdAt: string
  status: 'open' | 'matched'
}
```

- [ ] **Step 2: 确认文件无 TS 错误**

```bash
cd /d/AI/CIForce/app && npx tsc --noEmit 2>&1 | head -20
```

期望：无错误（或仅已有错误，无新增）

- [ ] **Step 3: Commit**

```bash
cd /d/AI/CIForce/app && git add src/pages/presales/types.ts && git commit -m "feat(presales): add ARIA type definitions"
```

---

## Task 2: Zustand Store

**Files:**
- Create: `src/pages/presales/usePresalesStore.ts`

- [ ] **Step 1: 创建 store**

```typescript
// src/pages/presales/usePresalesStore.ts
import { create } from 'zustand'
import {
  PresalesMessage,
  PresalesPhase,
  RequirementDraft,
  MatchedAgent,
  RequirementPost,
} from './types'

const EMPTY_DRAFT: RequirementDraft = {
  industry: null,
  teamSize: null,
  painPoints: [],
  requiredCapabilities: [],
  budget: null,
  urgency: null,
  channels: [],
}

interface PresalesStore {
  messages: PresalesMessage[]
  phase: PresalesPhase
  draft: RequirementDraft
  matches: MatchedAgent[]
  requirement: RequirementPost | null
  isLoading: boolean
  // 来自 VEGA 的上下文摘要（可选）
  vegaContext: string | null

  addMessage: (msg: PresalesMessage) => void
  updateLastMessage: (patch: Partial<PresalesMessage>) => void
  setPhase: (phase: PresalesPhase) => void
  updateDraft: (patch: Partial<RequirementDraft>) => void
  setMatches: (matches: MatchedAgent[]) => void
  setRequirement: (req: RequirementPost) => void
  setLoading: (v: boolean) => void
  setVegaContext: (ctx: string) => void
  reset: () => void
}

export const usePresalesStore = create<PresalesStore>((set) => ({
  messages: [],
  phase: 'greeting',
  draft: { ...EMPTY_DRAFT },
  matches: [],
  requirement: null,
  isLoading: false,
  vegaContext: null,

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  updateLastMessage: (patch) =>
    set((s) => {
      const msgs = [...s.messages]
      if (msgs.length === 0) return s
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch }
      return { messages: msgs }
    }),

  setPhase: (phase) => set({ phase }),
  updateDraft: (patch) =>
    set((s) => ({ draft: { ...s.draft, ...patch } })),
  setMatches: (matches) => set({ matches }),
  setRequirement: (req) => set({ requirement: req }),
  setLoading: (v) => set({ isLoading: v }),
  setVegaContext: (ctx) => set({ vegaContext: ctx }),
  reset: () =>
    set({
      messages: [],
      phase: 'greeting',
      draft: { ...EMPTY_DRAFT },
      matches: [],
      requirement: null,
      isLoading: false,
      vegaContext: null,
    }),
}))
```

- [ ] **Step 2: 类型检查**

```bash
cd /d/AI/CIForce/app && npx tsc --noEmit 2>&1 | head -20
```

期望：无新增错误

- [ ] **Step 3: Commit**

```bash
cd /d/AI/CIForce/app && git add src/pages/presales/usePresalesStore.ts && git commit -m "feat(presales): add usePresalesStore"
```

---

## Task 3: 工具定义

**Files:**
- Create: `src/pages/presales/tools.ts`

- [ ] **Step 1: 创建工具定义文件**

```typescript
// src/pages/presales/tools.ts
// OpenAI function calling 格式的工具定义，发送给 DeepSeek

export const PRESALES_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_marketplace',
      description:
        '在人才市场搜索匹配的智能体。当你已经理解了用户的核心需求后调用此工具。',
      parameters: {
        type: 'object',
        properties: {
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: '需求关键词，如 ["多语言", "客服", "跨境电商"]',
          },
          category: {
            type: 'string',
            enum: ['电商营销', '短视频', '数据挖掘', '创意设计', '客户服务', '办公自动化', '多语言'],
            description: '智能体分类，不确定时传 null',
          },
          budget_max: {
            type: 'number',
            description: '月预算上限（元），不确定时传 null',
          },
        },
        required: ['keywords'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_requirement',
      description:
        '当人才市场没有匹配的智能体时，创建待招募需求单。将用户的需求持久化为数字工位。',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '需求单标题，简洁描述所需智能体，如 "多语言跨境客服智能体"',
          },
          industry: { type: 'string', description: '所在行业' },
          pain_points: {
            type: 'array',
            items: { type: 'string' },
            description: '主要业务痛点列表',
          },
          required_capabilities: {
            type: 'array',
            items: { type: 'string' },
            description: '所需能力列表',
          },
          budget_range: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
            },
            description: '月预算范围（元），不确定时传 null',
          },
          urgency: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: '紧急程度',
          },
        },
        required: ['title', 'industry', 'pain_points', 'required_capabilities', 'urgency'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'confirm_match',
      description:
        '用户确认要雇用某个匹配的智能体时调用。触发前端进入雇用流程。',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: '选中的智能体 ID' },
          agent_name: { type: 'string', description: '智能体名称' },
        },
        required: ['agent_id', 'agent_name'],
      },
    },
  },
]

export type ToolName = 'search_marketplace' | 'create_requirement' | 'confirm_match'

export interface SearchMarketplaceArgs {
  keywords: string[]
  category?: string
  budget_max?: number
}

export interface CreateRequirementArgs {
  title: string
  industry: string
  pain_points: string[]
  required_capabilities: string[]
  budget_range?: { min: number; max: number }
  urgency: 'high' | 'medium' | 'low'
}

export interface ConfirmMatchArgs {
  agent_id: string
  agent_name: string
}
```

- [ ] **Step 2: 类型检查**

```bash
cd /d/AI/CIForce/app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /d/AI/CIForce/app && git add src/pages/presales/tools.ts && git commit -m "feat(presales): add DeepSeek function calling tool definitions"
```

---

## Task 4: Agent Loop（前端核心）

**Files:**
- Create: `src/pages/presales/agentLoop.ts`

- [ ] **Step 1: 创建 agent loop**

```typescript
// src/pages/presales/agentLoop.ts
import { usePresalesStore } from './usePresalesStore'
import { PRESALES_TOOLS, ToolName, SearchMarketplaceArgs, CreateRequirementArgs, ConfirmMatchArgs } from './tools'
import { RequirementDraft } from './types'

const BACKEND = 'http://localhost:8000'

const SYSTEM_PROMPT = `你是 ARIA，CIForce 平台的售前顾问智能体。你的任务是通过对话理解用户的业务痛点，帮助他们找到最合适的智能体。

对话策略：
1. 先让用户自由描述业务情况，不要急于提问
2. 从用户描述中识别：行业、规模、主要痛点、所需能力、预算
3. 对缺失的关键信息（尤其是痛点和所需能力）进行追问，每次只问一个问题
4. 收集到足够信息（至少有行业+痛点+所需能力）后，调用 search_marketplace 工具
5. 如果有匹配结果，向用户推荐并询问是否雇用
6. 如果无匹配结果，告知用户将创建数字工位需求单，调用 create_requirement

语气：专业、友好、简洁。不要啰嗦。用中文。`

// ── 工具执行（前端本地执行） ─────────────────────────────────────────────────

async function executeSearchMarketplace(args: SearchMarketplaceArgs) {
  const params = new URLSearchParams()
  args.keywords.forEach((k) => params.append('q', k))
  if (args.category) params.set('category', args.category)
  if (args.budget_max) params.set('budget', String(args.budget_max))

  const res = await fetch(`${BACKEND}/api/marketplace/match?${params}`)
  if (!res.ok) return { matches: [] }
  return res.json()
}

async function executeCreateRequirement(args: CreateRequirementArgs) {
  const draft: RequirementDraft = {
    industry: args.industry,
    teamSize: null,
    painPoints: args.pain_points,
    requiredCapabilities: args.required_capabilities,
    budget: args.budget_range ?? null,
    urgency: args.urgency,
    channels: [],
  }
  const res = await fetch(`${BACKEND}/api/requirements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: args.title,
      draft,
      conversationSummary: '',
      createdAt: new Date().toISOString(),
    }),
  })
  if (!res.ok) return { error: 'Failed to create requirement' }
  return res.json()
}

// ── SSE 流式消费 ─────────────────────────────────────────────────────────────

async function streamChat(messages: object[], onDelta: (text: string) => void): Promise<{
  content: string
  toolCalls: Array<{ id: string; name: ToolName; args: unknown }>
  finishReason: string
}> {
  const res = await fetch(`${BACKEND}/api/presales/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, tools: PRESALES_TOOLS }),
  })

  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let content = ''
  let finishReason = 'stop'
  const toolCalls: Array<{ id: string; name: ToolName; args: unknown }> = []
  const toolCallBuffers: Record<string, { name: string; argsBuffer: string }> = {}

  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') break
      try {
        const event = JSON.parse(data)
        const delta = event.choices?.[0]?.delta
        const reason = event.choices?.[0]?.finish_reason
        if (reason) finishReason = reason

        if (delta?.content) {
          content += delta.content
          onDelta(delta.content)
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            const key = String(idx)
            if (tc.id) {
              toolCallBuffers[key] = { name: tc.function?.name ?? '', argsBuffer: '' }
            }
            if (tc.function?.name && toolCallBuffers[key]) {
              toolCallBuffers[key].name = tc.function.name
            }
            if (tc.function?.arguments && toolCallBuffers[key]) {
              toolCallBuffers[key].argsBuffer += tc.function.arguments
            }
          }
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  for (const [, buf] of Object.entries(toolCallBuffers)) {
    try {
      toolCalls.push({
        id: `tc_${Date.now()}`,
        name: buf.name as ToolName,
        args: JSON.parse(buf.argsBuffer || '{}'),
      })
    } catch {
      // skip malformed tool calls
    }
  }

  return { content, toolCalls, finishReason }
}

// ── 主入口：发送用户消息，执行一个 turn ─────────────────────────────────────

export async function sendMessage(userText: string) {
  const store = usePresalesStore.getState()

  // 1. 把用户消息加入 store
  store.addMessage({
    id: `user-${Date.now()}`,
    role: 'user',
    content: userText,
    timestamp: Date.now(),
  })
  store.setLoading(true)

  // 2. 构建发给后端的消息历史（OpenAI 格式）
  const history = usePresalesStore.getState().messages.map((m) => ({
    role: m.role === 'tool' ? 'tool' : m.role,
    content: m.content,
  }))

  // 3. 创建占位 assistant 消息（流式更新）
  const assistantId = `ai-${Date.now()}`
  store.addMessage({
    id: assistantId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    isStreaming: true,
  })

  try {
    // 4. 流式调用
    let accumulated = ''
    const { content, toolCalls, finishReason } = await streamChat(
      [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      (delta) => {
        accumulated += delta
        store.updateLastMessage({ content: accumulated, isStreaming: true })
      },
    )

    store.updateLastMessage({ content, isStreaming: false })

    // 5. 处理工具调用
    if (finishReason === 'tool_calls' && toolCalls.length > 0) {
      for (const tc of toolCalls) {
        store.setPhase('analyzing')

        // 显示工具调用消息
        store.addMessage({
          id: `tool-${Date.now()}`,
          role: 'tool',
          content: `正在执行：${tc.name}`,
          timestamp: Date.now(),
          toolName: tc.name,
        })

        if (tc.name === 'search_marketplace') {
          const result = await executeSearchMarketplace(tc.args as SearchMarketplaceArgs)
          if (result.matches && result.matches.length > 0) {
            store.setMatches(result.matches)
            store.setPhase('presenting_matches')
          } else {
            store.setPhase('creating_requirement')
          }
          // 把工具结果追加到消息历史，发起下一轮
          await continueTurnWithToolResult(tc.id, tc.name, JSON.stringify(result))
        } else if (tc.name === 'create_requirement') {
          const result = await executeCreateRequirement(tc.args as CreateRequirementArgs)
          store.setRequirement(result)
          store.setPhase('done')
          await continueTurnWithToolResult(tc.id, tc.name, JSON.stringify(result))
        } else if (tc.name === 'confirm_match') {
          const args = tc.args as ConfirmMatchArgs
          // 触发雇用流程：写入 store，由 MatchResultView 监听并打开 HireModal
          store.updateDraft({ requiredCapabilities: [args.agent_name] })
          store.setPhase('done')
        }
      }
    } else {
      // 无工具调用：推进阶段
      const currentPhase = usePresalesStore.getState().phase
      if (currentPhase === 'greeting') store.setPhase('collecting')
      else if (currentPhase === 'collecting') store.setPhase('probing')
    }
  } catch (err) {
    store.updateLastMessage({
      content: '抱歉，出现了一点问题，请稍后重试。',
      isStreaming: false,
    })
    console.error('[ARIA agentLoop]', err)
  } finally {
    store.setLoading(false)
  }
}

async function continueTurnWithToolResult(toolCallId: string, toolName: string, result: string) {
  const store = usePresalesStore.getState()
  const history = store.messages.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.role === 'tool' ? { tool_call_id: toolCallId } : {}),
  }))

  const assistantId = `ai-tool-result-${Date.now()}`
  store.addMessage({
    id: assistantId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    isStreaming: true,
  })

  let accumulated = ''
  const { content } = await streamChat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'tool', content: result, tool_call_id: toolCallId },
    ],
    (delta) => {
      accumulated += delta
      store.updateLastMessage({ content: accumulated, isStreaming: true })
    },
  )
  store.updateLastMessage({ content, isStreaming: false })
}

// ── 初始化问候语 ──────────────────────────────────────────────────────────────

export async function initGreeting(vegaContext?: string) {
  const store = usePresalesStore.getState()
  store.reset()
  store.setPhase('greeting')

  const context = vegaContext ? `\n\n用户之前在 VEGA 中提到：${vegaContext}` : ''

  const greetingMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `开始需求诊断${context}`,
    },
  ]

  const assistantId = `ai-greeting-${Date.now()}`
  store.addMessage({
    id: assistantId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    isStreaming: true,
  })

  let accumulated = ''
  const { content } = await streamChat(greetingMessages, (delta) => {
    accumulated += delta
    store.updateLastMessage({ content: accumulated, isStreaming: true })
  })
  store.updateLastMessage({ content, isStreaming: false })
  store.setPhase('collecting')
}
```

- [ ] **Step 2: 类型检查**

```bash
cd /d/AI/CIForce/app && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd /d/AI/CIForce/app && git add src/pages/presales/agentLoop.ts && git commit -m "feat(presales): add turn-based agent loop with SSE streaming"
```

---

## Task 5: 后端 API

**Files:**
- Create: `backend/routes/presales.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 创建后端路由文件**

```python
# backend/routes/presales.py
"""
ARIA 售前智能体后端路由
  POST /api/presales/chat    — SSE streaming，转发给 DeepSeek with function calling
  GET  /api/marketplace/match — 搜索 mock 人才市场
  POST /api/requirements      — 创建需求单
  GET  /api/requirements      — 获取所有需求单
"""
import json
import os
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel

router = APIRouter()

def get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=os.getenv("OPENAI_API_KEY", ""),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com/v1"),
    )

# ── In-memory store for requirements (MVP) ───────────────────────────────────

_requirements: list[dict] = []

# ── Mock marketplace data (复用 fixtures 的分类和角色) ────────────────────────

MOCK_AGENTS = [
    {"id": "agent-1",  "name": "小王", "role": "社交媒体文案", "category": "电商营销", "roi": "850%", "price": "￥0.05/篇", "rating": 4.9, "description": "擅长抓住网络热点，生产极具传播力的文案。", "tags": ["电商", "内容", "爆款"]},
    {"id": "agent-2",  "name": "小陈", "role": "短视频剪辑",   "category": "短视频",   "roi": "620%", "price": "￥2.0/个",  "rating": 4.7, "description": "高效完成视频剪辑与后期处理，节奏感极强。", "tags": ["视频", "节奏感"]},
    {"id": "agent-3",  "name": "数据侠", "role": "市场趋势分析", "category": "数据挖掘", "roi": "420%", "price": "￥5.0/报",  "rating": 4.8, "description": "深度挖掘行业数据，生成可执行洞察报告。", "tags": ["数据", "分析"]},
    {"id": "agent-4",  "name": "译境",  "role": "多语言本地化",  "category": "多语言",   "roi": "380%", "price": "￥0.1/字", "rating": 4.6, "description": "支持 12 种语言的高质量翻译和本地化。", "tags": ["翻译", "多语言", "跨境"]},
    {"id": "agent-5",  "name": "客服星", "role": "智能客服",     "category": "客户服务", "roi": "510%", "price": "￥199/月", "rating": 4.8, "description": "7×24 小时自动处理客户咨询，支持多渠道。", "tags": ["客服", "自动化", "多渠道"]},
    {"id": "agent-6",  "name": "设计院", "role": "视觉素材生成", "category": "创意设计", "roi": "290%", "price": "￥3.0/张", "rating": 4.5, "description": "快速生成符合品牌调性的营销视觉素材。", "tags": ["设计", "品牌", "视觉"]},
    {"id": "agent-7",  "name": "办公精", "role": "文档自动化",   "category": "办公自动化","roi": "340%", "price": "￥99/月",  "rating": 4.6, "description": "自动生成报告、合同、会议纪要等办公文档。", "tags": ["文档", "自动化", "办公"]},
    {"id": "agent-8",  "name": "跨境通", "role": "跨境电商全案", "category": "电商营销", "roi": "720%", "price": "￥499/月", "rating": 4.9, "description": "一站式跨境电商运营：选品+文案+客服+物流。", "tags": ["跨境", "电商", "多语言", "客服"]},
]

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "电商营销": ["电商", "营销", "文案", "转化", "促销", "产品描述"],
    "短视频":   ["视频", "剪辑", "抖音", "短视频", "直播"],
    "数据挖掘": ["数据", "分析", "报告", "洞察", "市场"],
    "创意设计": ["设计", "视觉", "图片", "品牌", "素材"],
    "客户服务": ["客服", "售后", "咨询", "回复", "用户"],
    "办公自动化":["文档", "办公", "报告", "自动化", "会议"],
    "多语言":   ["翻译", "多语言", "本地化", "出海", "跨境", "英语", "日语"],
}

def match_agents(keywords: list[str], category: str | None, budget_max: float | None) -> list[dict]:
    scored: list[tuple[int, dict]] = []
    kw_lower = [k.lower() for k in keywords]

    for agent in MOCK_AGENTS:
        score = 0
        # 关键词匹配（tags + role + description）
        agent_text = " ".join(agent["tags"] + [agent["role"], agent["description"]]).lower()
        for kw in kw_lower:
            if kw in agent_text:
                score += 2
        # 分类关键词匹配
        for cat, cat_kws in CATEGORY_KEYWORDS.items():
            for kw in kw_lower:
                if kw in cat_kws and agent["category"] == cat:
                    score += 3
        # 指定分类加分
        if category and agent["category"] == category:
            score += 5
        # 预算过滤（简单：price 中提取数字）
        if budget_max is not None:
            price_str = agent["price"].replace("￥", "").split("/")[0]
            try:
                price_val = float(price_str)
                if price_val > budget_max:
                    score = 0
            except ValueError:
                pass

        if score > 0:
            scored.append((score, agent))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [a for _, a in scored[:3]]

# ── Models ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    messages: list[dict[str, Any]]
    tools: list[dict[str, Any]] | None = None

class RequirementCreate(BaseModel):
    title: str
    draft: dict[str, Any]
    conversationSummary: str
    createdAt: str

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/api/presales/chat")
async def presales_chat(req: ChatRequest):
    """SSE streaming：转发给 DeepSeek with function calling"""
    client = get_client()

    async def generate():
        model = os.getenv("SMART_LLM_MODEL", "deepseek-chat")
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": req.messages,
            "stream": True,
            "max_tokens": 2048,
            "temperature": 0.7,
        }
        if req.tools:
            kwargs["tools"] = req.tools
            kwargs["tool_choice"] = "auto"

        async with client.chat.completions.stream(**kwargs) as stream:
            async for chunk in stream:
                yield f"data: {chunk.model_dump_json()}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/api/marketplace/match")
async def marketplace_match(q: list[str] = [], category: str | None = None, budget: float | None = None):
    """搜索人才市场，返回匹配的智能体列表"""
    results = match_agents(q, category, budget)
    return {"matches": results, "total": len(results)}


@router.post("/api/requirements")
async def create_requirement(req: RequirementCreate):
    """创建待招募需求单，分配数字工位号"""
    position_number = f"POS-{len(_requirements) + 1:04d}"
    record = {
        "id": str(uuid.uuid4()),
        "positionNumber": position_number,
        "title": req.title,
        "draft": req.draft,
        "conversationSummary": req.conversationSummary,
        "createdAt": req.createdAt or datetime.utcnow().isoformat(),
        "status": "open",
    }
    _requirements.append(record)
    return record


@router.get("/api/requirements")
async def list_requirements():
    """返回所有待招募需求单（后台管理用）"""
    return {"requirements": _requirements, "total": len(_requirements)}
```

- [ ] **Step 2: 注册路由到 main.py**

在 `backend/main.py` 的 `app.add_middleware(...)` 之后，添加：

```python
from routes.presales import router as presales_router
app.include_router(presales_router)
```

- [ ] **Step 3: 重启后端，测试 health**

```bash
cd /d/AI/CIForce/backend && python main.py &
sleep 2 && curl -s http://localhost:8000/api/requirements | python -m json.tool
```

期望输出：
```json
{"requirements": [], "total": 0}
```

- [ ] **Step 4: 测试 marketplace match**

```bash
curl -s "http://localhost:8000/api/marketplace/match?q=客服&q=多语言" | python -m json.tool
```

期望：返回 `matches` 数组，包含「客服星」和「译境」等智能体

- [ ] **Step 5: Commit**

```bash
cd /d/AI/CIForce/backend && git add routes/presales.py main.py && git commit -m "feat(presales): add ARIA backend API (chat SSE, marketplace match, requirements)"
```

---

## Task 6: 需求归集面板（右栏）

**Files:**
- Create: `src/pages/presales/RequirementsPanel.tsx`

- [ ] **Step 1: 创建右栏组件**

```tsx
// src/pages/presales/RequirementsPanel.tsx
import { usePresalesStore } from './usePresalesStore'
import { RequirementDraft, MatchedAgent } from './types'

function DraftRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className={value ? 'text-slate-200' : 'text-slate-600'}>{value ?? '待确认'}</span>
    </div>
  )
}

function AgentCard({ agent }: { agent: MatchedAgent }) {
  return (
    <div className="bg-slate-800 rounded-md p-2 mb-1.5 last:mb-0">
      <div className="text-sm text-slate-100">{agent.name}</div>
      <div className="text-xs text-slate-400 mt-0.5">{agent.role}</div>
      <div className="flex gap-2 mt-1 text-xs">
        <span className="text-emerald-400">ROI {agent.roi}</span>
        <span className="text-slate-500">{agent.price}</span>
      </div>
    </div>
  )
}

export default function RequirementsPanel() {
  const { draft, matches, phase } = usePresalesStore()

  const collectedCount = [
    draft.industry,
    draft.teamSize,
    draft.painPoints.length > 0,
    draft.requiredCapabilities.length > 0,
    draft.budget,
  ].filter(Boolean).length

  return (
    <div className="w-64 bg-slate-900 border-l border-slate-800 p-4 flex flex-col gap-4 shrink-0">
      {/* 已识别维度 */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
          需求归集 <span className="text-blue-400 font-normal normal-case tracking-normal">{collectedCount}/5</span>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 flex flex-col gap-0.5">
          <DraftRow label="行业" value={draft.industry} />
          <DraftRow label="规模" value={draft.teamSize} />
          <DraftRow
            label="主要痛点"
            value={draft.painPoints.length > 0 ? draft.painPoints.join('、') : null}
          />
          <DraftRow
            label="所需能力"
            value={draft.requiredCapabilities.length > 0 ? draft.requiredCapabilities.join('、') : null}
          />
          <DraftRow
            label="预算"
            value={draft.budget ? `¥${draft.budget.min}~${draft.budget.max}/月` : null}
          />
        </div>
      </div>

      {/* 实时匹配 */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
          实时匹配
        </div>
        {phase === 'analyzing' && (
          <div className="text-xs text-blue-400 animate-pulse py-2">⚡ 搜索中...</div>
        )}
        {matches.length > 0 ? (
          <div>
            <div className="text-xs text-emerald-400 mb-1.5">找到 {matches.length} 个候选</div>
            {matches.map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
        ) : phase !== 'analyzing' && (
          <div className="text-xs text-slate-600 py-2">补充更多信息可提升匹配精度</div>
        )}
      </div>

      {/* 进度提示 */}
      <div className="mt-auto text-xs text-slate-600 text-center">
        {collectedCount < 3
          ? `还需补充 ${3 - collectedCount} 项关键信息`
          : '信息充足，可触发匹配'}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

```bash
cd /d/AI/CIForce/app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /d/AI/CIForce/app && git add src/pages/presales/RequirementsPanel.tsx && git commit -m "feat(presales): add RequirementsPanel right sidebar"
```

---

## Task 7: 对话面板（左栏）

**Files:**
- Create: `src/pages/presales/ConversationPanel.tsx`

- [ ] **Step 1: 创建对话面板**

```tsx
// src/pages/presales/ConversationPanel.tsx
import { useRef, useEffect, useState, KeyboardEvent } from 'react'
import { usePresalesStore } from './usePresalesStore'
import { sendMessage } from './agentLoop'
import { PresalesMessage } from './types'

function MessageBubble({ msg }: { msg: PresalesMessage }) {
  const isUser = msg.role === 'user'
  const isTool = msg.role === 'tool'

  if (isTool) {
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs text-slate-500 bg-slate-800 rounded-full px-3 py-0.5">
          {msg.content}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
          isUser ? 'bg-slate-700 text-slate-300' : 'bg-gradient-to-br from-blue-700 to-violet-700 text-white'
        }`}
      >
        {isUser ? '我' : 'A'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-900/60 text-blue-100 rounded-tr-sm'
              : 'bg-slate-800 text-slate-100 rounded-tl-sm'
          }`}
        >
          {msg.isStreaming && !msg.content ? (
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            msg.content
          )}
        </div>
        {/* 归集标签 */}
        {msg.tags && msg.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {msg.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-blue-950 border border-blue-800 text-blue-300 rounded-full px-2 py-0.5"
              >
                ✓ {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ConversationPanel() {
  const { messages, isLoading } = usePresalesStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 消息流 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-600 min-h-[44px] max-h-32"
            placeholder="描述你的业务情况..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl flex items-center justify-center text-white transition-colors shrink-0"
          >
            ↑
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 text-center">Enter 发送 · Shift+Enter 换行</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

```bash
cd /d/AI/CIForce/app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /d/AI/CIForce/app && git add src/pages/presales/ConversationPanel.tsx && git commit -m "feat(presales): add ConversationPanel with streaming bubbles"
```

---

## Task 8: 匹配结果视图

**Files:**
- Create: `src/pages/presales/MatchResultView.tsx`

- [ ] **Step 1: 创建结果视图**

```tsx
// src/pages/presales/MatchResultView.tsx
import { usePresalesStore } from './usePresalesStore'
import { useMarketplaceStore } from '../../store/useAppStore'
import { useNavigate } from 'react-router-dom'
import { MatchedAgent, RequirementPost } from './types'

function MatchCard({ agent, onHire }: { agent: MatchedAgent; onHire: () => void }) {
  return (
    <div className="bg-slate-800 border border-slate-700 hover:border-blue-600 rounded-xl p-4 flex flex-col gap-2 transition-colors">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-700 to-violet-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
          {agent.name[0]}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-100">{agent.name}</div>
          <div className="text-xs text-slate-400">{agent.role}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-emerald-400">ROI {agent.roi}</div>
          <div className="text-xs text-slate-500">{agent.price}</div>
        </div>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{agent.description}</p>
      <button
        onClick={onHire}
        className="mt-1 w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
      >
        立即雇用
      </button>
    </div>
  )
}

function RequirementCard({ req }: { req: RequirementPost }) {
  return (
    <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-5 text-center">
      <div className="text-2xl mb-2">📋</div>
      <div className="text-sm font-medium text-amber-200 mb-1">数字工位已创建</div>
      <div className="text-xs text-amber-400/80 mb-3">
        工位编号：<span className="font-mono font-bold text-amber-300">{req.positionNumber}</span>
      </div>
      <div className="text-sm text-slate-300 font-medium mb-1">{req.title}</div>
      <p className="text-xs text-slate-500 leading-relaxed">
        需求已进入招募池，当有匹配的智能体上线时我们会第一时间通知你。
      </p>
    </div>
  )
}

export default function MatchResultView() {
  const { matches, requirement, phase } = usePresalesStore()
  const { openHireModal } = useMarketplaceStore()
  const navigate = useNavigate()

  if (phase !== 'presenting_matches' && phase !== 'done') return null

  return (
    <div className="border-t border-slate-800 p-4">
      {matches.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">
            为你找到 {matches.length} 个匹配智能体
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((agent) => (
              <MatchCard
                key={agent.id}
                agent={agent}
                onHire={() => {
                  openHireModal([agent.id])
                  navigate('/app')
                }}
              />
            ))}
          </div>
        </div>
      )}
      {requirement && <RequirementCard req={requirement} />}
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

```bash
cd /d/AI/CIForce/app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /d/AI/CIForce/app && git add src/pages/presales/MatchResultView.tsx && git commit -m "feat(presales): add MatchResultView for hire and requirement display"
```

---

## Task 9: 主页面组装

**Files:**
- Create: `src/pages/presales/PreSalesPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建主页面**

```tsx
// src/pages/presales/PreSalesPage.tsx
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { initGreeting } from './agentLoop'
import { usePresalesStore } from './usePresalesStore'
import ConversationPanel from './ConversationPanel'
import RequirementsPanel from './RequirementsPanel'
import MatchResultView from './MatchResultView'

const PHASE_LABELS: Record<string, string> = {
  greeting: '准备就绪',
  collecting: '需求收集中',
  probing: '深度追问中',
  analyzing: '分析匹配中',
  presenting_matches: '匹配完成',
  creating_requirement: '创建工位中',
  done: '诊断完成',
}

export default function PreSalesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { phase, messages } = usePresalesStore()

  const collectedCount = (() => {
    const { draft } = usePresalesStore.getState()
    return [
      draft.industry,
      draft.teamSize,
      draft.painPoints.length > 0,
      draft.requiredCapabilities.length > 0,
      draft.budget,
    ].filter(Boolean).length
  })()

  useEffect(() => {
    const vegaCtx = searchParams.get('ctx') ?? undefined
    initGreeting(vegaCtx)
  }, [])

  return (
    <div className="h-screen bg-slate-950 flex flex-col text-slate-100">
      {/* 顶栏 */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
        <span className="font-semibold text-sm text-blue-400">ARIA · 售前顾问</span>
        <span className="bg-slate-800 text-slate-400 text-xs rounded-full px-3 py-0.5">
          {PHASE_LABELS[phase] ?? phase}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">
            已收集 {collectedCount} 项
          </span>
          {/* 进度条 */}
          <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(collectedCount / 5) * 100}%` }}
            />
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-slate-300 text-lg leading-none transition-colors"
            title="关闭"
          >
            ✕
          </button>
        </div>
      </header>

      {/* 主体：左栏对话 + 右栏归集 */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ConversationPanel />
          {/* 匹配结果：插在输入框上方 */}
          <MatchResultView />
        </div>
        <RequirementsPanel />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 在 App.tsx 添加路由**

在 `src/App.tsx` 顶部 import 后面添加：

```typescript
import PreSalesPage from './pages/presales/PreSalesPage'
```

在 `<Routes>` 内、`/app` 路由之后添加：

```tsx
{/* PreSales — full-screen ARIA agent */}
<Route path="/presales" element={<PreSalesPage />} />
```

- [ ] **Step 3: 浏览器验证**

打开 http://localhost:3000/presales  
期望：看到顶栏（ARIA · 售前顾问 + 绿点 + 进度条）、左侧对话区出现 ARIA 问候语、右侧归集面板

- [ ] **Step 4: Commit**

```bash
cd /d/AI/CIForce/app && git add src/pages/presales/PreSalesPage.tsx src/App.tsx && git commit -m "feat(presales): add PreSalesPage and /presales route"
```

---

## Task 10: 三个触发入口

**Files:**
- Modify: `src/pages/onboarding/Act2.tsx`
- Modify: `src/pages/marketplace/Marketplace.tsx`
- Modify: `src/components/VegaDrawer.tsx`

- [ ] **Step 1: 查看 Act2.tsx 当前内容**

```bash
cat /d/AI/CIForce/app/src/pages/onboarding/Act2.tsx
```

- [ ] **Step 2: 在 Act2.tsx 底部添加「开始需求诊断」按钮**

找到 Act2 的主要操作按钮区域（通常是「继续」或「下一步」按钮），在其旁边添加：

```tsx
// 在已有 import 中添加
import { useNavigate } from 'react-router-dom'

// 在组件内部添加
const navigate = useNavigate()

// 在按钮区域添加
<button
  onClick={() => navigate('/presales')}
  className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
>
  需要帮助选择？让 ARIA 帮我诊断需求 →
</button>
```

- [ ] **Step 3: 查看 Marketplace.tsx 顶部区域**

```bash
head -80 /d/AI/CIForce/app/src/pages/marketplace/Marketplace.tsx
```

- [ ] **Step 4: 在 Marketplace.tsx 搜索栏区域添加「需求诊断」按钮**

找到搜索栏或 header 区域，添加：

```tsx
// 在已有 import 中添加
import { useNavigate } from 'react-router-dom'

// 在组件内部添加
const navigate = useNavigate()

// 在搜索栏旁边或上方添加按钮
<button
  onClick={() => navigate('/presales')}
  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/40 text-blue-300 text-sm rounded-lg transition-colors"
>
  <span>🤖</span>
  <span>需求诊断</span>
</button>
```

- [ ] **Step 5: 查看 VegaDrawer.tsx 输入处理逻辑**

```bash
grep -n "input\|send\|submit\|message" /d/AI/CIForce/app/src/components/VegaDrawer.tsx | head -30
```

- [ ] **Step 6: 在 VegaDrawer.tsx 添加意图检测**

找到用户发送消息的处理函数，添加意图检测逻辑：

```tsx
// 在已有 import 中添加
import { useNavigate } from 'react-router-dom'
import { usePresalesStore } from '../pages/presales/usePresalesStore'

// 意图词列表
const PRESALES_TRIGGERS = ['我有需求', '我想要', '帮我找', '找一个', '需要一个智能体', '有没有能', '我们需要']

// 在发送消息前检测
const checkPresalesIntent = (text: string): boolean =>
  PRESALES_TRIGGERS.some((t) => text.includes(t))

// 在消息发送处理函数中，在实际发送之前：
if (checkPresalesIntent(userInput)) {
  // 在 VEGA 回复中插入跳转提示（添加一条特殊消息）
  // 而不是直接跳转，让用户选择
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: '检测到您有智能体需求，是否需要我帮您启动需求诊断？',
    action: { type: 'presales', label: '启动 ARIA 需求诊断 →', href: '/presales' }
  }])
  return
}
```

注意：根据 VegaDrawer.tsx 的实际消息结构调整，不要破坏现有类型。如果消息类型不支持 `action` 字段，改为在普通文本消息中直接给出 `/presales` 路径文字提示即可，核心是触发检测逻辑。

- [ ] **Step 7: 浏览器验证三个入口**

1. http://localhost:3000/onboarding/act-2 — 应看到「需要帮助？让 ARIA 帮我诊断需求」链接
2. http://localhost:3000/app（切到 marketplace tab）— 应看到「需求诊断」按钮
3. 打开 VEGA，输入「帮我找一个智能体」— 应看到 ARIA 跳转提示

- [ ] **Step 8: Commit**

```bash
cd /d/AI/CIForce/app && git add src/pages/onboarding/Act2.tsx src/pages/marketplace/Marketplace.tsx src/components/VegaDrawer.tsx && git commit -m "feat(presales): add 3 trigger entry points (Onboarding/Marketplace/VEGA)"
```

---

## Task 11: 端到端验收测试

- [ ] **Step 1: 确认后端运行**

```bash
curl -s http://localhost:8000/api/requirements
```

期望：`{"requirements": [], "total": 0}`

- [ ] **Step 2: 测试有匹配路径**

打开 http://localhost:3000/presales  
输入：`我们是做跨境电商的，每天大量客服咨询，需要多语言支持`  
期望：
- 右栏「行业」更新为「跨境电商」
- ARIA 追问后调用 `search_marketplace`
- 右栏「实时匹配」出现「客服星」「译境」「跨境通」等候选
- 底部出现 MatchResultView 带「立即雇用」按钮

- [ ] **Step 3: 测试无匹配路径**

输入一个非常冷门的需求，例如：`我需要一个专门分析量子计算市场的智能体`  
期望：
- ARIA 调用 `search_marketplace` 返回空
- ARIA 自动调用 `create_requirement`
- 底部出现数字工位卡片，显示 `POS-0001` 编号
- `GET http://localhost:8000/api/requirements` 返回该需求单

- [ ] **Step 4: 验证 Marketplace 入口**

打开 http://localhost:3000/app，切到 marketplace  
期望：顶部看到「🤖 需求诊断」按钮，点击跳转 `/presales`

- [ ] **Step 5: 类型检查**

```bash
cd /d/AI/CIForce/app && npx tsc --noEmit 2>&1
```

期望：无新增错误

- [ ] **Step 6: 最终 Commit**

```bash
cd /d/AI/CIForce/app && git add -A && git commit -m "feat(presales): ARIA pre-sales agent MVP complete"
```

---

## 自检结果

**Spec 覆盖：**
- ✅ 3个入口（Onboarding/Marketplace/VEGA）— Task 10
- ✅ 全屏页面 /presales — Task 9
- ✅ 双栏布局（对话+归集）— Task 6/7/9
- ✅ Agent loop + SSE streaming — Task 4
- ✅ 3个工具（search/create/confirm）— Task 3/4
- ✅ 有匹配→推荐+雇用 — Task 8
- ✅ 无匹配→数字工位 — Task 5/8
- ✅ 后端 API（chat/match/requirements）— Task 5
- ✅ VEGA 意图检测 — Task 10

**类型一致性：**
- `PresalesMessage`、`RequirementDraft`、`MatchedAgent`、`RequirementPost` 均在 Task 1 定义，后续所有 Task 直接 import 使用
- `ToolName` 在 Task 3 定义，Task 4 的 agentLoop 使用
- `usePresalesStore` 的 `setMatches(MatchedAgent[])` 在 Task 8 的 MatchResultView 中消费，类型一致

**无占位符**：所有步骤均含完整代码
