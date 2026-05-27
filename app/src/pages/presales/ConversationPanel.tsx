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
