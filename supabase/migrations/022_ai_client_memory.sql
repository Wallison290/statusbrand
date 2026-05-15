-- ── AI Client Memory: fatos aprendidos sobre cada cliente ───────────────────

create table if not exists public.ai_client_memory (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  key         text not null,   -- ex: 'tom_de_voz', 'decisao_conteudo', 'preferencia'
  value       text not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  unique (client_id, user_id, key)
);

alter table public.ai_client_memory enable row level security;

create policy "Users manage own client memories"
  on public.ai_client_memory for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists ai_client_memory_client_idx
  on public.ai_client_memory(client_id, user_id);
