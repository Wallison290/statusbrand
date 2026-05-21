/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // VITE_OPENAI_API_KEY removida — chave OpenAI usada somente via Supabase Secrets (Edge Functions)
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
