# Payroll

Private, multi-company payroll system for the British Virgin Islands. Built to run on free tiers
(Netlify + Neon Postgres + GitHub Actions). See [docs/PLAN.md](docs/PLAN.md) for the full plan.

**Status:** Phase 1 complete – sign-in with mandatory two-factor authentication, companies,
company switcher, per-company roles, user management and an append-only audit log.

## Stack

- Next.js 16 (React, TypeScript, Tailwind) – responsive web app, works on phone/tablet/desktop
- PostgreSQL via Drizzle ORM (Neon free tier in production)
- Better Auth – email/password, TOTP two-factor, database-backed login rate limiting
- Vitest – unit tests and database tests

## Run locally

Requires Node 22 and a Postgres database.

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL and BETTER_AUTH_SECRET
npm run db:migrate            # create tables
npm run create-admin -- "Your Name" you@example.com   # prints a temporary password
npm run dev                   # http://localhost:3000
```

Sign in with the temporary password. You'll be asked to choose a new password and set up an
authenticator app, then to create your first company.

## Checks

```bash
npm run lint
npm run typecheck
npm test                                   # unit tests
TEST_DATABASE_URL=postgresql://… npm test  # also runs database tests (wipes that database!)
```

## Deploy (free)

1. **Database – Neon:** create a free project at neon.tech (pick a US East region). Copy two
   connection strings: the *pooled* one (for the app) and the *direct* one (for backups).
2. **App – Netlify:** "Add new site → Import from Git", choose this repository. Set environment
   variables:
   - `DATABASE_URL` – Neon pooled connection string
   - `BETTER_AUTH_SECRET` – output of `openssl rand -base64 32`
   - `BETTER_AUTH_URL` – the site URL, e.g. `https://your-site.netlify.app`

   Each deploy runs database migrations, then builds (see `netlify.toml`).
3. **First administrator:** run `npm run create-admin` once from your computer with
   `DATABASE_URL` pointing at Neon.
4. **Backups – GitHub Actions:** add repository secrets `BACKUP_DATABASE_URL` (Neon direct
   connection string) and `BACKUP_PASSPHRASE` (store it in your password manager too). The
   `Database backup` workflow runs nightly and keeps encrypted dumps for 90 days. Run it once
   manually from the Actions tab to confirm it works.

   Restore: `gpg --decrypt payroll-….sql.gz.gpg | gunzip | psql "$TARGET_DATABASE_URL"`

Keep this repository **private**.

## Project layout

```
src/app/(auth)/        sign-in and two-factor verification
src/app/(app)/         signed-in pages (dashboard, settings, users, audit, companies)
src/app/account/setup  first sign-in: new password + authenticator setup
src/db/schema/         database tables
src/lib/auth.ts        authentication configuration
src/lib/session.ts     requireUser / requireCompany guards used by every page and action
src/lib/tenancy.ts     company isolation helpers
src/lib/permissions.ts roles and permissions
src/lib/audit.ts       audit log writer
drizzle/               SQL migrations
```

## Security model

- No public sign-up: only an administrator creates accounts. Two-factor authentication is
  required before anything else can be used.
- Every page and server action re-checks the signed-in user, their company membership and
  their role. The active company comes from a cookie, but it's only honored when the user
  belongs to that company.
- Sign-in attempts are rate-limited (10 per 5 minutes per IP address).
- The audit log is append-only, enforced by the database (updates, deletes and truncation
  are rejected).
- Companies are deactivated, never deleted, so payroll history is always retained.
