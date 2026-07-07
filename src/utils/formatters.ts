import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy", { locale: ptBR })
}

export function formatDatetime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: true })
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false
  return !isAfter(parseISO(date), new Date())
}

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes))
}

export const statusColors: Record<string, string> = {
  // Status legados (backward compat)
  active: 'text-green-400 bg-green-400/10 border-green-400/20',
  inactive: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  paused: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  // Novos status de cliente
  lead: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
  proposta: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  fechado: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  onboarding: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  ativo: 'text-green-400 bg-green-400/10 border-green-400/20',
  pausado: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  encerrado: 'text-red-400 bg-red-400/10 border-red-400/20',
  ideia: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  producao: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  revisao: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  aprovado: 'text-green-400 bg-green-400/10 border-green-400/20',
  publicado: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  gerado: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  editado: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  arquivado: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  a_fazer: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  em_andamento: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  concluido: 'text-green-400 bg-green-400/10 border-green-400/20',
  baixa: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  media: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  alta: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  urgente: 'text-red-400 bg-red-400/10 border-red-400/20',
}

// Variante de alto contraste para tema claro
export const statusColorsLight: Record<string, string> = {
  active:       'text-green-700 bg-green-100 border-green-300',
  inactive:     'text-gray-600 bg-gray-100 border-gray-300',
  paused:       'text-yellow-700 bg-yellow-100 border-yellow-300',
  lead:         'text-slate-700 bg-slate-100 border-slate-300',
  proposta:     'text-blue-700 bg-blue-100 border-blue-300',
  fechado:      'text-purple-700 bg-purple-100 border-purple-300',
  onboarding:   'text-amber-700 bg-amber-100 border-amber-300',
  ativo:        'text-green-700 bg-green-100 border-green-300',
  pausado:      'text-orange-700 bg-orange-100 border-orange-300',
  encerrado:    'text-red-700 bg-red-100 border-red-300',
  ideia:        'text-purple-700 bg-purple-100 border-purple-300',
  producao:     'text-blue-700 bg-blue-100 border-blue-300',
  revisao:      'text-yellow-700 bg-yellow-100 border-yellow-300',
  aprovado:     'text-green-700 bg-green-100 border-green-300',
  publicado:    'text-emerald-700 bg-emerald-100 border-emerald-300',
  gerado:       'text-blue-700 bg-blue-100 border-blue-300',
  editado:      'text-purple-700 bg-purple-100 border-purple-300',
  arquivado:    'text-gray-600 bg-gray-100 border-gray-300',
  a_fazer:      'text-gray-600 bg-gray-100 border-gray-300',
  em_andamento: 'text-blue-700 bg-blue-100 border-blue-300',
  concluido:    'text-green-700 bg-green-100 border-green-300',
  baixa:        'text-gray-600 bg-gray-100 border-gray-300',
  media:        'text-yellow-700 bg-yellow-100 border-yellow-300',
  alta:         'text-orange-700 bg-orange-100 border-orange-300',
  urgente:      'text-red-700 bg-red-100 border-red-300',
}

export const statusLabels: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  paused: 'Pausado',
  // Novos status de cliente
  lead: 'Lead',
  proposta: 'Proposta',
  fechado: 'Fechado',
  onboarding: 'Onboarding',
  ativo: 'Ativo',
  pausado: 'Pausado',
  encerrado: 'Encerrado',
  ideia: 'Ideia',
  producao: 'Produção',
  revisao: 'Revisão',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
  gerado: 'Gerado',
  editado: 'Editado',
  arquivado: 'Arquivado',
  a_fazer: 'A Fazer',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const contentTypeLabels: Record<string, string> = {
  post: 'Post',
  carrossel: 'Carrossel',
  reels: 'Reels',
  story: 'Story',
  educativo: 'Educativo',
  venda: 'Venda',
  autoridade: 'Autoridade',
  engajamento: 'Engajamento',
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
