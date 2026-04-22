CREATE TABLE client_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric(10,2) NOT NULL,
  payment_date date NOT NULL,
  reference_month text NOT NULL,
  status text NOT NULL DEFAULT 'pago' CHECK (status IN ('pago', 'atrasado')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_all_payments" ON client_payments
  FOR ALL USING (auth.uid() = user_id);
