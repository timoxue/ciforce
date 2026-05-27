# 售前智能体 ARIA — 设计规格文档

**日期:** 2026-05-14  
**状态:** 待实施  
**方案:** C — 前端 Agent Loop + 后端持久化

---

## 1. 功能概述

ARIA（AI Requirement Intelligence Agent）是 CIForce 平台的售前智能体，通过自然对话收集用户的业务痛点和需求，自动归集为结构化智能体需求单，并双轨并行输出：
- **有匹配**：从人才市场推荐最优智能体，用户可一键雇用
- **无匹配**：生成待招募数字工位 + 需求单，进入后台招募流程

---

## 2. 触发入口（3个）

| 入口 | 位置 | 触发条件 |
|------|------|----------|
| Onboarding 内嵌 | Act2 流程中 | 新用户填完基本信息后自动进入 |
| Marketplace 主动入口 | 顶部「需求诊断」按钮 | 用户主动点击，路由跳转 `/presales` |
| VEGA 指令触发 | VegaDrawer 对话中 | 检测到「我有需求」「帮我找」「我想要」等意图词 |

---

## 3. 页面设计

**路由:** `/presales`  
**布局:** 全屏沉浸式，双栏

### 3.1 顶栏
- ARIA 名称 + 在线状态（绿色脉冲点）
- 当前阶段标签（「需求诊断中」/ 「分析中」/ 「匹配完成」）
- 已收集信息数量 + 进度条
- 关闭按钮（返回上一页）

### 3.2 左栏 — 对话区（flex:1）
- 对话气泡（AI 左对齐，用户右对齐）
- AI 消息下方实时打归集标签（已识别的需求维度）
- 底部输入框 + 发送按钮
- 流式输出（SSE streaming）

### 3.3 右栏 — 需求归集面板（宽 260px）
- **已识别维度**：行业、规模、主要痛点、需求类型、预算（未确认项显示「待确认」）
- **实时匹配预览**：对话过程中持续调用匹配，显示候选智能体数量和卡片预览
- 底部提示：「补充更多信息可提升匹配精度」

---

## 4. 对话状态机

```
greeting → collecting → probing → analyzing → matching
                                                  ↓
                               ┌─────────────────────────────────┐
                               │ 有匹配                    无匹配 │
                               ↓                                  ↓
                    presenting_matches              creating_requirement
                               ↓                                  ↓
                         → HireModal                    数字工位 + 需求单
```

| 状态 | 描述 |
|------|------|
| `greeting` | ARIA 自我介绍，引导用户自由描述 |
| `collecting` | 用户自由倾诉，AI 提取关键信息 |
| `probing` | AI 追问缺失的关键维度（最多 3 次追问） |
| `analyzing` | 调用 `search_marketplace` 工具，展示「分析中」状态 |
| `matching` | 返回匹配结果，分两条路 |
| `presenting_matches` | 展示 1-3 个推荐智能体，提供雇用/比较操作 |
| `creating_requirement` | 调用 `create_requirement` 工具，生成数字工位 |

---

## 5. Agent 工具定义（3个）

### 5.1 `search_marketplace`
```json
{
  "name": "search_marketplace",
  "description": "在人才市场搜索匹配的智能体，根据需求关键词和分类返回候选列表",
  "parameters": {
    "keywords": "string[]",
    "category": "AgentCategory | null",
    "budget_max": "number | null"
  },
  "returns": "Agent[] (最多5个，按匹配度排序)"
}
```

### 5.2 `create_requirement`
```json
{
  "name": "create_requirement",
  "description": "将归集的需求信息创建为待招募数字工位需求单，POST 到后端持久化",
  "parameters": {
    "title": "string",
    "industry": "string",
    "pain_points": "string[]",
    "required_capabilities": "string[]",
    "budget_range": "{ min: number, max: number } | null",
    "urgency": "'high' | 'medium' | 'low'"
  },
  "returns": "{ requirement_id: string, position_number: string }"
}
```

### 5.3 `confirm_match`
```json
{
  "name": "confirm_match",
  "description": "用户确认选中某个智能体，触发跳转到 HireModal 流程",
  "parameters": {
    "agent_id": "string",
    "agent_name": "string"
  },
  "returns": "void（触发前端 HireModal）"
}
```

---

## 6. 系统架构

```
前端 React                     后端 Express (port 8000)        DeepSeek API
─────────────────────          ──────────────────────────      ──────────────
PreSalesPage (/presales)
  ├─ usePresalesStore           POST /api/presales/chat         deepseek-chat
  │    ├─ messages[]            (SSE streaming)                 Function Calling
  │    ├─ phase                                                 OpenAI 兼容格式
  │    ├─ collectedInfo{}       GET /api/marketplace/match
  │    └─ matches[]             (复用现有 mock fixtures)
  │
  ├─ AgentLoop                  POST /api/requirements
  │    ├─ turn-based loop       (持久化需求单)
  │    ├─ tool registry
  │    └─ SSE consumer
  │
  ├─ ConversationPanel (左栏)
  └─ RequirementsPanel (右栏)
```

---

## 7. 数据结构

### RequirementDraft（归集中的需求）
```typescript
interface RequirementDraft {
  industry: string | null
  teamSize: string | null
  painPoints: string[]
  requiredCapabilities: string[]
  budget: { min: number; max: number } | null
  urgency: 'high' | 'medium' | 'low' | null
  channels: string[]
}
```

### PresalesMessage
```typescript
interface PresalesMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  tags?: string[]          // 归集标签，仅 assistant 消息有
  toolCall?: {
    name: string
    result: unknown
  }
}
```

### RequirementPost（提交到后端）
```typescript
interface RequirementPost {
  title: string
  draft: RequirementDraft
  conversationSummary: string
  createdAt: string
}
```

---

## 8. 后端新增 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/presales/chat` | 接收消息，调用 DeepSeek，SSE 流式返回 |
| GET | `/api/marketplace/match?q=&category=&budget=` | 搜索人才市场（复用现有 fixtures） |
| POST | `/api/requirements` | 持久化需求单，返回 requirement_id + 数字工位号 |
| GET | `/api/requirements` | 获取所有待招募需求单（后台管理用） |

---

## 9. VEGA 触发集成

在 `VegaDrawer.tsx` 中检测用户输入意图词列表：
```
["我有需求", "我想要", "帮我找", "找一个", "需要一个智能体", "有没有能", "我们需要"]
```
检测到时，在 VEGA 回复中插入跳转提示：「检测到您有需求，是否需要我帮您启动需求诊断？」，点击后路由跳转 `/presales`，并将当前 VEGA 对话的上下文摘要带入 ARIA 初始化参数。

---

## 10. 新增文件清单

```
src/
  pages/
    presales/
      PreSalesPage.tsx          # 主页面，路由 /presales
      ConversationPanel.tsx     # 左栏对话区
      RequirementsPanel.tsx     # 右栏归集面板
      MatchResultView.tsx       # 对话结束后的结果展示
      usePresalesStore.ts       # Zustand store
      agentLoop.ts              # turn-based agent loop + tool registry
      tools/
        searchMarketplace.ts
        createRequirement.ts
        confirmMatch.ts

backend/
  routes/
    presales.js                 # POST /api/presales/chat (SSE)
    requirements.js             # POST/GET /api/requirements
    marketplace-match.js        # GET /api/marketplace/match
```

---

## 11. 不在范围内

- 需求单的审核/审批流程（后台管理功能，后续迭代）
- 多轮跟进通知（有新智能体时 push 通知）
- ARIA 的语音输入
- 移动端适配

---

## 12. 成功指标

- 用户完成一次完整对话（greeting → 结果展示）平均 < 5 分钟
- 对话归集的需求维度覆盖率 ≥ 4/5（行业/痛点/能力/预算/规模）
- 有匹配路径：从 ARIA 到 HireModal 的转化可追踪
- 无匹配路径：需求单正确持久化到后端
