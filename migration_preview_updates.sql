-- Migracija: Omogućiti adminu ažuriranje tabela ptice_slike
-- Pokrenuti ovu migraciju na postojećim bazama podataka

-- Omogucava adminu da ažurira podatke o pticama i slikama
CREATE POLICY "Admin can update ptice_slike"
ON ptice_slike
FOR UPDATE
USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' = 'admin@example.com');

-- Omogucava adminu da dodaje nove ptice (opciono, ako zatreba)
CREATE POLICY "Admin can insert ptice_slike"
ON ptice_slike
FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' = 'admin@example.com');

-- Omogucava adminu da briše ptice
CREATE POLICY "Admin can delete ptice_slike"
ON ptice_slike
FOR DELETE
USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' = 'admin@example.com');

