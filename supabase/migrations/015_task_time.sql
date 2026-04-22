-- Add optional time field to tasks (stored as HH:mm text)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS due_time text;
