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

## 5. Volgende bouwstap

Na deze setup bouwen we in de app:

- login met e-mail en wachtwoord;
- huidig profiel ophalen;
- rollen uit `trip_members` lezen;
- beheer alleen tonen voor administrators;
- lokale data stap voor stap synchroniseren met Supabase.

