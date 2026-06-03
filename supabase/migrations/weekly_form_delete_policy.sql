-- Permite que o dono do formulário (agência) apague respostas dos seus clientes
CREATE POLICY "owner_delete_responses" ON weekly_form_responses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM weekly_form_configs wfc
      WHERE wfc.id = weekly_form_responses.config_id
        AND wfc.user_id = auth.uid()
    )
  );
