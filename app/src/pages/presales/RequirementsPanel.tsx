import { usePresalesStore } from './usePresalesStore'
import { MatchedAgent } from './types'

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
