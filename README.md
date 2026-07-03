# Project Invest AI

Webapp voor Belgische vastgoedinvesteerders die per pand een analyse willen opbouwen via een chat-ervaring, met deterministische rekencore en later vision + tool-calling.

## Wat er nu staat

- Next.js App Router + TypeScript + Tailwind
- lokale chat-centrische MVP zonder login
- module 1 van de calc-engine:
  - registratiebelasting
  - aankoopakte/notariskosten
- unit tests voor de eerste fiscale en notariële berekeningen
- Supabase SQL-migratie met RLS-basis voor gesprekken, snapshots, berichten en uploads

## Scripts

```bash
npm run dev
npm run lint
npm run test
npm run typecheck
```

## Lokaal starten

1. Installeer dependencies
2. Maak `.env.local` aan op basis van [`.env.example`](./.env.example)
3. Start de app:

```bash
npm run dev
```

## Database

De initiële Supabase-setup staat hier:

- [docs/supabase-setup.md](./docs/supabase-setup.md)
- [supabase/migrations/202606210001_initial_schema.sql](./supabase/migrations/202606210001_initial_schema.sql)

## Calc-engine

De eerste module leeft in:

- [src/lib/calc-engine/module-1.ts](./src/lib/calc-engine/module-1.ts)
- [src/lib/calc-engine/module-1.test.ts](./src/lib/calc-engine/module-1.test.ts)

Belangrijk:

- de LLM rekent niets zelf uit
- ontbrekende gegevens leveren een gedeeltelijk resultaat op, geen gokwerk
- voor verouderde Vlaamse gunstregimes (`IER`, `beschermd monument`) wordt expliciet op datum gestuurd

## Volgende logische stappen

1. Claude vision-extractie voor foto’s en screenshots koppelen aan hetzelfde input-schema
2. server-side snapshots bewaren in Supabase
3. tool-calling chatroute toevoegen voor herberekeningen binnen hetzelfde gesprek
4. modules 2 t.e.m. 6 toevoegen
