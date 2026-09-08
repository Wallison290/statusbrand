// ── Hook: estado da conexão do WhatsApp (UazAPI) ─────────────────────────────
// Lê a linha única de public.whatsapp_health, escrita a cada 5 min pela Edge
// Function whatsapp-health. A RLS já restringe a leitura a is_admin(), mas o
// `enabled` abaixo evita disparar uma query que voltaria vazia para todo mundo
// que não é admin.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface WhatsappHealth {
  status:          'connected' | 'disconnected' | 'unknown'
  detail:          string | null
  changed_at:      string | null
  last_ok_at:      string | null
  last_checked_at: string | null
}

export function useWhatsappHealth() {
  const { profile } = useAuth()
  const isAdmin = !!profile?.is_admin

  return useQuery<WhatsappHealth | null>({
    queryKey: ['whatsapp-health'],
    enabled: isAdmin,
    staleTime: 60_000,
    // O cron checa a cada 5 min; revalidar a cada 2 min mantém o banner
    // próximo do real sem pesar na navegação.
    refetchInterval: 120_000,
    queryFn: async () => {
      // whatsapp_health foi criada na migration 071 e não está no types.ts
      // gerado — mesmo cast usado nas RPCs admin_list_* em useAdmin.ts.
      const { data, error } = await (supabase as any)
        .from('whatsapp_health')
        .select('status, detail, changed_at, last_ok_at, last_checked_at')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      return (data as WhatsappHealth) ?? null
    },
  })
}
