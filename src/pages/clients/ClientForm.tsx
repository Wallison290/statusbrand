import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Save, ArrowLeft, ImageIcon, X } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateClient, useUpdateClient, useClient } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/integrations/supabase/client'
import type { Client } from '@/types'

const emptyForm = {
  company_name: '', responsible_name: '', niche: '', instagram: '', whatsapp: '',
  email: '', website: '', main_objective: '', target_audience: '', tone_of_voice: '',
  communication_style: '', differentials: '', services_offered: '', forbidden_words: '',
  observations: '', status: 'ativo' as Client['status'],
  entry_date: new Date().toISOString().split('T')[0],
  logo_url: null as string | null,
}

export function ClientForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { data: existingClient } = useClient(id || '')
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const [form, setForm] = useState(emptyForm)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (existingClient) setForm(existingClient as any)
  }, [existingClient])

  const set = (field: string, value: string | null) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setIsUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('client-logos')
        .upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('client-logos')
        .getPublicUrl(path)
      set('logo_url', publicUrl)
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setIsUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      if (isEdit) {
        await updateClient.mutateAsync({ id: id!, ...form })
        toast('Cliente atualizado!', 'success')
      } else {
        const created = await createClient.mutateAsync({ ...form, user_id: user.id })
        toast('Cliente cadastrado!', 'success')
        navigate(`/clients/${created.id}`)
        return
      }
      navigate(`/clients/${id}`)
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  return (
    <div>
      <Header
        title={isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        subtitle={isEdit ? existingClient?.company_name : 'Preencha os dados do cliente'}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        }
      />

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {/* Basic info */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Informações Básicas</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Logo upload — ocupa largura total */}
              <div className="col-span-full">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Logo do cliente</label>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="w-16 h-16 rounded-xl border border-white/10 flex-shrink-0 overflow-hidden bg-white/5 flex items-center justify-center">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-gray-600">
                        {form.company_name ? form.company_name[0].toUpperCase() : '?'}
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => logoRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="flex items-center gap-2 h-8 px-3 rounded-md border border-dashed border-white/15 bg-white/3 text-gray-400 text-xs hover:border-white/30 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      {isUploadingLogo ? 'Enviando...' : form.logo_url ? 'Trocar logo' : 'Selecionar logo'}
                    </button>
                    {form.logo_url && (
                      <button
                        type="button"
                        onClick={() => set('logo_url', null)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-md text-gray-500 hover:text-red-400 text-xs transition-colors"
                      >
                        <X className="w-3 h-3" /> Remover logo
                      </button>
                    )}
                  </div>

                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-1.5">PNG, JPG, WEBP, SVG · Máx. 5 MB</p>
              </div>

              <Input label="Nome da empresa *" value={form.company_name} onChange={e => set('company_name', e.target.value)} required placeholder="Ex: Studio Fitness" />
              <Input label="Responsável *" value={form.responsible_name} onChange={e => set('responsible_name', e.target.value)} required placeholder="Ex: João Silva" />
              <Input label="Nicho *" value={form.niche} onChange={e => set('niche', e.target.value)} required placeholder="Ex: Academia / Fitness" />
              <Input label="Instagram" value={form.instagram || ''} onChange={e => set('instagram', e.target.value)} placeholder="@perfil" />
              <Input label="WhatsApp" value={form.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} placeholder="(11) 99999-9999" />
              <Input label="Email" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com" />
              <Input label="Site" value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://empresa.com" />
              <Input label="Data de entrada" type="date" value={form.entry_date} onChange={e => set('entry_date', e.target.value)} />
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Strategy */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Estratégia e Posicionamento</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea label="Objetivo principal" value={form.main_objective || ''} onChange={e => set('main_objective', e.target.value)} placeholder="Ex: Aumentar vendas de planos mensais" />
              <Textarea label="Público-alvo" value={form.target_audience || ''} onChange={e => set('target_audience', e.target.value)} placeholder="Ex: Mulheres 25-40 anos, interessadas em saúde" />
              <Input label="Tom de voz" value={form.tone_of_voice || ''} onChange={e => set('tone_of_voice', e.target.value)} placeholder="Ex: Enérgico, motivacional, próximo" />
              <Input label="Estilo de comunicação" value={form.communication_style || ''} onChange={e => set('communication_style', e.target.value)} placeholder="Ex: Informal, com emojis, direto" />
              <Textarea label="Diferenciais" value={form.differentials || ''} onChange={e => set('differentials', e.target.value)} placeholder="Ex: Metodologia exclusiva, professores certificados" />
              <Textarea label="Serviços oferecidos" value={form.services_offered || ''} onChange={e => set('services_offered', e.target.value)} placeholder="Ex: Musculação, Personal, Nutrição" />
              <Textarea label="Palavras proibidas" value={form.forbidden_words || ''} onChange={e => set('forbidden_words', e.target.value)} placeholder="Ex: barato, comum, igual a todos" />
              <Textarea label="Observações" value={form.observations || ''} onChange={e => set('observations', e.target.value)} placeholder="Informações adicionais..." />
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Financeiro</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Valor mensal (R$)"
                type="number"
                step="0.01"
                min="0"
                value={(form as any).valor_mensal ?? ''}
                onChange={e => set('valor_mensal', e.target.value ? e.target.value : null)}
                placeholder="Ex: 1500.00"
              />
              <Input
                label="Dia de vencimento"
                type="number"
                min="1"
                max="31"
                value={(form as any).dia_vencimento ?? ''}
                onChange={e => set('dia_vencimento', e.target.value ? e.target.value : null)}
                placeholder="Ex: 10"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" variant="premium" disabled={createClient.isPending || updateClient.isPending || isUploadingLogo}>
              <Save className="w-4 h-4" /> {createClient.isPending || updateClient.isPending ? 'Salvando...' : 'Salvar cliente'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
