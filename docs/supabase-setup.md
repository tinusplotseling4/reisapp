# Supabase setup

Deze app gebruikt Supabase straks voor login, rollen, dagboek, media, bezochte bezienswaardigheden en GPS-punten.

## 1. Project maken

1. Maak een Supabase-project aan.
2. Open `Project Settings` > `API`.
3. Kopieer alleen:
   - `Project URL`
   - `anon public key`

De `service_role` key blijft geheim en hoort niet in deze app of in GitHub.

## 2. Database schema plaatsen

1. Open in Supabase de SQL editor.
2. Plak de inhoud van `docs/supabase-schema.sql`.
3. Voer het script uit.

Het script maakt tabellen voor reizen, leden, rollen, dagboek, media, routevoortgang, bezochte punten en GPS.

## 3. Config lokaal maken

1. Kopieer `data/app-config.example.js` naar `data/app-config.js`.
2. Vul daarin je `supabaseUrl` en `supabaseAnonKey` in.

`data/app-config.js` staat in `.gitignore`, zodat je lokale projectgegevens niet per ongeluk mee naar GitHub gaan.

## 4. Eerste reis

De standaard trip-slug is:

```text
noorwegen-2026
```

Die reis wordt later gekoppeld aan de bestaande Noorwegen-route in `data/stages.js`.

## 5. Dagboekmedia opslaan

Voor centrale foto/audio-opslag:

1. Open de Supabase SQL editor.
2. Plak de inhoud van `docs/supabase-migration-diary-storage.sql`.
3. Voer het script uit.

Dit maakt de private buckets `diary-photos` en `diary-audio` en zet de juiste policies.

## 6. Testdata leegmaken

Wil je de gedeelde reisdata schoonmaken zonder leden, rollen en uitnodigingslinks te verwijderen?

1. Open de Supabase SQL editor.
2. Plak de inhoud van `docs/supabase-reset-trip-data.sql`.
3. Voer het script uit.

Dit wist centrale GPS-punten, bezochte bezienswaardigheden, etappevoortgang, dagboeknotities en dagboekmedia voor `noorwegen-2026`.

## 7. Volgende bouwstap

Na deze setup bouwen we in de app:

- login met e-mail en wachtwoord;
- huidig profiel ophalen;
- rollen uit `trip_members` lezen;
- beheer alleen tonen voor administrators;
- lokale data stap voor stap synchroniseren met Supabase.
