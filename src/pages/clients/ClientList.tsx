import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Users, Instagram, Mail, Globe, Trash2, ExternalLink } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useClients, useDeleteClient } from '@/hooks/useClients'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/utils/formatters'

export function ClientList() {
  const { data: clients, isLoading } = useClients()
  const deleteClient = useDeleteClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'ativo' | 'encerrado' | 'pausado'>('all')

  const filtered = (clients || []).filter(c => {
    const matchSearch = c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.responsible_name.toLowerCase().includes(search.toLowerCase()) ||
      c.niche.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.status === filter
    return matchSearch && matchFilter
  })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return
    await deleteClient.mutateAsync(id)
    toast('Cliente excluído.', 'success')
  }

  return (
    <div>
      <Header
        title="Clientes"
        subtitle={`${clients?.length || 0} clientes cadastrados`}
        action={
          <Button asChild size="sm" variant="premium">
            <Link to="/clients/new"><Plus className="w-4 h-4" /> Novo cliente</Link>
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Buscar por empresa, responsável ou nicho..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            className="max-w-sm"
          />
          <div className="flex gap-2">
            {(['all', 'ativo', 'pausado', 'encerrado'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/8'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'ativo' ? 'Ativos' : f === 'pausado' ? 'Pausados' : 'Encerrados'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {search ? 'Tente outra busca' : 'Cadastre seu primeiro cliente agora'}
            </p>
            {!search && (
              <Button asChild size="sm" variant="premium" className="mt-4">
                <Link to="/clients/new"><Plus className="w-4 h-4" /> Novo cliente</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((client, i) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -2 }}
                >
                  <Card className="group overflow-hidden rounded-2xl border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    {/* Topo colorido com avatar centralizado */}
                    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 px-6 pt-6 pb-10 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {client.logo_url ? (
                          <img
                            src={client.logo_url}
                            alt={client.company_name}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-white border-2 border-white shadow-sm flex items-center justify-center text-gray-700 font-bold text-xl flex-shrink-0">
                            {client.company_name[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-[15px] leading-tight truncate max-w-[160px]">{client.company_name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[160px] mt-0.5">{client.responsible_name}</p>
                        </div>
                      </div>
                      <Badge status={client.status} />
                    </div>

                    {/* Corpo do card, sobrepõe o topo */}
                    <CardContent className="px-6 pt-0 pb-6 -mt-5">
                      {/* Pill de nicho */}
                      <div className="mb-5">
                        <span className="inline-block text-xs text-gray-600 bg-white border border-gray-200 shadow-sm px-3 py-1 rounded-full truncate max-w-full">
                          {client.niche}
                        </span>
                      </div>

                      {/* Contatos */}
                      {(client.instagram || client.email || client.website) ? (
                        <div className="space-y-2.5 mb-5">
                          {client.instagram && (
                            <div className="flex items-center gap-2.5 text-xs text-gray-600 min-w-0">
                              <Instagram className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                              <span className="truncate">@{client.instagram.replace('@', '')}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-2.5 text-xs text-gray-600 min-w-0">
                              <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                          {client.website && (
                            <div className="flex items-center gap-2.5 text-xs text-gray-600 min-w-0">
                              <Globe className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span className="truncate">{client.website}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-5" />
                      )}

                      {/* Rodapé */}
                      <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-3">
                        <p className="text-[11px] text-gray-400 truncate">desde {formatDate(client.entry_date)}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button asChild size="sm" variant="secondary">
                            <Link to={`/clients/${client.id}`}>
                              <ExternalLink className="w-3 h-3" /> Ver perfil
                            </Link>
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            onClick={() => handleDelete(client.id, client.company_name)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
