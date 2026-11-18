# Catalog 

A public catalog of beings, realms, species, and groups. Visitors can
search by name and filter by category or tag. Invited developers can
create and edit entries, upload images, and publish changes.

## Project status

Early design and development.

## Local development

Prerequisites:

- Node.js 20 or later
- Docker
- Supabase CLI
- VS Code

Open the `Catalog` folder in VS Code, then start the local database:

```powershell
cd Catalog
npx supabase start
npx supabase db reset
```

Local services:

- Web app: http://localhost:3000
- Supabase Studio: http://127.0.0.1:55433
- Supabase API: http://127.0.0.1:55431
- PostgreSQL: postgresql://postgres:postgres@127.0.0.1:55430/postgres

Start the frontend application:

```powershell
cd Catalog/frontend
npm install
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env.local` only when the app needs Supabase
credentials. Obtain the local publishable key with `npx supabase status`.
Never add secret or service-role keys to a Next.js browser environment.

In VS Code, run **Tasks: Run Task** and choose **Catalog: Run Locally**.
