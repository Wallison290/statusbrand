import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { History, Search, Filter, Copy, Trash2, Edit3, ArrowLeft, Save, Check } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useContents, useContent, useUpdateContent, useDeleteContent } from '@/hooks/useContents'
import { useClients } from '@/hooks/useClients'
import { useToast } from '@/components/ui/toast'
import { formatRelative, formatDate, contentTypeLabels, copyToClipboard } from '@/utils/formatters'

export function ContentHistory() {
  const { data: clients } = useClients()
  const { data: contents, isLoading } = useContents()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const deleteContent = useDeleteContent()

  const filtered = (contents || []).filter(c => {
    const matchSearch = c.term.toLowerCase().includes(search.toLowerCase()) ||
      (c.title || '').toLowerCase().includes(search.toLowerCase())
    const matchClient = clientFilter === 'all' || c.client_id === clientFilter
    const matchType = typeFilter === 'all' || c.content_type === typeFilter
    return matchSearch && matchClient && matchType
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este conteúdo?')) return
    await deleteContent.mutateAsync(id)
    toast('Conteúdo excluído.', 'success')
  }

  return (
    <div>
      <Header title="Histórico de Conteúdos" subtitle={`${contents?.length || 0} conteúdos salvos`} />
      <div className="p-4 md:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            className="max-w-xs"
          />
          <div className="w-44">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {(clients || []).map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(contentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <History className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400">Nenhum conteúdo encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="hover:border-white/15">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white text-sm">{c.title || c.term}</p>
                          <Badge status={c.status} />
                          <span className="text-xs text-gray-500 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                            {contentTypeLabels[c.content_type]}
                          </span>
                        </div>
                        {(c.client as any)?.company_name && (
                          <p className="text-xs text-blue-400 mt-0.5">{(c.client as any).company_name}</p>
                        )}
                        {c.caption && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.caption}</p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">{formatRelative(c.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={async () => { await copyToClipboard(c.caption || c.title || ''); toast('Copiado!', 'success') }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button asChild size="icon-sm" variant="ghost">
                          <Link to={`/history/${c.id}`}><Edit3 className="w-3.5 h-3.5" /></Link>
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="destructive"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ContentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: content, isLoading } = useContent(id!)
  const updateContent = useUpdateContent()
  const { toast } = useToast()
  const [form, setForm] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
  if (!content) return null

  const fields = [
    { key: 'title', label: 'Título' },
    { key: 'subtitle', label: 'Subtítulo' },
    { key: 'caption', label: 'Legenda', multiline: true, rows: 8 },
    { key: 'cta', label: 'CTA' },
    { key: 'hashtags', label: 'Hashtags' },
    { key: 'keywords', label: 'Palavras-chave' },
    { key: 'visual_suggestion', label: 'Sugestão Visual', multiline: true, rows: 2 },
    { key: 'carousel_ideas', label: 'Slides Carrossel', multiline: true, rows: 3 },
    { key: 'video_script', label: 'Roteiro de Vídeo', multiline: true, rows: 5 },
  ]

  const getValue = (key: string) => form[key] ?? (content as any)[key] ?? ''
  const set = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }))

  const handleSave = async () => {
    try {
      await updateContent.mutateAsync({ id: id!, ...form, status: 'editado', version: content.version + 1 })
      setSaved(true)
      toast('Conteúdo atualizado!', 'success')
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  return (
    <div>
      <Header
        title="Editar Conteúdo"
        subtitle={content.term}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
            <Button onClick={handleSave} variant={saved ? 'success' : 'premium'} size="sm" disabled={updateContent.isPending}>
              {saved ? <><Check className="w-4 h-4" /> Salvo</> : <><Save className="w-4 h-4" /> Salvar</>}
            </Button>
          </div>
        }
      />
      <div className="p-4 md:p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Badge status={content.status} />
          <span className="text-xs text-gray-500">{contentTypeLabels[content.content_type]}</span>
          <span className="text-xs text-gray-500">v{content.version}</span>
          {(content.client as any)?.company_name && (
            <span className="text-xs text-blue-400">{(content.client as any).company_name}</span>
          )}
        </div>
        <Card>
          <CardContent className="p-5 space-y-4">
            {fields.map(({ key, label, multiline, rows }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-400">{label}</label>
                  <button onClick={() => copyToClipboard(getValue(key)).then(() => toast('Copiado!', 'success'))} className="text-xs text-gray-500 hover:text-white">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                {multiline ? (
                  <Textarea value={getValue(key)} onChange={e => set(key, e.target.value)} rows={rows} showCount />
                ) : (
                  <Input value={getValue(key)} onChange={e => set(key, e.target.value)} />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
