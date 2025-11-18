-- Migracija: Dodavanje polja roles u tabelu allowed_users
-- Pokrenuti ovu migraciju na postojećim bazama podataka

-- Dodaj polje roles ako ne postoji
ALTER TABLE allowed_users 
ADD COLUMN IF NOT EXISTS roles TEXT DEFAULT 'user';

-- Ažuriraj postojeće korisnike da imaju 'user' ulogu (ako je NULL)
UPDATE allowed_users 
SET roles = 'user' 
WHERE roles IS NULL;

-- Postavi admin@example.com kao admin (ako postoji)
UPDATE allowed_users 
SET roles = 'admin' 
WHERE email = 'iantonijevic@gmail.com';

-- Omogucava samo adminu da ažurira korisnike (za promenu uloga)
CREATE POLICY IF NOT EXISTS "Admin can update allowed users"
ON allowed_users
FOR UPDATE
USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' = 'admin@example.com');

