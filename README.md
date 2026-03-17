# PathLegends

A full-stack Pathfinder 1e character sheet manager with a local reference archive for spells and feats.

**Stack:** React · TypeScript · Vite · TailwindCSS · Zustand · Express · Prisma · MySQL · Docker · Capacitor (Android)

**Current version:** `0.1.0`
The canonical project version is stored in the root [`VERSION`](./VERSION) file.

**Disclaimer:** This is an unofficial fan-made Pathfinder 1e project. It is not affiliated with or endorsed by Paizo Publishing, LLC.
**Attribution:** Parts of the local reference archive were imported from `d20pfsrd.com` and other Open Game Content sources. See [`LEGAL.md`](./LEGAL.md) and [`OGL-1.0a.txt`](./OGL-1.0a.txt).

---

## Table of contents

1. [Requirements](#requirements)
2. [Versioning](#versioning)
3. [Project structure](#project-structure)
4. [Run with Docker Compose](#run-with-docker-compose)
5. [Run without Docker (local MySQL)](#run-without-docker-local-mysql)
6. [Prisma migrations](#prisma-migrations)
7. [Seed demo character](#seed-demo-character)
8. [Import reference data](#import-reference-data)
9. [Verify in Adminer](#verify-in-adminer)
10. [Test character CRUD](#test-character-crud)
11. [Test reference spell/feat search](#test-reference-spellsfeat-search)
12. [All available scripts](#all-available-scripts)
13. [Full API reference](#full-api-reference)
14. [Architecture notes](#architecture-notes)

---

## Requirements

| Tool      | Minimum | Purpose |
|-----------|---------|---------|
| Docker    | 24+     | Full local stack |
| Docker Compose | v2+ | Full local stack |
| Node.js   | 20+ | Without Docker / Android build |
| npm       | 9+  | Without Docker / Android build |
| Android Studio | Latest | Android development |
| JDK       | 17+     | Android build (bundled with Android Studio) |

---

## Versioning

- The repository-wide application version is tracked in the root [`VERSION`](./VERSION) file.
- Current version: `0.1.0`
- The frontend and backend package manifests may have their own npm package versions, but the root `VERSION` file is the release/version reference for the software as a whole.
- When bumping the app version, update `VERSION` first and then update any package metadata that should stay aligned.

---

## Project structure

The root `VERSION` file is the canonical source for the software version.

```
Pathfinder-app/
├── docker-compose.yml
├── .env.example               ← copy to .env before first run
├── frontend/                  ← React + Vite + TailwindCSS + Zustand
│   └── Dockerfile.dev
└── backend/                   ← Express + Prisma + MySQL
    ├── Dockerfile.dev
    ├── prisma/schema.prisma
    ├── src/
    │   ├── server.ts
    │   ├── modules/
    │   │   ├── characters/    ← CRUD + spell/feat attachment endpoints
    │   │   └── reference/     ← /api/reference/spells and /feats
    │   └── common/
    └── scripts/               ← offline PF1e importers
        ├── import-spells-pf1e.ts
        └── import-feats-pf1e.ts
```

---

## Run with Docker Compose

### 1 — Copy and configure environment

```bash
cp .env.example .env
# Edit .env only if you want custom MySQL credentials (defaults work as-is)
```

### 2 — Build and start all services

```bash
docker compose up --build
```

This starts four services:

| Service  | URL                        | Purpose              |
|----------|----------------------------|----------------------|
| frontend | http://localhost:5173       | React app            |
| backend  | http://localhost:3000       | Express API          |
| db       | localhost:3307              | MySQL 8.0            |
| adminer  | http://localhost:8080       | DB browser UI        |

Wait until you see:
```
backend  | [server] running on http://localhost:3000
```

### 3 — Apply schema (first time only)

In a **second terminal**:

```bash
docker compose exec backend npm run db:push
```

`db:push` (`prisma db push`) syncs the schema directly to the database without needing a shadow DB — no extra privileges required for the `pathfinder` user. This creates all tables: `Character`, `ReferenceSpell`, `CharacterSpell`, `ReferenceFeat`, `CharacterFeat`.

### 4 — Seed demo character

```bash
docker compose exec backend npm run db:seed
```

Creates **Valeron** — Human Fighter 3 with full stat block, feats, inventory, and spells pre-filled.

---

## Run without Docker (local MySQL)

Requires a MySQL 8.0 server running on `localhost:3306` with a `pathfinder` database and user.

```bash
# Backend
cd backend
npm install
# .env is already set to mysql://pathfinder:pathfinder@localhost:3306/pathfinder
npx prisma migrate dev --name init
npm run db:seed
npm run dev          # → http://localhost:3000

# Frontend (second terminal)
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

---

## Schema management

### Local Docker dev — use `db:push`

```bash
# First time or after any schema.prisma change:
docker compose exec backend npm run db:push
```

`prisma db push` diffs the schema against the live DB and applies changes directly.
It does **not** need a shadow database, so the limited `pathfinder` MySQL user works fine.

### When you need a migration history (staging / production)

`prisma migrate dev` requires `CREATE DATABASE` privileges for its shadow DB.
For those environments grant the user that privilege, or supply a separate `SHADOW_DATABASE_URL`:

```bash
# With a privileged root user for migration only:
DATABASE_URL="mysql://root:root@db:3306/pathfinder" \
  docker compose exec -e DATABASE_URL backend npx prisma migrate dev --name <description>
```

### After a schema.prisma change — rebuild the backend image

```bash
docker compose build backend
docker compose up -d backend
docker compose exec backend npm run db:push
```

---

## Seed demo character

```bash
# Via Docker
docker compose exec backend npm run db:seed

# Locally
cd backend && npm run db:seed
```

The seed is **idempotent** — re-running it upserts Valeron by a fixed UUID; it never creates duplicates.

---

## Import reference data

Import runs **offline** (you run it once to populate the DB from d20pfsrd.com).
The app UI reads only from the local DB — no live scraping.

### Import feats (~1 HTTP request, ~900 feats)

```bash
# Via Docker
docker compose exec backend npm run import:feats

# Locally
cd backend && npm run import:feats
```

### Import spells (~1 000 HTTP requests at 600 ms each, allow ~15 min)

```bash
# Dry run first — parses without writing to DB
docker compose exec backend npm run import:spells -- --dry-run

# Single letter — good for testing
docker compose exec backend npm run import:spells -- --letter f --limit 10

# Full import
docker compose exec backend npm run import:spells
```

Both importers are **idempotent** — re-running upserts by `sourceUrl`.

### Import summary output

```
─────────────────────────────────────────
  Pathfinder 1e — Feat Importer
  Dry run: false
─────────────────────────────────────────
Parsed 892 feats from source page.
[1/892] Power Attack ← Combat
...
  Imported : 892   Updated : 0   Skipped : 0   Failed : 0
```

---

## Verify in Adminer

1. Open http://localhost:8080
2. Fill in:
   - **System:** MySQL
   - **Server:** `db`
   - **Username:** `pathfinder`
   - **Password:** `pathfinder`
   - **Database:** `pathfinder`
3. Click **Login**

Useful queries:
```sql
SELECT COUNT(*) FROM `Character`;
SELECT COUNT(*) FROM `ReferenceSpell`;
SELECT COUNT(*) FROM `ReferenceFeat`;
SELECT id, JSON_EXTRACT(data, '$.name') AS name FROM `Character`;
```

---

## Test character CRUD

```bash
# Health check
curl http://localhost:3000/health

# List all characters
curl http://localhost:3000/api/characters

# Get a specific character (replace ID)
curl http://localhost:3000/api/characters/00000000-0000-0000-0000-000000000001

# Create a character
curl -X POST http://localhost:3000/api/characters \
  -H "Content-Type: application/json" \
  -d '{"data": {"name": "Test Hero", "race": "Elf", "className": "Wizard", "level": 1}}'

# Duplicate a character
curl -X POST http://localhost:3000/api/characters/00000000-0000-0000-0000-000000000001/duplicate

# Delete a character (replace ID)
curl -X DELETE http://localhost:3000/api/characters/<id>
```

---

## Test reference spells/feat search

```bash
# Search spells by name
curl "http://localhost:3000/api/reference/spells?q=fireball"

# Filter by school
curl "http://localhost:3000/api/reference/spells?school=evocation"

# Filter by class + max level
curl "http://localhost:3000/api/reference/spells?class=wizard&level=3"

# Combined filters
curl "http://localhost:3000/api/reference/spells?q=fire&school=evocation&class=sorcerer&level=5"

# Get a specific spell
curl "http://localhost:3000/api/reference/spells/<id>"

# Search feats
curl "http://localhost:3000/api/reference/feats?q=power+attack"

# Filter feats by type
curl "http://localhost:3000/api/reference/feats?type=Combat"

# Attach a reference spell to a character
curl -X POST http://localhost:3000/api/characters/00000000-0000-0000-0000-000000000001/spells \
  -H "Content-Type: application/json" \
  -d '{"referenceSpellId": "<spell-id>", "isPrepared": true}'

# List a character's attached spells
curl http://localhost:3000/api/characters/00000000-0000-0000-0000-000000000001/spells

# Attach a feat to a character
curl -X POST http://localhost:3000/api/characters/00000000-0000-0000-0000-000000000001/feats \
  -H "Content-Type: application/json" \
  -d '{"referenceFeatId": "<feat-id>"}'
```

---

## All available scripts

### Backend (`cd backend`)

| Script                 | Description                                            |
|------------------------|--------------------------------------------------------|
| `npm run dev`          | Start dev server with hot reload (tsx watch)           |
| `npm run build`        | Compile TypeScript to `dist/`                          |
| `npm start`            | Run compiled production build                          |
| `npm run db:migrate`   | Create + apply new Prisma migration (interactive)      |
| `npm run db:generate`  | Regenerate Prisma client after schema changes          |
| `npm run db:studio`    | Open Prisma Studio visual DB browser                   |
| `npm run db:seed`      | Upsert Valeron demo character                          |
| `npm run import:feats` | Import PF1e feats from d20pfsrd.com                    |
| `npm run import:spells`| Import PF1e spells from d20pfsrd.com                   |
| `npm run type-check`   | TypeScript check without emitting                      |

**Importer flags:**

| Flag | Description |
|------|-------------|
| `--dry-run` | Parse and log without writing to DB |
| `--letter <a-z>` | Spells only: import one alphabet section |
| `--limit <n>` | Cap total items processed |

### Frontend (`cd frontend`)

| Script               | Description                                       |
|----------------------|---------------------------------------------------|
| `npm run dev`        | Start Vite dev server                             |
| `npm run build`      | Production build to `dist/` (web)                 |
| `npm run preview`    | Preview production build locally                  |
| `npm run type-check` | TypeScript check without emitting                 |
| `npm run build:mobile` | Build with `--mode mobile` (loads `.env.mobile`)  |
| `npm run cap:sync`   | Build for mobile + sync web assets into Android   |
| `npm run cap:open`   | Open the Android project in Android Studio        |
| `npm run cap:run`    | Build + sync + run on connected device/emulator   |

---

## Full API reference

All responses use the envelope: `{ success: boolean, data: T, error?: string }`

### Characters

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/characters` | List summaries (name, race, class, level) |
| GET | `/api/characters/:id` | Full character with `data` JSON |
| POST | `/api/characters` | Create — body: `{ data: CharacterData }` |
| PUT | `/api/characters/:id` | Update — body: `{ data: Partial<CharacterData> }` (deep-merged) |
| DELETE | `/api/characters/:id` | Delete |
| POST | `/api/characters/:id/duplicate` | Clone with `(Copy)` suffix |

### Character spell attachments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/characters/:id/spells` | List attached spells with full reference data |
| POST | `/api/characters/:id/spells` | Attach — body: `{ referenceSpellId, isPrepared?, notes? }` |
| DELETE | `/api/characters/:id/spells/:csId` | Detach |

### Character feat attachments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/characters/:id/feats` | List attached feats with full reference data |
| POST | `/api/characters/:id/feats` | Attach — body: `{ referenceFeatId, notes? }` |
| DELETE | `/api/characters/:id/feats/:cfId` | Detach |

### Reference archive

| Method | Path | Query params | Description |
|--------|------|------|-------------|
| GET | `/api/reference/spells` | `q`, `school`, `class`, `level`, `limit`, `offset` | Search spells |
| GET | `/api/reference/spells/:id` | — | Get spell detail |
| GET | `/api/reference/feats` | `q`, `type`, `limit`, `offset` | Search feats |
| GET | `/api/reference/feats/:id` | — | Get feat detail |

---

## Android (Capacitor)

The frontend can be packaged as a native Android app via [Capacitor](https://capacitorjs.com).
The web frontend is the single source of truth — Capacitor wraps it in a WebView.

### Prerequisites

- Android Studio installed with at least one SDK platform (API 24+)
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` environment variable set, or configured in Android Studio

### First-time setup

```bash
cd frontend

# 1. Configure the mobile API URL
cp .env.mobile.example .env.mobile
# Edit .env.mobile — set VITE_API_BASE_URL to your production backend URL
# e.g. VITE_API_BASE_URL=https://pathlegends-backend.up.railway.app

# 2. Build + sync (creates/updates frontend/android/)
npm run cap:sync

# 3. Open in Android Studio
npm run cap:open
```

> **Railway backend — required env var:**
> Add `EXTRA_ORIGINS=https://localhost` to the backend service's environment variables
> in Railway. This whitelists the Capacitor Android WebView origin so CORS and cookies work.

In Android Studio: **Run ▶** to deploy to a device or emulator.

### Ongoing workflow

```bash
# After any frontend code change:
npm run cap:sync     # rebuild + sync assets

# Then in Android Studio click Run again, or:
npm run cap:run      # build + sync + run directly (device must be connected)
```

### Key configuration files

| File | Purpose |
|---|---|
| `frontend/capacitor.config.ts` | App ID, name, webDir, Android scheme |
| `frontend/.env.mobile` | `VITE_API_BASE_URL` for mobile builds (git-ignored) |
| `frontend/android/` | Generated Android project (committed to repo) |

### Known limitations & next steps

| Topic | Status | Notes |
|---|---|---|
| **Cookie auth** | ✅ Works | `androidScheme: 'https'` + `SameSite=None; Secure` on backend |
| **API URL** | ⚙️ Manual | Set `VITE_API_BASE_URL` in `.env.mobile` before building |
| **Error messages** | ✅ Fixed | Axios interceptor surfaces backend messages (not generic HTTP strings) |
| **Backend CORS** | ✅ Configured | `EXTRA_ORIGINS=https://localhost` in Railway backend env |
| **Session persistence** | ✅ Works | `maxAge: 12h` cookie persists across app restarts in Android CookieManager |
| **Deep links** (`/verify-email`, `/reset-password`) | ⚠️ Browser only | Email links open in the device browser — works fine for now |
| **Mid-session 401** | ⚠️ Shows error | If session expires while app is open, next request shows "Session expired"; app redirects on next boot |
| **Icons / splash** | ⏳ Not done | Use `@capacitor/assets` to generate from a source image |
| **Signed APK / Play Store** | ⏳ Not done | Configure a keystore in Android Studio when ready |

---

## Architecture notes

- **Formula engine** (`frontend/src/lib/formulas/`) — all Pathfinder derived values (modifier, AC, saves, skill totals, encumbrance, spell DC) are pure functions; `recomputeCharacter()` runs on every state update
- **Zustand store** — `updateCharacterData(patch)` deep-merges the patch and triggers recompute; `isDirty` flag drives the Save button
- **JSON column** — `Character.data` is a MySQL `json` column storing the entire `CharacterData` blob; Prisma handles serialisation automatically
- **Shared PrismaClient** (`backend/src/common/db/prisma.ts`) — single connection pool instance shared by all repositories
- **Reference vs character data** — `ReferenceSpell` / `ReferenceFeat` are the read-only archive; `CharacterSpell` / `CharacterFeat` are junction tables that link a character to a reference entry and can hold per-character notes
- **Offline importers** — `scripts/import-*.ts` are standalone scripts that scrape d20pfsrd.com and upsert into the local DB; the app UI reads only from the local DB, never from an external source
- **`@/` alias** — maps to `frontend/src/` in both `tsconfig.json` and `vite.config.ts`
- **Vite proxy** — `/api` is proxied to `BACKEND_URL` (Docker: `http://backend:3000`, local: `http://localhost:3000`)
