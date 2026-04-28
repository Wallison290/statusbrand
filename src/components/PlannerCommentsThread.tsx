import { useState, useRef, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { usePlannerComments, useAddPlannerComment } from '@/hooks/usePlannerComments'
import { useToast } from '@/components/ui/toast'

export function PlannerCommentsThread({
  plannerId,
  role,
}: {
  plannerId: string
  role: 'client' | 'agency'
}) {
  const { data: comments = [], isLoading } = usePlannerComments(plannerId)
  const addComment = useAddPlannerComment()
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleSend = async () => {
    if (!input.trim() || addComment.isPending) return
    try {
      await addComment.mutateAsync({ plannerId, message: input.trim(), role })
      setInput('')
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[#e8e8e8]">

      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 border-b bg-[#f7f7f7] border-[#e8e8e8]">
        <MessageSquare className="w-3.5 h-3.5 text-[#737373]" />
        <span className="text-[10px] uppercase tracking-wide font-medium text-[#737373]">
          Comentários{comments.length > 0 ? ` · ${comments.length}` : ''}
        </span>
      </div>

      {/* Thread */}
      <div className="max-h-56 overflow-y-auto px-3 py-3 space-y-2.5 bg-[#f2f2f2]">
        {isLoading ? (
          <p className="text-[11px] text-center py-2 text-[#a0a0a0]">Carregando...</p>
        ) : comments.length === 0 ? (
          <p className="text-[11px] text-center py-4 text-[#a0a0a0]">
            Nenhum comentário ainda. Seja o primeiro a enviar uma mensagem.
          </p>
        ) : (
          comments.map(c => {
            const isOwn = c.role === role
            return (
              <div key={c.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${
                  c.role === 'client'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {c.role === 'client' ? 'C' : 'A'}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    isOwn
                      ? 'bg-blue-600 rounded-br-sm'
                      : 'bg-white border border-[#e8e8e8] text-[#0f0f0f] rounded-bl-sm'
                  }`} style={isOwn ? { color: '#ffffff' } : undefined}>
                    {c.message}
                  </div>
                  <span className="text-[9px] mt-0.5 px-1 text-[#a0a0a0]">
                    {format(parseISO(c.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 flex gap-2 border-t bg-white border-[#e8e8e8]">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={role === 'client' ? 'Envie uma mensagem para a agência...' : 'Responda ao cliente...'}
          className="flex-1 rounded-lg border text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 min-w-0 border-[#e0e0e0] bg-white text-[#0f0f0f] placeholder:text-[#a0a0a0]"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || addComment.isPending}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40 transition-colors flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
          style={{ color: '#ffffff' }}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
