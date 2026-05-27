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
          await continueTurnWithToolResult(tc.id, tc.name, JSON.stringify(result))
        } else if (tc.name === 'create_requirement') {
          const result = await executeCreateRequirement(tc.args as CreateRequirementArgs)
          store.setRequirement(result)
          store.setPhase('done')
          await continueTurnWithToolResult(tc.id, tc.name, JSON.stringify(result))
        } else if (tc.name === 'confirm_match') {
          const args = tc.args as ConfirmMatchArgs
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
