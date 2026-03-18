# Festejos Aurora Ecommerce

Next.js + PostgreSQL + Drizzle base architecture for the Festejos Aurora rental ecommerce.

## Requirements

- Node.js 20+
- Docker (recommended for local PostgreSQL)

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Drizzle reads the datasource URL from `drizzle.config.ts` and `DATABASE_URL`.

## Local PostgreSQL with Docker

```bash
docker compose up -d
```

This starts PostgreSQL at `localhost:5432` with:
- user: `postgres`
- password: `postgres`
- database: `festejos_aurora`

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
