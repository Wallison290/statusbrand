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

      <div className="p-6 space-y-4">
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
                  <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
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
                  <Card className="group">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {client.logo_url ? (
                            <img
                              src={client.logo_url}
                              alt={client.company_name}
                              className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {client.company_name[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-sm leading-tight truncate">{client.company_name}</p>
                            <p className="text-xs text-gray-500 truncate">{client.responsible_name}</p>
                          </div>
                        </div>
                        <Badge status={client.status} />
                      </div>

                      <div className="mb-3">
                        <span className="text-xs text-gray-500 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                          {client.niche}
                        </span>
                      </div>

                      <div className="space-y-1.5 mb-4">
                        {client.instagram && (
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Instagram className="w-3 h-3" /> @{client.instagram.replace('@', '')}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Mail className="w-3 h-3" /> {client.email}
                          </div>
                        )}
                        {client.website && (
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Globe className="w-3 h-3" /> {client.website}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="secondary" className="flex-1">
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

                      <p className="text-xs text-gray-600 mt-2">Desde {formatDate(client.entry_date)}</p>
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
