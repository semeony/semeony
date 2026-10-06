# Daywell

Daywell is a responsive, accessible daily planner built with React, TypeScript, Vite, and Supabase. Add your energy, working hours, priorities, and fixed plans to build a schedule. Guest plans stay in the current browser. Signed-in plans sync to the user's Supabase account.

## Run locally

```sh
npm install
npm run dev
```

Build and preview the production site:

```sh
npm run build
npm run preview
```

## GitHub Pages deployment

The workflow in `.github/workflows/deploy.yml` builds and deploys the site when changes are pushed to `main` (or when run manually). In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source. The site is published at `https://semeony.github.io/semeony/`.

## Connect Supabase

1. Create a Supabase project and confirm email authentication is enabled under **Authentication → Providers → Email**.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261006133000_create_daily_plans.sql`](./supabase/migrations/20261006133000_create_daily_plans.sql). It creates the daily plan table, enables row-level security, and only allows an authenticated user to read or change rows with their own user ID.
3. In **Authentication → URL Configuration**, set the site URL to `https://semeony.github.io/semeony/` and add that exact address to the allowed redirect URLs. This is used for email confirmation and password recovery.
4. Copy `.env.example` to `.env` for local development and fill in the project's **Project URL** and **publishable/anon key** from Supabase project settings. Use the legacy `anon` key if the dashboard does not show a publishable key. Then run `npm run dev`.
5. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Run the Pages workflow again, or push a new commit.

The Supabase URL and publishable/anon key are public client settings and are included in the static site build. Never use or publish the Supabase `service_role` key in this app. Keep row-level security enabled; the client relies on the supplied migration to keep account data isolated. Supabase handles password verification, account sessions, email confirmation, and password recovery. The app stores account schedules in Supabase and keeps guest schedules in the browser's local storage. The migration can be safely run again to restore its policies and trigger.
