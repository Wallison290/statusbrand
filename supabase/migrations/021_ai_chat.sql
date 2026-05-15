-- ── AI Chat: sessões e mensagens ────────────────────────────────────────────

-- Sessões de conversa (uma por thread de chat)
create table if not exists public.ai_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null default 'Nova conversa',
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- Mensagens dentro de cada sessão
create table if not exists public.ai_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.ai_sessions(id) on delete cascade not null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  web_search  boolean default false,
  created_at  timestamptz default now() not null
);

-- RLS
alter table public.ai_sessions enable row level security;
alter table public.ai_messages enable row level security;

create policy "Users manage own sessions"
  on public.ai_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own messages"
  on public.ai_messages for all
  using (
    session_id in (
      select id from public.ai_sessions where user_id = auth.uid()
    )
  )
  with check (
    session_id in (
      select id from public.ai_sessions where user_id = auth.uid()
    )
  );

-- Índices
create index if not exists ai_sessions_user_created_idx
  on public.ai_sessions(user_id, created_at desc);

create index if not exists ai_messages_session_created_idx
  on public.ai_messages(session_id, created_at asc);

-- Auto-update updated_at em ai_sessions
create or replace function public.touch_ai_session()
returns trigger language plpgsql as $$
begin
  update public.ai_sessions
  set updated_at = now()
  where id = NEW.session_id;
  return NEW;
end;
$$;

create trigger ai_messages_touch_session
  after insert on public.ai_messages
  for each row execute procedure public.touch_ai_session();
