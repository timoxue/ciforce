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
