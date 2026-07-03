# FD Vault

FD Vault is a modern full-stack app for managing family fixed deposits in one place. It replaces manual tracking with a secure dashboard for creating deposits, monitoring maturity dates, renewing or withdrawing funds, and importing records in bulk from Excel or CSV files.

## What the app includes

- Secure authentication with NextAuth credentials login
- Family-based workspace model with admin and viewer roles
- Interactive dashboard with portfolio KPIs, maturity alerts, charts, and recent activity
- FD list view with search, filtering, sorting, and date-range controls
- Detailed FD pages with status, transaction history, and renewal lineage
- Admin actions for creating, editing, deleting, renewing, and withdrawing FDs
- Bulk import workflow for spreadsheets with validation and duplicate detection
- Account settings page for updating profile and password information

## Current stack

- Frontend: Next.js 15, React, TypeScript, Tailwind CSS
- UI libraries: Recharts, Framer Motion, Lucide React
- Backend: Next.js route handlers, Auth.js / NextAuth
- Database: PostgreSQL with Prisma ORM
- File import: SheetJS (XLSX)
- Validation: Zod

## Prerequisites

- Node.js 20+
- PostgreSQL database (local or hosted)

## Local setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Create environment variables
   ```bash
   cp .env.example .env
   ```
   Update the values in .env for your database and auth setup.

3. Create the database schema
   ```bash
   npx prisma migrate dev --name init
   ```

4. Seed demo data and default users
   ```bash
   npx prisma db seed
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

Open http://localhost:3000 to view the app.

## Environment variables

The app expects these variables in your environment:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fd_vault?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/fd_vault?schema=public"
NEXTAUTH_SECRET="replace-with-a-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

For Neon or other hosted PostgreSQL providers, use the appropriate connection strings instead.

## Seeded demo accounts

The seed script creates a family workspace with the following accounts:

- Admin: admin@family.com / admin123
- Viewer: viewer@family.com / viewer123

## Bulk import format

Admins can import FDs from Excel or CSV files through the import screen. The import flow supports:

- automatic column mapping
- validation of required fields
- duplicate detection against existing records
- batch insertion into the database

The import page also lets you download a sample template directly from the UI.

## Useful commands

- Start dev server
  ```bash
  npm run dev
  ```

- Build for production
  ```bash
  npm run build
  ```

- Open Prisma Studio
  ```bash
  npx prisma studio
  ```

- Reset and re-seed the database
  ```bash
  npx prisma migrate reset
  ```

## Deployment notes

The project is configured for Vercel deployment. In Vercel, add the same environment variables listed above, make sure your PostgreSQL database is reachable from the app runtime, and deploy the repository normally.

Vercel will run the build script defined in package.json, which includes Prisma generation and database migrations.
