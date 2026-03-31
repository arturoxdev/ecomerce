# Ecommerce Platform

Next.js + PostgreSQL + Drizzle base architecture for a reusable rental ecommerce.

## Requirements

- Node.js 20+
- Docker (recommended for local PostgreSQL)

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Drizzle reads the datasource URL from `drizzle.config.ts` and `DATABASE_URL`.

### Branding Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SITE_NAME` | Brand name shown in header, metadata, footer | `My Store` |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Site description for SEO metadata | `""` |
| `NEXT_PUBLIC_LOGO_URL` | Logo image URL (falls back to icon if empty) | `""` |
| `NEXT_PUBLIC_ADMIN_TITLE` | Admin panel title | `Admin` |
| `ADMIN_EMAIL` | Default admin email (used in seed) | `admin@example.com` |
| `SUPPORT_EMAIL` | Support contact email | `support@example.com` |

## Local PostgreSQL with Docker

```bash
docker compose up -d
```

This starts PostgreSQL at `localhost:5432` with:
- user: `postgres`
- password: `postgres`
- database: `ecommerce`

## Database Commands

Generate a new Drizzle migration from schema changes:

```bash
npm run db:generate
```

Apply pending migrations:

```bash
npm run db:migrate
```

If the database already existed before Drizzle tracking was added, this command bootstraps the `drizzle.__drizzle_migrations` table from the detected schema and then runs the pending migrations.

Run seed data:

```bash
npm run db:seed
```

Open Drizzle Studio:

```bash
npm run db:studio
```

## Start App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build Check

```bash
npm run build
```

## VPS/Hostinger Notes

- Keep `DATABASE_URL` pointed to managed/self-hosted PostgreSQL.
- Run migrations during deploy (`npm run db:migrate`).
- Reuse the same Drizzle schema and migration history for all environments.
