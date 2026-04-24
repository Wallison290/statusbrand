-- Adiciona campo de hora opcional ao planejamento (HH:mm como texto)
-- Seguro para re-executar: IF NOT EXISTS garante idempotência
ALTER TABLE planner
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
