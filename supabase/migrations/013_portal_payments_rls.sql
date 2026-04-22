-- Allow portal clients to read their own payment history
CREATE POLICY "portal_read_payments" ON client_payments
  FOR SELECT USING (
    client_id IN (
      SELECT linked_client_id
      FROM profiles
      WHERE id = auth.uid()
        AND role = 'client'
        AND linked_client_id IS NOT NULL
    )
  );
