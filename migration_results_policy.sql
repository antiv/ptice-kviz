-- Migracija: Omogućiti adminu čitanje svih rezultata kviza
-- Pokrenuti ovu migraciju na postojećim bazama podataka

-- Omogucava adminu da čita sve rezultate
CREATE POLICY "Admin can view all quiz results"
ON rezultati_kviza
FOR SELECT
USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' = 'admin@example.com');

-- Omogucava korisnicima da vide svoje rezultate (za istoriju)
CREATE POLICY "Users can view own quiz results"
ON rezultati_kviza
FOR SELECT
USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' = user_email);

