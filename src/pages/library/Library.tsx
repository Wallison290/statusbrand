import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Copy, Trash2, BookOpen, Save,
  Lightbulb, Zap, Target, FileText, ImageIcon,
  Video, File as FileIcon,
  Building2, Loader2, X, Pencil, Eye, Upload,
  ExternalLink, Tag,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useLibrary, useCreateLibraryItem, useDeleteLibraryItem } from '@/hooks/useLibrary'
import {
  useContentAssets,
  useCreateContentAsset,
  useUpdateContentAsset,
  useDeleteContentAsset,
} from '@/hooks/useContentAssets'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { copyToClipboard, contentTypeLabels } from '@/utils/formatters'
import { supabase } from '@/integrations/supabase/client'
import type { LibraryCategory, ContentType, ContentAsset, Client } from '@/types'

// ─── Snippet categories ───────────────────────────────────────────────────────

const snippetCategories: { value: LibraryCategory; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'ideia',    label: 'Ideias',     icon: Lightbulb, color: 'text-yellow-500' },
  { value: 'gancho',   label: 'Ganchos',    icon: Zap,       color: 'text-blue-500'   },
  { value: 'cta',      label: 'CTAs',       icon: Target,    color: 'text-emerald-500' },
  { value: 'template', label: 'Templates',  icon: FileText,  color: 'text-purple-500' },
]

// ─── Content type icon ────────────────────────────────────────────────────────

const typeIcons: Record<string, React.ElementType> = {
  post: FileText, carrossel: FileText, reels: Video,
  story: ImageIcon, educativo: BookOpen, venda: Target,
  autoridade: Lightbulb, engajamento: Zap,
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = typeIcons[type] ?? FileIcon
  return <Icon className={className} />
}

// ─── Asset card ───────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onClick,
  onDelete,
}: {
  asset: ContentAsset
  onClick: (a: ContentAsset) => void
  onDelete: (a: ContentAsset) => void
}) {
  const clientName = asset.client?.company_name ?? null
  const isImage = asset.media_url && /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(asset.media_url)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden hover:border-[#c8c8c8] hover:shadow-md transition-all group cursor-pointer"
    >
      {/* Thumbnail — click opens detail */}
      <div
        className="relative h-36 bg-[#f5f5f5] flex items-center justify-center overflow-hidden"
        onClick={() => onClick(asset)}
      >
        {asset.media_url ? (
          isImage ? (
            <img
              src={asset.media_url}
              alt={asset.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <FileIcon className="w-7 h-7 text-[#b0b0b0]" />
              <span className="text-[10px] text-[#b0b0b0]">
                {asset.media_url.split('.').pop()?.split('?')[0]?.toUpperCase() || 'ARQUIVO'}
              </span>
            </div>
          )
        ) : (
          <TypeIcon type={asset.content_type} className="w-8 h-8 text-[#c8c8c8]" />
        )}

        {/* Type + category badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/90 border border-[#e0e0e0] text-[#737373]">
            {contentTypeLabels[asset.content_type as ContentType] ?? asset.content_type}
          </span>
          {asset.category && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/90 border border-[#e0e0e0] text-[#737373]">
              {asset.category}
            </span>
          )}
        </div>

        {/* Action buttons — visible on hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={e => { e.stopPropagation(); onClick(asset) }}
            className="w-6 h-6 rounded-full bg-white/90 border border-[#e0e0e0] text-[#737373] hover:text-[#0f0f0f] flex items-center justify-center"
            title="Visualizar / Editar"
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(asset) }}
            className="w-6 h-6 rounded-full bg-white/90 border border-[#e0e0e0] text-[#a0a0a0] hover:text-red-500 hover:border-red-200 flex items-center justify-center"
            title="Remover"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body — click opens detail */}
      <div className="p-3" onClick={() => onClick(asset)}>
        <p className="text-[13px] font-semibold text-[#0f0f0f] truncate">{asset.title}</p>
        {clientName ? (
          <div className="flex items-center gap-1 mt-1">
            <Building2 className="w-3 h-3 text-[#a0a0a0]" />
            <span className="text-[10px] text-[#737373] truncate">{clientName}</span>
          </div>
        ) : (
          <span className="inline-block mt-1 text-[9px] text-[#b0b0b0] border border-dashed border-[#e0e0e0] rounded-full px-2 py-0.5">
            Biblioteca geral
          </span>
        )}
        {asset.caption && (
          <p className="text-[11px] text-[#a0a0a0] mt-1.5 line-clamp-2 leading-relaxed">
            {asset.caption}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Asset Detail Modal (view + edit) ────────────────────────────────────────

function AssetDetailModal({
  asset,
  open,
  onClose,
  clients,
}: {
  asset: ContentAsset | null
  open: boolean
  onClose: () => void
  clients: Client[]
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const updateAsset = useUpdateContentAsset()
  const deleteAsset = useDeleteContentAsset()
  const fileRef = useRef<HTMLInputElement>(null)

  const [editMode, setEditMode] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    client_id: '' as string,
    content_type: 'post' as ContentType,
    category: '',
    caption: '',
    observations: '',
    media_url: '',
  })

  // Sync form whenever the asset changes or modal opens
  useEffect(() => {
    if (asset) {
      setForm({
        title: asset.title,
        client_id: asset.client_id ?? '',
        content_type: asset.content_type,
        category: asset.category ?? '',
        caption: asset.caption ?? '',
        observations: asset.observations ?? '',
        media_url: asset.media_url ?? '',
      })
      setEditMode(false)
      setConfirming(false)
    }
  }, [asset, open])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop() || 'bin'
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('content-assets').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('content-assets').getPublicUrl(path)
      setForm(p => ({ ...p, media_url: data.publicUrl }))
      toast('Arquivo enviado!', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!asset || !form.title.trim()) return
    try {
      await updateAsset.mutateAsync({
        id: asset.id,
        title:        form.title.trim(),
        client_id:    form.client_id || null,
        content_type: form.content_type,
        category:     form.category.trim() || null,
        caption:      form.caption.trim() || null,
        observations: form.observations.trim() || null,
        media_url:    form.media_url.trim() || null,
      })
      toast('Conteúdo atualizado!', 'success')
      setEditMode(false)
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!asset) return
    try {
      await deleteAsset.mutateAsync({
        id: asset.id,
        clientId: asset.client_id,
        mediaUrl: asset.media_url,
      })
      toast('Conteúdo removido.', 'success')
      onClose()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  if (!asset) return null

  const isImage = form.media_url && /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(form.media_url)
  const clientName = clients.find(c => c.id === (form.client_id || asset.client_id))?.company_name
    ?? asset.client?.company_name

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setEditMode(false); setConfirming(false) } }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              {editMode ? (
                <p className="text-[11px] font-medium text-[#737373] uppercase tracking-wide mb-1">Editando conteúdo</p>
              ) : (
                <p className="text-[11px] font-medium text-[#737373] uppercase tracking-wide mb-1">Conteúdo</p>
              )}
              <DialogTitle className="text-[15px] leading-snug truncate">
                {editMode ? form.title || 'Sem título' : asset.title}
              </DialogTitle>
            </div>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex-shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#e0e0e0] bg-white text-[11px] text-[#737373] hover:bg-[#f5f5f5] hover:text-[#0f0f0f] transition-colors"
              >
                <Pencil className="w-3 h-3" /> Editar
              </button>
            )}
          </div>
        </DialogHeader>

        {/* ── VIEW MODE ────────────────────────────────────────────────── */}
        {!editMode && (
          <div className="space-y-4 mt-1">
            {/* Media preview */}
            {asset.media_url && (
              isImage ? (
                <a href={asset.media_url} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={asset.media_url}
                    alt={asset.title}
                    className="w-full rounded-xl border border-[#e8e8e8] object-cover max-h-64"
                  />
                </a>
              ) : (
                <a
                  href={asset.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-[#e8e8e8] bg-[#f7f7f7] hover:bg-[#f0f0f0] transition-colors"
                >
                  <FileIcon className="w-4 h-4 text-[#a0a0a0]" />
                  <span className="text-[12px] text-[#737373] flex-1 truncate">Abrir arquivo</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#b0b0b0]" />
                </a>
              )
            )}

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#f0f0f0] text-[#737373] border border-[#e8e8e8]">
                {contentTypeLabels[asset.content_type as ContentType] ?? asset.content_type}
              </span>
              {asset.category && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#f0f0f0] text-[#737373] border border-[#e8e8e8]">
                  <Tag className="w-2.5 h-2.5" /> {asset.category}
                </span>
              )}
              {clientName ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-[#f0f0f0] text-[#737373] border border-[#e8e8e8]">
                  <Building2 className="w-2.5 h-2.5" /> {clientName}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#b0b0b0] px-2 py-1 rounded-full border border-dashed border-[#e0e0e0]">
                  Biblioteca geral
                </span>
              )}
            </div>

            {/* Caption */}
            {asset.caption && (
              <div className="p-3.5 rounded-xl bg-[#f7f7f7] border border-[#e8e8e8]">
                <p className="text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wide mb-2">Legenda / Copy</p>
                <p className="text-[13px] text-[#1a1a1a] leading-relaxed whitespace-pre-wrap">{asset.caption}</p>
              </div>
            )}

            {/* Observations */}
            {asset.observations && (
              <div className="p-3.5 rounded-xl bg-[#f7f7f7] border border-[#e8e8e8]">
                <p className="text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wide mb-2">Observações</p>
                <p className="text-[13px] text-[#737373] leading-relaxed">{asset.observations}</p>
              </div>
            )}

            {/* Empty state for content */}
            {!asset.caption && !asset.observations && !asset.media_url && (
              <div className="flex flex-col items-center justify-center py-8 text-center text-[12px] text-[#b0b0b0]">
                <FileIcon className="w-6 h-6 mb-2 text-[#d8d8d8]" />
                Nenhum conteúdo adicional cadastrado.
              </div>
            )}
          </div>
        )}

        {/* ── EDIT MODE ────────────────────────────────────────────────── */}
        {editMode && (
          <div className="space-y-3 mt-1">
            {/* Client */}
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
                Cliente (opcional)
              </label>
              <Select
                value={form.client_id || '__none__'}
                onValueChange={v => set('client_id', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem cliente — biblioteca geral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem cliente — biblioteca geral</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              label="Título *"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Nome do conteúdo..."
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
                  Tipo de conteúdo
                </label>
                <Select value={form.content_type} onValueChange={v => set('content_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(contentTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                label="Categoria"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                placeholder="Ex: Educativo, Venda..."
              />
            </div>

            <Textarea
              label="Legenda / Copy"
              value={form.caption}
              onChange={e => set('caption', e.target.value)}
              rows={4}
              placeholder="Texto principal do conteúdo..."
            />

            <Textarea
              label="Observações (opcional)"
              value={form.observations}
              onChange={e => set('observations', e.target.value)}
              rows={2}
              placeholder="Notas para a equipe..."
            />

            {/* Media */}
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
                Mídia (imagem / vídeo)
              </label>
              <div className="flex gap-2">
                <Input
                  value={form.media_url}
                  onChange={e => set('media_url', e.target.value)}
                  placeholder="URL da mídia..."
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="h-9 px-3 rounded-lg border border-[#e0e0e0] bg-[#f7f7f7] text-[11px] text-[#737373] hover:bg-[#efefef] transition-colors flex items-center gap-1.5 flex-shrink-0 disabled:opacity-60"
                >
                  {uploading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? 'Enviando...' : 'Upload'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*,.pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              {form.media_url && isImage && (
                <div className="mt-2 relative">
                  <img
                    src={form.media_url}
                    alt="preview"
                    className="w-full h-28 object-cover rounded-lg border border-[#e8e8e8]"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <button
                    onClick={() => set('media_url', '')}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white border border-[#e0e0e0] flex items-center justify-center text-[#a0a0a0] hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex items-center justify-between gap-2">
          {/* Delete — left side */}
          <div className="flex-1">
            {!editMode && (
              confirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#737373]">Confirmar exclusão?</span>
                  <button
                    onClick={() => setConfirming(false)}
                    className="text-[11px] text-[#a0a0a0] hover:text-[#0f0f0f] transition-colors"
                  >
                    Não
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteAsset.isPending}
                    className="text-[11px] text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    {deleteAsset.isPending ? 'Removendo...' : 'Sim, remover'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="flex items-center gap-1.5 text-[11px] text-[#c0c0c0] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              )
            )}
          </div>

          {/* Right actions */}
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateAsset.isPending || !form.title.trim()}
                >
                  {updateAsset.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
                    : <><Save className="w-3.5 h-3.5" /> Salvar alterações</>}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Asset Modal ──────────────────────────────────────────────────────────

function AddAssetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { data: clients = [] } = useClients()
  const createAsset = useCreateContentAsset()
  const fileRef = useRef<HTMLInputElement>(null)

  const blank = {
    client_id: '' as string,
    title: '',
    content_type: 'post' as ContentType,
    category: '',
    caption: '',
    observations: '',
    media_url: '',
  }
  const [form, setForm] = useState(blank)
  const [uploading, setUploading] = useState(false)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('content-assets').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('content-assets').getPublicUrl(path)
      setForm(p => ({ ...p, media_url: data.publicUrl }))
      toast('Arquivo enviado!', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !form.title.trim()) return
    try {
      await createAsset.mutateAsync({
        user_id: user.id,
        client_id: form.client_id || null,
        category:  form.category.trim() || null,
        title:     form.title.trim(),
        content_type: form.content_type,
        caption:   form.caption.trim() || null,
        observations: form.observations.trim() || null,
        media_url: form.media_url.trim() || null,
      })
      toast('Conteúdo adicionado à biblioteca!', 'success')
      setForm(blank)
      onClose()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setForm(blank); onClose() } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo conteúdo na biblioteca</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* Client */}
          <div>
            <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
              Cliente (opcional)
            </label>
            <Select value={form.client_id} onValueChange={v => set('client_id', v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sem cliente — biblioteca geral" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem cliente — biblioteca geral</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            label="Título *"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Nome do conteúdo..."
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
                Tipo de conteúdo
              </label>
              <Select value={form.content_type} onValueChange={v => set('content_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(contentTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Categoria"
              value={form.category}
              onChange={e => set('category', e.target.value)}
              placeholder="Ex: Educativo, Venda..."
            />
          </div>

          <Textarea
            label="Legenda / Copy"
            value={form.caption}
            onChange={e => set('caption', e.target.value)}
            rows={3}
            placeholder="Texto principal do conteúdo..."
          />

          <Textarea
            label="Observações (opcional)"
            value={form.observations}
            onChange={e => set('observations', e.target.value)}
            rows={2}
            placeholder="Notas para a equipe..."
          />

          {/* Media */}
          <div>
            <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
              Mídia (imagem / vídeo)
            </label>
            <div className="flex gap-2">
              <Input
                value={form.media_url}
                onChange={e => set('media_url', e.target.value)}
                placeholder="URL da mídia..."
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="h-9 px-3 rounded-lg border border-[#e0e0e0] bg-[#f7f7f7] text-[11px] text-[#737373] hover:bg-[#efefef] transition-colors flex items-center gap-1.5 flex-shrink-0 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                {uploading ? 'Enviando...' : 'Upload'}
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
            </div>
            {form.media_url && (
              <div className="mt-2 relative">
                <img
                  src={form.media_url}
                  alt="preview"
                  className="w-full h-28 object-cover rounded-lg border border-[#e8e8e8]"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <button
                  onClick={() => set('media_url', '')}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white border border-[#e0e0e0] flex items-center justify-center text-[#a0a0a0] hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { setForm(blank); onClose() }}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={createAsset.isPending || !form.title.trim()}
          >
            {createAsset.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
              : <><Save className="w-3.5 h-3.5" /> Salvar conteúdo</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Conteúdos Tab ────────────────────────────────────────────────────────────

function ConteudosTab() {
  const { data: assets = [], isLoading } = useContentAssets()
  const { data: clients = [] } = useClients()
  const deleteAsset = useDeleteContentAsset()
  const { toast } = useToast()

  const [addOpen, setAddOpen]             = useState(false)
  const [viewingAsset, setViewingAsset]   = useState<ContentAsset | null>(null)
  const [detailOpen, setDetailOpen]       = useState(false)
  const [search, setSearch]               = useState('')
  const [clientFilter, setClientFilter]   = useState<string>('all')
  const [typeFilter, setTypeFilter]       = useState<string>('all')

  const filtered = useMemo(() => {
    let list = assets
    if (clientFilter === '__none__') list = list.filter(a => !a.client_id)
    else if (clientFilter !== 'all') list = list.filter(a => a.client_id === clientFilter)
    if (typeFilter !== 'all') list = list.filter(a => a.content_type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.caption ?? '').toLowerCase().includes(q) ||
        (a.category ?? '').toLowerCase().includes(q) ||
        (a.client?.company_name ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [assets, clientFilter, typeFilter, search])

  // Open detail modal
  const openDetail = (asset: ContentAsset) => {
    setViewingAsset(asset)
    setDetailOpen(true)
  }

  // Quick-delete from card (bypass modal — same as before)
  const handleQuickDelete = async (asset: ContentAsset) => {
    if (!confirm(`Remover "${asset.title}"?`)) return
    try {
      await deleteAsset.mutateAsync({ id: asset.id, clientId: asset.client_id, mediaUrl: asset.media_url })
      toast('Conteúdo removido.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  // Unique types present in the current list
  const types = useMemo(() => [...new Set(assets.map(a => a.content_type))], [assets])

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {/* Client filter */}
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="h-8 rounded-lg border border-[#e0e0e0] bg-white text-[12px] text-[#0f0f0f] px-2.5 focus:outline-none focus:border-[#b0b0b0]"
          >
            <option value="all">Todos os clientes</option>
            <option value="__none__">Sem cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-8 rounded-lg border border-[#e0e0e0] bg-white text-[12px] text-[#0f0f0f] px-2.5 focus:outline-none focus:border-[#b0b0b0]"
          >
            <option value="all">Todos os tipos</option>
            {types.map(t => (
              <option key={t} value={t}>{contentTypeLabels[t as ContentType] ?? t}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#b0b0b0] pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar conteúdo..."
            className="h-8 pl-8 pr-3 rounded-lg border border-[#e0e0e0] bg-white text-[12px] text-[#0f0f0f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#b0b0b0] w-52"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-52 rounded-xl border border-[#e8e8e8] bg-[#f7f7f7] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl border border-[#e8e8e8] bg-[#f5f5f5] flex items-center justify-center mb-4">
            <ImageIcon className="w-5 h-5 text-[#c0c0c0]" />
          </div>
          <p className="text-[14px] font-medium text-[#737373]">Nenhum conteúdo encontrado</p>
          <p className="text-[12px] text-[#b0b0b0] mt-1">Adicione conteúdos à biblioteca ou ajuste os filtros.</p>
          <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Adicionar conteúdo
          </Button>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-[#b0b0b0]">{filtered.length} conteúdo{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onClick={openDetail}
                  onDelete={handleQuickDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Add modal */}
      <AddAssetModal open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Detail / Edit modal */}
      <AssetDetailModal
        asset={viewingAsset}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setViewingAsset(null) }}
        clients={clients}
      />
    </>
  )
}

// ─── Snippets Tab (existing — unchanged logic) ────────────────────────────────

function SnippetsTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeCategory, setActiveCategory] = useState<LibraryCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: 'ideia' as LibraryCategory, niche: '' })

  const { data: items, isLoading } = useLibrary(activeCategory === 'all' ? undefined : activeCategory)
  const createItem = useCreateLibraryItem()
  const deleteItem = useDeleteLibraryItem()

  const filtered = (items || []).filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.content.toLowerCase().includes(search.toLowerCase())
  )

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim() || !user) return
    try {
      await createItem.mutateAsync({
        user_id: user.id,
        title: form.title,
        content: form.content,
        category: form.category,
        niche: form.niche || null,
        tags: null,
      })
      toast('Item adicionado à biblioteca!', 'success')
      setOpen(false)
      setForm({ title: '', content: '', category: 'ideia', niche: '' })
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const getCategoryInfo = (cat: LibraryCategory) => snippetCategories.find(c => c.value === cat)

  return (
    <>
      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-1.5 border ${
            activeCategory === 'all'
              ? 'bg-[#0f0f0f] text-white border-[#0f0f0f]'
              : 'bg-white text-[#737373] border-[#e0e0e0] hover:bg-[#f5f5f5] hover:text-[#0f0f0f]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Todos
        </button>
        {snippetCategories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-1.5 border ${
              activeCategory === cat.value
                ? 'bg-[#0f0f0f] text-white border-[#0f0f0f]'
                : 'bg-white text-[#737373] border-[#e0e0e0] hover:bg-[#f5f5f5] hover:text-[#0f0f0f]'
            }`}
          >
            <cat.icon className={`w-3.5 h-3.5 ${activeCategory === cat.value ? 'text-white' : cat.color}`} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#b0b0b0] pointer-events-none" />
        <input
          placeholder="Buscar snippets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-8 pl-8 pr-3 rounded-lg border border-[#e0e0e0] bg-white text-[12px] text-[#0f0f0f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#b0b0b0]"
        />
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-[#e8e8e8] bg-[#f7f7f7] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-10 h-10 text-[#c0c0c0] mb-3" />
          <p className="text-[13px] text-[#a0a0a0]">Biblioteca de snippets vazia.</p>
          <Button size="sm" className="mt-4" onClick={() => setOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Adicionar snippet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((item, i) => {
              const catInfo = getCategoryInfo(item.category as LibraryCategory)
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="bg-white rounded-xl border border-[#e8e8e8] p-4 hover:border-[#d0d0d0] hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {catInfo && <catInfo.icon className={`w-4 h-4 flex-shrink-0 ${catInfo.color}`} />}
                        <p className="font-medium text-[#0f0f0f] text-[13px]">{item.title}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => copyToClipboard(item.content).then(() => toast('Copiado!', 'success'))}
                          className="text-[#b0b0b0] hover:text-[#0f0f0f] transition-colors p-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteItem.mutateAsync(item.id)}
                          className="text-[#c0c0c0] hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#737373] line-clamp-3 leading-relaxed">{item.content}</p>
                    {item.niche && (
                      <span className="inline-block mt-2 text-[10px] text-[#a0a0a0] bg-[#f5f5f5] border border-[#e8e8e8] px-2 py-0.5 rounded-full">
                        {item.niche}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add snippet modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar snippet à biblioteca</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">Categoria</label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {snippetCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input label="Título *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Nome do snippet..." />
            <Textarea label="Conteúdo *" value={form.content} onChange={e => set('content', e.target.value)} rows={4} placeholder="Cole o texto aqui..." />
            <Input label="Nicho (opcional)" value={form.niche} onChange={e => set('niche', e.target.value)} placeholder="Ex: Fitness, Gastronomia..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createItem.isPending}>
              <Save className="w-3.5 h-3.5" /> Salvar snippet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type LibraryTab = 'conteudos' | 'snippets'

export function Library() {
  const [tab, setTab]           = useState<LibraryTab>('conteudos')
  const [addOpen, setAddOpen]   = useState(false)

  return (
    <div>
      <Header
        title="Biblioteca"
        subtitle="Conteúdos e recursos da sua agência"
        action={
          tab === 'conteudos' ? (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Novo conteúdo
            </Button>
          ) : undefined
        }
      />

      <div className="p-6 space-y-5">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-[#f0f0f0] rounded-xl p-1 w-fit">
          {([
            ['conteudos', 'Conteúdos'],
            ['snippets',  'Snippets & Copy'],
          ] as [LibraryTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                tab === key
                  ? 'bg-white text-[#0f0f0f] shadow-sm border border-[#e8e8e8]'
                  : 'text-[#737373] hover:text-[#0f0f0f]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {tab === 'conteudos'
              ? <ConteudosTab />
              : <SnippetsTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Global add modal (triggered from header) */}
      <AddAssetModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
