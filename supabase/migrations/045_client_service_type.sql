-- 045 — Tipo de serviço do cliente (pré-seleção de modelo de onboarding)
-- Valores usados pela aplicação: 'trafego' | 'social' | 'completo' | 'outro' | null
alter table public.clients add column if not exists service_type text;
