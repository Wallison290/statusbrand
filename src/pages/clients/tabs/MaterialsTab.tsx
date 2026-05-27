import { useState, useRef, useMemo, useEffect } from 'react'
import {
  Plus, Upload, Trash2, ExternalLink, FileText,
  ImageIcon, Video, Link2, File, Pencil, X, Save,
  Folder, FolderPlus, ArrowLeft, ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import {
  useClientMaterials,
  useAddMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
} from '@/hooks/useClientMaterials'
import { supabase } from '@/integrations/supabase/client'
import { formatDate } from '@/utils/formatters'
import type { ClientMaterial, MaterialType } from '@/types'

// ─── Configs ──────────────────────────────────────────────────────────────────

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'pdf',       label: 'PDF' },
  { value: 'imagem',    label: 'Imagem' },
  { value: 'video',     label: 'Vídeo' },
  { value: 'link',      label: 'Link externo' },
  { value: 'documento', label: 'Documento' },
  { value: 'outro',     label: 'Outro' },
]

const TYPE_META: Record<MaterialType, { label: string; color: string; bg: string; icon: string }> = {
  pdf:       { label: 'PDF',       color: 'text-red-600',    bg: 'bg-red-50',    icon: 'pdf' },
  imagem:    { label: 'Imagem',    color: 'text-blue-600',   bg: 'bg-blue-50',   icon: 'img' },
  video:     { label: 'Vídeo',     color: 'text-violet-600', bg: 'bg-violet-50', icon: 'vid' },
  link:      { label: 'Link',      color: 'text-sky-600',    bg: 'bg-sky-50',    icon: 'lnk' },
  documento: { label: 'Documento', color: 'text-zinc-600',   bg: 'bg-zinc-100',  icon: 'doc' },
  outro:     { label: 'Outro',     color: 'text-zinc-500',   bg: 'bg-zinc-100',  icon: 'out' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function MaterialIcon({ type, size = 'md' }: { type: MaterialType; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'
  const meta = TYPE_META[type]
  switch (type) {
    case 'pdf':    return <FileText  className={`${sz} ${meta.color}`} />
    case 'imagem': return <ImageIcon className={`${sz} ${meta.color}`} />
    case 'video':  return <Video     className={`${sz} ${meta.color}`} />
    case 'link':   return <Link2     className={`${sz} ${meta.color}`} />
    default:       return <File      className={`${sz} ${meta.color}`} />
  }
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// ─── Folder card ──────────────────────────────────────────────────────────────

function FolderCard({
  name,
  count,
  onClick,
  onDelete,
}: {
  name: string
  count: number
  onClick: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      className="relative bg-white border border-[#e8e8e8] rounded-2xl p-4 cursor-pointer hover:border-[#c8c8c8] hover:shadow-md transition-all group select-none"
      onClick={() => { if (!menuOpen && !confirmDelete) onClick() }}
    >
      {/* Folder icon */}
      <div className="mb-3 relative">
        <div className="w-14 h-14 flex items-center justify-center">
          <Folder className="w-14 h-14 text-[#f59e0b]" fill="#fef9ee" strokeWidth={1.5} />
        </div>
        {count > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-[#f59e0b] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
            {count}
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-[13px] font-semibold text-[#0f0f0f] truncate leading-snug">{name}</p>
      <p className="text-[11px] text-[#9ca3af] mt-0.5">
        {count} arquivo{count !== 1 ? 's' : ''}
      </p>

      {/* Actions menu */}
      <div
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        {confirmDelete ? (
          <div className="flex items-center gap-1 bg-white border border-[#e8e8e8] rounded-lg shadow-sm px-2 py-1">
            <span className="text-[10px] text-[#6b7280] mr-1">Excluir?</span>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[10px] text-[#6b7280] hover:text-[#0f0f0f] px-1.5 py-0.5 rounded"
            >
              Não
            </button>
            <button
              onClick={() => { setConfirmDelete(false); setMenuOpen(false); onDelete() }}
              className="text-[10px] text-red-600 hover:text-red-700 font-medium px-1.5 py-0.5 rounded"
            >
              Sim
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[#c0c0c0] hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Excluir pasta"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Hover caret */}
      <ChevronRight className="absolute right-3 bottom-4 w-4 h-4 text-[#d0d0d0] opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

// ─── Material row ─────────────────────────────────────────────────────────────

function MaterialRow({
  mat,
  onEdit,
  onDelete,
}: {
  mat: ClientMaterial
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const meta = TYPE_META[mat.type]
  const size = formatSize(mat.file_size)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
      className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-[#e8e8e8] bg-white hover:border-[#d0d0d0] hover:shadow-sm transition-all group"
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
        <MaterialIcon type={mat.type} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#0f0f0f] truncate">{mat.title}</p>
        <p className="text-[11px] text-[#9ca3af] mt-0.5">
          <span className={`font-medium ${meta.color}`}>{meta.label}</span>
          {size && <span> · {size}</span>}
          <span> · {formatDate(mat.created_at)}</span>
        </p>
        {mat.description && (
          <p className="text-[11px] text-[#b0b0b0] truncate mt-0.5">{mat.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {(mat.file_url || mat.link_url) && (
          <a
            href={mat.link_url || mat.file_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#b0b0b0] hover:text-[#0f0f0f] hover:bg-[#f0f0f0] transition-colors"
            title="Abrir"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={onEdit}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#b0b0b0] hover:text-[#0f0f0f] hover:bg-[#f0f0f0] transition-colors"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[11px] text-[#6b7280] hover:text-[#0f0f0f] px-2 py-1 rounded-lg hover:bg-[#f0f0f0] transition-colors"
            >
              Não
            </button>
            <button
              onClick={onDelete}
              className="text-[11px] text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              Excluir
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#b0b0b0] hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Material form modal ──────────────────────────────────────────────────────

const blankForm = {
  title:       '',
  description: '',
  type:        'documento' as MaterialType,
  link_url:    '',
  folder_name: '',
}

function MaterialFormModal({
  open,
  onClose,
  editing,
  prefillFolder,
  clientId,
  userId,
}: {
  open:          boolean
  onClose:       () => void
  editing:       ClientMaterial | null
  prefillFolder: string
  clientId:      string
  userId:        string
}) {
  const addMaterial    = useAddMaterial()
  const updateMaterial = useUpdateMaterial()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm]               = useState(blankForm)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading]       = useState(false)

  const isLink = form.type === 'link'

  // Sync form whenever the modal opens or the target changes
  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        title:       editing.title,
        description: editing.description || '',
        type:        editing.type,
        link_url:    editing.link_url || '',
        folder_name: editing.folder_name || '',
      })
    } else {
      setForm({ ...blankForm, folder_name: prefillFolder })
    }
    setSelectedFile(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const set = (k: keyof typeof blankForm, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) return
    setUploading(true)
    try {
      let file_url:  string | null = editing?.file_url  ?? null
      let file_size: number | null = editing?.file_size ?? null

      if (selectedFile && !isLink) {
        const ext  = selectedFile.name.split('.').pop() || 'bin'
        const path = `${userId}/${clientId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('client-materials').upload(path, selectedFile)
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('client-materials').getPublicUrl(path)
        file_url  = publicUrl
        file_size = selectedFile.size
      }

      const payload = {
        title:       form.title.trim(),
        description: form.description.trim() || null,
        type:        form.type,
        file_url:    isLink ? null : file_url,
        link_url:    isLink ? (form.link_url.trim() || null) : null,
        file_size:   isLink ? null : file_size,
        folder_name: form.folder_name.trim() || null,
      }

      if (editing) {
        await updateMaterial.mutateAsync({ id: editing.id, clientId, ...payload })
        toast('Material atualizado!', 'success')
      } else {
        await addMaterial.mutateAsync({ user_id: userId, client_id: clientId, ...payload })
        toast('Material adicionado!', 'success')
      }
      onClose()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar material' : 'Adicionar material'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1 max-h-[60vh] overflow-y-auto pr-1">
          <Input
            label="Título *"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Nome do material..."
          />

          <div>
            <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">Tipo</label>
            <Select value={form.type} onValueChange={v => set('type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            label="Descrição (opcional)"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Breve descrição para o cliente..."
            rows={2}
          />

          {/* Pasta */}
          <div>
            <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
              Pasta (opcional)
            </label>
            <div className="relative">
              <Folder className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#f59e0b] pointer-events-none" />
              <input
                type="text"
                value={form.folder_name}
                onChange={e => set('folder_name', e.target.value)}
                placeholder="Ex: Campanha Abril, Stories..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#e0e0e0] bg-white text-[13px] text-[#0f0f0f] placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#b0b0b0]"
              />
            </div>
          </div>

          {/* Link ou arquivo */}
          {isLink ? (
            <Input
              label="URL *"
              value={form.link_url}
              onChange={e => set('link_url', e.target.value)}
              placeholder="https://..."
            />
          ) : (
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1.5 uppercase tracking-wide">
                Arquivo
              </label>
              {selectedFile ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[#e0e0e0] bg-[#f8fafc]">
                  <File className="w-3.5 h-3.5 text-[#6b7280] flex-shrink-0" />
                  <span className="text-[12px] text-[#374151] truncate flex-1">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-[#9ca3af] hover:text-red-400 flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : editing?.file_url ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[#e0e0e0] bg-[#f8fafc]">
                  <File className="w-3.5 h-3.5 text-[#6b7280] flex-shrink-0" />
                  <span className="text-[12px] text-[#6b7280] truncate flex-1">Arquivo atual</span>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-[11px] text-blue-600 hover:text-blue-700 flex-shrink-0"
                  >
                    Substituir
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full h-16 rounded-xl border-2 border-dashed border-[#e0e0e0] text-[#9ca3af] text-[12px] hover:border-[#b0b0b0] hover:bg-[#f8fafc] transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Clique para selecionar arquivo
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) setSelectedFile(f)
                  e.target.value = ''
                }}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={uploading || !form.title.trim() || (isLink && !form.link_url.trim())}
          >
            {uploading ? (
              <><Upload className="w-3 h-3 animate-pulse" /> Enviando...</>
            ) : editing ? (
              <><Save className="w-3 h-3" /> Salvar</>
            ) : (
              <><Plus className="w-3 h-3" /> Adicionar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── New folder modal ─────────────────────────────────────────────────────────

function NewFolderModal({
  open,
  onClose,
  onConfirm,
  existingFolders,
}: {
  open:            boolean
  onClose:         () => void
  onConfirm:       (name: string) => void
  existingFolders: string[]
}) {
  const [name, setName] = useState('')
  const isDuplicate = existingFolders.includes(name.trim())

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (!trimmed || isDuplicate) return
    onConfirm(trimmed)
    setName('')
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setName('') } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova pasta</DialogTitle>
        </DialogHeader>
        <div className="mt-1">
          <div className="relative">
            <Folder className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f59e0b] pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              placeholder="Nome da pasta..."
              autoFocus
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#e0e0e0] bg-white text-[13px] text-[#0f0f0f] placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#b0b0b0]"
            />
          </div>
          {isDuplicate && (
            <p className="text-[11px] text-red-500 mt-1.5">Já existe uma pasta com esse nome.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { onClose(); setName('') }}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!name.trim() || isDuplicate}
          >
            <FolderPlus className="w-3 h-3" /> Criar pasta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MaterialsTab({ clientId }: { clientId: string }) {
  const { user } = useAuth()
  const { data: materials = [] } = useClientMaterials(clientId)
  const deleteMaterial = useDeleteMaterial()
  const { toast } = useToast()

  // Navigation
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)

  // Modals
  const [formOpen, setFormOpen]           = useState(false)
  const [editing, setEditing]             = useState<ClientMaterial | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [prefillFolder, setPrefillFolder] = useState('')

  // Derived data
  const folders = useMemo(() => {
    const map = new Map<string, number>()
    materials.forEach(m => {
      if (m.folder_name) {
        map.set(m.folder_name, (map.get(m.folder_name) ?? 0) + 1)
      }
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [materials])

  const rootMaterials   = useMemo(() => materials.filter(m => !m.folder_name), [materials])
  const folderMaterials = useMemo(
    () => materials.filter(m => m.folder_name === currentFolder),
    [materials, currentFolder],
  )

  // Open add modal (context-aware)
  const openAdd = (folder = '') => {
    setEditing(null)
    setPrefillFolder(folder)
    setFormOpen(true)
  }

  // Open edit modal
  const openEdit = (mat: ClientMaterial) => {
    setEditing(mat)
    setPrefillFolder(mat.folder_name ?? '')
    setFormOpen(true)
  }

  // Delete single material
  const handleDelete = async (mat: ClientMaterial) => {
    try {
      await deleteMaterial.mutateAsync({ id: mat.id, clientId, fileUrl: mat.file_url })
      toast('Material removido.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  // Delete entire folder (all materials inside)
  const handleDeleteFolder = async (folderName: string) => {
    const toDelete = materials.filter(m => m.folder_name === folderName)
    try {
      await Promise.all(
        toDelete.map(m => deleteMaterial.mutateAsync({ id: m.id, clientId, fileUrl: m.file_url }))
      )
      toast(`Pasta "${folderName}" excluída.`, 'success')
      if (currentFolder === folderName) setCurrentFolder(null)
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  // New folder confirmed → open add-material modal pre-filled
  const handleNewFolderConfirm = (name: string) => {
    setNewFolderOpen(false)
    setCurrentFolder(name)
    openAdd(name)
  }

  // ── Render: folder view ─────────────────────────────────────────────────────

  if (currentFolder !== null) {
    return (
      <div className="space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentFolder(null)}
              className="inline-flex items-center gap-1.5 text-[12px] text-[#6b7280] hover:text-[#0f0f0f] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Materiais
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#c0c0c0]" />
            <div className="flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-[#f59e0b]" fill="#fef9ee" />
              <span className="text-[13px] font-semibold text-[#0f0f0f]">{currentFolder}</span>
            </div>
          </div>
          <button
            onClick={() => openAdd(currentFolder)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium bg-[#0f0f0f] text-white hover:bg-[#1e293b] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar arquivo
          </button>
        </div>

        {/* Counter */}
        <p className="text-[11px] text-[#9ca3af]">
          {folderMaterials.length} arquivo{folderMaterials.length !== 1 ? 's' : ''}
        </p>

        {/* Materials */}
        {folderMaterials.length === 0 ? (
          <div className="text-center py-14 border-2 border-dashed border-[#e8e8e8] rounded-2xl">
            <Folder className="w-10 h-10 text-[#d0d0d0] mx-auto mb-3" />
            <p className="text-[13px] font-medium text-[#374151]">Pasta vazia</p>
            <p className="text-[11px] text-[#9ca3af] mt-0.5">Adicione o primeiro arquivo a esta pasta</p>
            <button
              onClick={() => openAdd(currentFolder)}
              className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium bg-[#0f0f0f] text-white hover:bg-[#1e293b] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar arquivo
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {folderMaterials.map(mat => (
                <MaterialRow
                  key={mat.id}
                  mat={mat}
                  onEdit={() => openEdit(mat)}
                  onDelete={() => handleDelete(mat)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Modals */}
        <MaterialFormModal
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null) }}
          editing={editing}
          prefillFolder={prefillFolder}
          clientId={clientId}
          userId={user?.id ?? ''}
        />
      </div>
    )
  }

  // ── Render: root view ───────────────────────────────────────────────────────

  const totalCount = materials.length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[#0f0f0f]">Materiais do cliente</p>
          <p className="text-[11px] text-[#9ca3af] mt-0.5">
            {totalCount} {totalCount === 1 ? 'arquivo' : 'arquivos'} · visíveis no portal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewFolderOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium border border-[#e0e0e0] bg-white text-[#374151] hover:bg-[#f5f5f5] transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#f59e0b]" /> Nova pasta
          </button>
          <button
            onClick={() => openAdd('')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium bg-[#0f0f0f] text-white hover:bg-[#1e293b] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar arquivo
          </button>
        </div>
      </div>

      {/* Empty state global */}
      {materials.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-[#e8e8e8] rounded-2xl">
          <div className="flex justify-center mb-3">
            <Folder className="w-12 h-12 text-[#e0e0e0]" />
          </div>
          <p className="text-[13px] font-medium text-[#374151]">Nenhum material ainda</p>
          <p className="text-[11px] text-[#9ca3af] mt-1">
            Adicione PDFs, imagens, links e documentos.<br />O cliente verá tudo no portal.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setNewFolderOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium border border-[#e0e0e0] bg-white text-[#374151] hover:bg-[#f5f5f5] transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#f59e0b]" /> Nova pasta
            </button>
            <button
              onClick={() => openAdd('')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium bg-[#0f0f0f] text-white hover:bg-[#1e293b] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar arquivo
            </button>
          </div>
        </div>
      )}

      {/* Folders section */}
      {folders.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">
            Pastas — {folders.length}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            <AnimatePresence>
              {folders.map(([name, count]) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                >
                  <FolderCard
                    name={name}
                    count={count}
                    onClick={() => setCurrentFolder(name)}
                    onDelete={() => handleDeleteFolder(name)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Root materials (no folder) */}
      {rootMaterials.length > 0 && (
        <div>
          {folders.length > 0 && (
            <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">
              Sem pasta — {rootMaterials.length}
            </p>
          )}
          <div className="space-y-2">
            <AnimatePresence>
              {rootMaterials.map(mat => (
                <MaterialRow
                  key={mat.id}
                  mat={mat}
                  onEdit={() => openEdit(mat)}
                  onDelete={() => handleDelete(mat)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Modals */}
      <MaterialFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        editing={editing}
        prefillFolder={prefillFolder}
        clientId={clientId}
        userId={user?.id ?? ''}
      />

      <NewFolderModal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onConfirm={handleNewFolderConfirm}
        existingFolders={folders.map(([n]) => n)}
      />
    </div>
  )
}
