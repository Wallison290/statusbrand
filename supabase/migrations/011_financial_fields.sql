-- Add financial fields to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS valor_mensal numeric(10,2),
  ADD COLUMN IF NOT EXISTS dia_vencimento int CHECK (dia_vencimento BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS financial_status text CHECK (financial_status IN ('ativo', 'vence_em_breve', 'atrasado', 'cancelado')) DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS last_payment_date date,
  ADD COLUMN IF NOT EXISTS manual_status_override boolean DEFAULT false;
