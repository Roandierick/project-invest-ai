# Supabase setup

Deze iteratie zet de database- en authfundamenten klaar voor:

- `profiles`
- `conversations`
- `analysis_snapshots`
- `messages`
- `uploads`
- `listing-uploads` storage bucket
- transactionele snapshot-opslag via `append_analysis_snapshot(...)`

## 1. Project aanmaken

1. Maak een nieuw Supabase-project aan.
2. Noteer:
   - `Project URL`
   - `anon public key`
   - `service_role key`
3. Vul die later in in `.env.local` op basis van [`.env.example`](../.env.example).

## 2. Auth instellen

In `Authentication > Providers > Email`:

- zet `Enable Email Provider` aan
- laat `Confirm email` aan staan
- gebruik e-mail/wachtwoord als standaardmethode

In `Authentication > URL Configuration`:

- `Site URL`: je Vercel- of lokale URL
- voeg `http://localhost:3000` toe aan de redirect URLs voor lokaal testen

## 3. SQL-migraties uitvoeren

Voer beide migraties uit:

- [`supabase/migrations/202606210001_initial_schema.sql`](../supabase/migrations/202606210001_initial_schema.sql)
- [`supabase/migrations/202606210002_snapshot_helpers_and_storage.sql`](../supabase/migrations/202606210002_snapshot_helpers_and_storage.sql)

Samen doen die migraties het volgende:

- maken `profiles` aan met automatische sync vanuit `auth.users`
- maken de analysetabellen aan
- voegen `updated_at`-triggers toe
- activeren Row Level Security
- voegen ownership policies toe zodat elke gebruiker alleen zijn eigen gesprekken en afgeleide records ziet
- maken bucket `listing-uploads` aan
- voegen storage-policies toe op basis van `is_snapshot_owner(...)`
- voegen de RPC `append_analysis_snapshot(...)` toe zodat snapshot, berichten en `updated_at` atomair samen worden weggeschreven

## 4. Storage

De bucket wordt nu door migratie `202606210002_snapshot_helpers_and_storage.sql` zelf aangemaakt:

- `listing-uploads`

De storage-policies verwachten dat objectpaden beginnen met de snapshot-id als eerste padsegment. Daardoor kan ownership rechtstreeks afgeleid worden uit `is_snapshot_owner(...)`.

## 5. Lokale env vars

Maak `.env.local` aan:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

## 6. Wat nog bewust niet in deze iteratie zit

- wachtwoord-reset
- social login
- opslag van listing-foto's in Supabase Storage vanuit de UI
- Claude tool-calling binnen de chat zelf
