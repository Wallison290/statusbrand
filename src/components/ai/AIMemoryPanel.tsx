import { useState } from 'react'
import { Brain, Trash2, Plus, X, Loader2, Pencil, Check } from 'lucide-react'
import { useAIMemory, useUpsertAIMemory } from '@/hooks/useAIContext'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Client } from '@/types'

interface AIMemoryPanelProps {
  client: Client
  onClose: () => void
}

export function AIMemoryPanel({ client, onClose }: AIMemoryPanelProps) {
  const qc = useQueryClient()
  const { data: memories = [], isLoading } = useAIMemory(client.id)
  const upsert = useUpsertAIMemory()

  const [addingNew, setAddingNew]     = useState(false)
  const [newKey, setNewKey]           = useState('')
  const [newValue, setNewValue]       = useState('')
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editValue, setEditValue]     = useState('')
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return
    await upsert.mutateAsync({ clientId: client.id, key: newKey.trim(), value: newValue.trim() })
    setNewKey('')
    setNewValue('')
    setAddingNew(false)
  }

  const handleEdit = async (id: string, key: string) => {
    if (!editValue.trim()) return
    await upsert.mutateAsync({ clientId: client.id, key, value: editValue.trim() })
    setEditingId(null)
    setEditValue('')
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('ai_client_memory').delete().eq('id', id)
      qc.invalidateQueries({ queryKey: ['ai_client_memory', client.id] })
      qc.invalidateQueries({ queryKey: ['ai_client_context', client.id] })
    } finally {
      setDeletingId(null)
    }
  }

  // Formata a chave para leitura humana
  function formatKey(key: string) {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-[#e2e8f0] w-80 flex-shrink-0 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[#e2e8f0] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center">
            <Brain className="w-3 h-3" style={{ color: '#ffffff' }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#0f0f0f] leading-none">Memórias</p>
            <p className="text-[10px] text-[#94a3b8] leading-none mt-0.5">{client.company_name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f5f5f5] text-[#94a3b8] hover:text-[#374151] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Info */}
      <div className="px-4 py-3 bg-[#faf5ff] border-b border-[#ede9fe]">
        <p className="text-[11px] text-[#6d28d9] leading-relaxed">
          A IA aprende automaticamente durante as conversas e salva decisões importantes aqui. Você também pode adicionar e editar manualmente.
        </p>
      </div>

      {/* Lista de memórias */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-[#94a3b8]" />
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Brain className="w-10 h-10 text-[#e2e8f0] mb-3" />
            <p className="text-[12px] text-[#94a3b8] font-medium">Nenhuma memória ainda</p>
            <p className="text-[11px] text-[#cbd5e1] mt-1 max-w-[180px]">
              Converse sobre este cliente e a IA vai aprender automaticamente
            </p>
          </div>
        ) : (
          memories.map(mem => (
            <div
              key={mem.id}
              className="bg-[#faf5ff] border border-[#ede9fe] rounded-xl px-3 py-2.5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wide leading-none mb-1">
                  {formatKey(mem.key)}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => { setEditingId(mem.id); setEditValue(mem.value) }}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#ede9fe] text-[#94a3b8] hover:text-[#6d28d9] transition-colors"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(mem.id)}
                    disabled={deletingId === mem.id}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-[#94a3b8] hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {deletingId === mem.id
                      ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      : <Trash2 className="w-2.5 h-2.5" />}
                  </button>
                </div>
              </div>

              {editingId === mem.id ? (
                <div className="flex gap-1.5 mt-1">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(mem.id, mem.key) }}
                    className="flex-1 text-[12px] bg-white border border-[#ddd6fe] rounded-lg px-2 py-1 outline-none focus:border-[#8b5cf6] text-[#374151]"
                  />
                  <button
                    onClick={() => handleEdit(mem.id, mem.key)}
                    disabled={upsert.isPending}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#6d28d9] hover:bg-[#5b21b6] transition-colors disabled:opacity-40"
                  >
                    <Check className="w-3 h-3" style={{ color: '#ffffff' }} />
                  </button>
                </div>
              ) : (
                <p className="text-[12px] text-[#374151] leading-relaxed">{mem.value}</p>
              )}

              <p className="text-[9px] text-[#c4b5fd] mt-1.5">
                {new Date(mem.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Adicionar memória manual */}
      <div className="border-t border-[#e2e8f0] p-3 flex-shrink-0">
        {addingNew ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              placeholder="Chave (ex: frequencia_posts)"
              className="w-full text-[12px] bg-[#f5f5f5] border border-[#e2e8f0] rounded-lg px-3 py-2 outline-none focus:border-[#8b5cf6] text-[#374151] placeholder:text-[#94a3b8]"
            />
            <textarea
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="Valor (ex: 3 posts por semana)"
              rows={2}
              className="w-full text-[12px] bg-[#f5f5f5] border border-[#e2e8f0] rounded-lg px-3 py-2 outline-none focus:border-[#8b5cf6] text-[#374151] placeholder:text-[#94a3b8] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newKey.trim() || !newValue.trim() || upsert.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#6d28d9] text-[12px] font-medium disabled:opacity-40 hover:bg-[#5b21b6] transition-colors"
                style={{ color: '#ffffff' }}
              >
                {upsert.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Salvar
              </button>
              <button
                onClick={() => { setAddingNew(false); setNewKey(''); setNewValue('') }}
                className="px-3 py-2 rounded-lg text-[12px] text-[#64748b] hover:bg-[#f5f5f5] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingNew(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#ddd6fe] text-[12px] text-[#7c3aed] hover:bg-[#faf5ff] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar memória manualmente
          </button>
        )}
      </div>
    </div>
  )
}
