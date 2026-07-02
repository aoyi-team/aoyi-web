# Aoyi Web

Next.js login and registration UI backed by Supabase Auth.

## Local Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000/login.

Create `.env` from `.env.example` and fill in the Supabase values before running auth flows.

## Vercel

This project includes `vercel.json` for Vercel's Next.js framework preset.

Set these environment variables in Vercel Project Settings:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_JWKS_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Use the same project URL and publishable key for the matching `NEXT_PUBLIC_` values. Keep `SUPABASE_SECRET_KEY` server-only.

Build command:

```bash
pnpm run build
```

Install command:

```bash
pnpm install --frozen-lockfile
```
