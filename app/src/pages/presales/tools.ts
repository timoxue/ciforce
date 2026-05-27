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
