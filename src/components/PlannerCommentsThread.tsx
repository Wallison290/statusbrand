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
    <div className="rounded-xl border border-white/8 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/8 flex items-center gap-2 bg-white/[0.02]">
        <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
          Comentários{comments.length > 0 ? ` · ${comments.length}` : ''}
        </span>
      </div>

      {/* Thread */}
      <div className="max-h-56 overflow-y-auto bg-black/10 px-3 py-3 space-y-2.5">
        {isLoading ? (
          <p className="text-[11px] text-gray-600 text-center py-2">Carregando...</p>
        ) : comments.length === 0 ? (
          <p className="text-[11px] text-gray-600 text-center py-4">
            Nenhum comentário ainda. Seja o primeiro a enviar uma mensagem.
          </p>
        ) : (
          comments.map(c => {
            const isOwn = c.role === role
            return (
              <div key={c.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold
                  ${c.role === 'client' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}
                >
                  {c.role === 'client' ? 'C' : 'A'}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap
                    ${isOwn
                      ? 'bg-blue-500/20 text-blue-100 rounded-br-sm'
                      : 'bg-white/8 text-gray-200 rounded-bl-sm'
                    }`}
                  >
                    {c.message}
                  </div>
                  <span className="text-[9px] text-gray-600 mt-0.5 px-1">
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
      <div className="px-3 py-2.5 border-t border-white/8 flex gap-2 bg-white/[0.02]">
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
          className="flex-1 rounded-lg border border-white/10 bg-black/20 text-white text-xs px-2.5 py-1.5 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 min-w-0"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || addComment.isPending}
          className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-[11px] font-semibold disabled:opacity-40 transition-colors flex-shrink-0"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
