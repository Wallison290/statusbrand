-- Adiciona suporte a perguntas personalizadas no formulário semanal
ALTER TABLE weekly_form_configs
ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT NULL;

COMMENT ON COLUMN weekly_form_configs.custom_questions IS
  'Array de QuestionConfig: { key, enabled, emoji, title, question, placeholder }. NULL = usa perguntas padrão do sistema.';
