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
