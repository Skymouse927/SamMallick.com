# Catalog Website

The website starts with a public catalog of beings, realms, species, and
groups. The structure is intended to leave room for future sections, including
games, without mixing their data into the catalog.

## Local development

Open the `Catalog` folder in VS Code. Start Docker Desktop, then run these
commands in the integrated terminal:

```powershell
npx supabase start
npx supabase db reset
```

Services:

- Frontend: http://localhost:3000
- Supabase Studio: http://127.0.0.1:55433
- Local email inbox (Mailpit): http://127.0.0.1:55434
- Supabase API: http://127.0.0.1:55431

In another integrated terminal, set up and run the frontend:

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env.local` to the
local publishable key shown by `npx supabase status`, then run:

```powershell
npm run dev
```

The VS Code task **Catalog: Run Locally** starts Supabase and the frontend.
For a clean local database, run **Catalog: Reset Supabase**.

## Developer accounts

Public sign-ups are disabled. Only an administrator with the local Supabase
service-role key can invite developers and grant the developer role. The key
is available from `npx supabase status`; never put it in frontend environment
variables, source control, or browser code.

In a Catalog terminal, set the service-role key for this PowerShell session,
then run the invite script from `frontend`:

```powershell
$env:SUPABASE_URL = "http://127.0.0.1:55431"
$env:SUPABASE_SERVICE_ROLE_KEY = "<SERVICE_ROLE_KEY from npx supabase status>"
$env:CATALOG_SITE_URL = "http://127.0.0.1:3000"
Set-Location frontend
npm run invite:developer -- first@example.com second@example.com
```

Local invitation messages are captured by Mailpit; they are not sent to
external email addresses. Open the inbox, follow each invitation, and choose a
password. Developers sign in at http://localhost:3000/login. Their role is
stored in administrator-managed Supabase `app_metadata`; self-service sign-up
and role changes are not available.

## Phase 2 verification

From the `Catalog` folder:

```powershell
npx supabase db reset
npx supabase test db
```

The database tests verify published/draft visibility, developer-only writes,
tags and relationships, and the multiple-realm rule. Run `npm run lint` and
`npm run build` from `frontend` to check the app.
