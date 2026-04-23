import { useState, useRef } from 'react'
import {
  Plus, Upload, Trash2, ExternalLink, FileText,
  ImageIcon, Video, Link2, File, Pencil, X, Save,
} from 'lucide-react'
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

// ─── Config ───────────────────────────────────────────────────────────────────

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'pdf',       label: 'PDF' },
  { value: 'imagem',    label: 'Imagem' },
  { value: 'video',     label: 'Vídeo' },
  { value: 'link',      label: 'Link externo' },
  { value: 'documento', label: 'Documento' },
  { value: 'outro',     label: 'Outro' },
]

function MaterialIcon({ type }: { type: MaterialType }) {
  switch (type) {
    case 'pdf':    return <FileText  className="w-3.5 h-3.5 text-red-400" />
    case 'imagem': return <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
    case 'video':  return <Video     className="w-3.5 h-3.5 text-purple-400" />
    case 'link':   return <Link2     className="w-3.5 h-3.5 text-sky-400" />
    default:       return <File      className="w-3.5 h-3.5 text-zinc-500" />
  }
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MaterialsTab({ clientId }: { clientId: string }) {
  const { user } = useAuth()
  const { data: materials = [] } = useClientMaterials(clientId)
  const addMaterial    = useAddMaterial()
  const updateMaterial = useUpdateMaterial()
  const deleteMaterial = useDeleteMaterial()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState<ClientMaterial | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const blank = { title: '', description: '', type: 'documento' as MaterialType, link_url: '', folder_name: '' }
  const [form, setForm] = useState(blank)

  const isLink = form.type === 'link'

  const resetForm = () => {
    setForm(blank)
    setSelectedFile(null)
    setEditing(null)
  }

  const openCreate = () => { resetForm(); setModalOpen(true) }

  const openEdit = (mat: ClientMaterial) => {
    setEditing(mat)
    setForm({
      title:       mat.title,
      description: mat.description || '',
      type:        mat.type,
      link_url:    mat.link_url || '',
      folder_name: mat.folder_name || '',
    })
    setSelectedFile(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !user) return
    setUploading(true)
    try {
      let file_url:  string | null = editing?.file_url  ?? null
      let file_size: number | null = editing?.file_size ?? null

      if (selectedFile && !isLink) {
        const ext  = selectedFile.name.split('.').pop() || 'bin'
        const path = `${user.id}/${clientId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
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
        ...(form.folder_name?.trim() ? { folder_name: form.folder_name.trim() } : { folder_name: null }),
      }

      if (editing) {
        await updateMaterial.mutateAsync({ id: editing.id, clientId, ...payload })
        toast('Material atualizado!', 'success')
      } else {
        await addMaterial.mutateAsync({ user_id: user.id, client_id: clientId, ...payload })
        toast('Material adicionado!', 'success')
      }

      setModalOpen(false)
      resetForm()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (mat: ClientMaterial) => {
    try {
      await deleteMaterial.mutateAsync({ id: mat.id, clientId, fileUrl: mat.file_url })
      toast('Material removido.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] font-medium text-zinc-200">Materiais do cliente</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {materials.length} {materials.length === 1 ? 'material' : 'materiais'} — visíveis no portal
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3 h-3" /> Adicionar material
        </Button>
      </div>

      {/* Lista */}
      {materials.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/[0.06] rounded-lg">
          <File className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
          <p className="text-[12px] text-zinc-600">Nenhum material ainda.</p>
          <p className="text-[11px] text-zinc-700 mt-0.5">
            Adicione PDFs, imagens, links e documentos. O cliente verá no portal.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {materials.map(mat => (
            <div
              key={mat.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-white/[0.06] bg-white/[0.02] group"
            >
              {/* Ícone */}
              <div className="w-8 h-8 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <MaterialIcon type={mat.type} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-zinc-200 truncate">{mat.title}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {MATERIAL_TYPES.find(t => t.value === mat.type)?.label}
                  {mat.file_size ? ` · ${formatSize(mat.file_size)}` : ''}
                  {' · '}{formatDate(mat.created_at)}
                </p>
                {mat.description && (
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{mat.description}</p>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {(mat.file_url || mat.link_url) && (
                  <a
                    href={mat.link_url || mat.file_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => openEdit(mat)}
                  className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                {confirmingId === mat.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1"
                    >
                      Não
                    </button>
                    <button
                      onClick={() => handleDelete(mat)}
                      className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-1"
                    >
                      Sim
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingId(mat.id)}
                    className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-white/[0.06] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar / editar */}
      <Dialog open={modalOpen} onOpenChange={v => { setModalOpen(v); if (!v) resetForm() }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar material' : 'Adicionar material'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            <Input
              label="Título *"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Nome do material..."
            />

            <div>
              <label className="block text-[12px] text-zinc-500 mb-1.5">Tipo</label>
              <Select
                value={form.type}
                onValueChange={v => setForm(p => ({ ...p, type: v as MaterialType }))}
              >
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
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Breve descrição para o cliente..."
              rows={2}
            />

            <Input
              label="Pasta (opcional)"
              value={form.folder_name}
              onChange={e => setForm(p => ({ ...p, folder_name: e.target.value }))}
              placeholder="Ex: Campanha Abril, Stories..."
            />

            {/* Link ou arquivo */}
            {isLink ? (
              <Input
                label="URL *"
                value={form.link_url}
                onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))}
                placeholder="https://..."
              />
            ) : (
              <div>
                <label className="block text-[12px] text-zinc-500 mb-1.5">Arquivo</label>

                {selectedFile ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-md border border-white/[0.08] bg-white/[0.03]">
                    <File className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    <span className="text-[12px] text-zinc-300 truncate flex-1">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-zinc-500 hover:text-red-400 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : editing?.file_url ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-md border border-white/[0.08] bg-white/[0.03]">
                    <File className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    <span className="text-[12px] text-zinc-400 truncate flex-1">Arquivo atual</span>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex-shrink-0"
                    >
                      Substituir
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 w-full h-9 px-3 rounded-md border border-dashed border-white/[0.12] bg-white/[0.02] text-zinc-500 text-[12px] hover:border-white/[0.22] hover:bg-white/[0.04] transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Selecionar arquivo
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setModalOpen(false); resetForm() }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={
                uploading ||
                !form.title.trim() ||
                (isLink && !form.link_url.trim())
              }
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
    </div>
  )
}
