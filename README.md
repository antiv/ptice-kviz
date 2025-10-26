# Kviz o Pticama - Aplikacija za Prepoznavanje Ptica po Zvuku

Ovo je veb aplikacija napravljena u React-u koja omogućava korisnicima da testiraju svoje znanje u prepoznavanju ptica na osnovu njihovih zvukova.

## Tehnologije

*   **Frontend:** React (sa TypeScript-om)
*   **Backend & Baza:** Supabase (PostgreSQL, Storage, Auth)
*   **Stilovi:** React-Bootstrap & Bootstrap

## Podešavanje projekta

Da biste pokrenuli ovu aplikaciju lokalno, pratite sledeće korake.

### 1. Klonirajte repozitorijum

```bash
git clone <URL_REPOZITORIJUMA>
cd ptice-kviz
```

### 2. Instalirajte zavisnosti

```bash
npm install
```

### 3. Podesite Supabase

Potrebno je da imate Supabase nalog i kreiran projekat.

**a. Kreiranje tabela:**

*   U vašem Supabase projektu, idite na **SQL Editor**.
*   Kopirajte ceo sadržaj fajla `supabase.sql` koji se nalazi u root direktorijumu projekta.
*   Nalepite SQL kod u editor i kliknite **RUN**.

**b. Podešavanje Skladišta (Storage):**

*   Idite na **Storage** u vašem Supabase projektu.
*   Kreirajte novi "bucket". Preporučujemo da ga nazovete `zvuk`.
*   U ovaj bucket, postavite vaše audio fajlove (`.mp3`). **Naziv svakog fajla mora tačno odgovarati unosu u koloni `naziv_latinskom`** u vašoj `ptice` tabeli (npr. `Parus major.mp3`).

**c. Popunjavanje podataka o pticama:**

*   Idite na **Table Editor** i izaberite tabelu `ptice`.
*   Dodajte redove za svaku pticu, popunjavajući `naziv_srpskom`, `naziv_latinskom` i `grupa`.

**d. Konfiguracija okruženja:**

*   Pronađite vaše API ključeve u **Project Settings > API**.
*   U root direktorijumu projekta, kreirajte fajl `.env`.
*   Kopirajte sadržaj iz `.env.example` i zamenite vrednosti sa vašim Supabase URL-om i `anon` ključem:

    ```
    REACT_APP_SUPABASE_URL=VAŠ_SUPABASE_URL
    REACT_APP_SUPABASE_ANON_KEY=VAŠ_SUPABASE_ANON_KLJUČ
    ```

### 4. Pokrenite aplikaciju

Kada ste završili sa podešavanjem, pokrenite razvojni server:

```bash
npm start
```

Aplikacija bi trebalo da bude dostupna na [http://localhost:3000](http://localhost:3000).
