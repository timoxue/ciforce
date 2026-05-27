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
