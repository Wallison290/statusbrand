-- ── Bucket de arquivos para tarefas ──────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-files', 'task-files', true, 52428800)  -- 50 MB limit
ON CONFLICT (id) DO NOTHING;

-- Qualquer um pode visualizar (portal do colaborador é público)
DROP POLICY IF EXISTS "task_files_public_read" ON storage.objects;
CREATE POLICY "task_files_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'task-files');

-- Usuários autenticados podem fazer upload
DROP POLICY IF EXISTS "task_files_auth_insert" ON storage.objects;
CREATE POLICY "task_files_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'task-files' AND auth.role() = 'authenticated');

-- Usuários autenticados podem deletar seus próprios arquivos
DROP POLICY IF EXISTS "task_files_auth_delete" ON storage.objects;
CREATE POLICY "task_files_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'task-files' AND auth.role() = 'authenticated');
