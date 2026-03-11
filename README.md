# Pathfinder Character Manager

A modern digital character sheet for Pathfinder 1e — built with React, TypeScript, Vite, TailwindCSS, Zustand, Express, Prisma, and SQLite.

---

## Requirements

| Tool    | Minimum version |
|---------|-----------------|
| Node.js | 18+             |
| npm     | 9+              |

---

## Project structure

```
Pathfinder-app/
├── frontend/      React + Vite + TypeScript + TailwindCSS + Zustand
└── backend/       Node.js + Express + Prisma + SQLite
```

---

## First-time setup

### 1 — Backend

```bash
cd backend
npm install
npm run db:migrate    # creates dev.db and applies schema
npm run db:seed       # inserts Valeron (demo character)
```

### 2 — Frontend

```bash
cd frontend
npm install
```

---

## Running the app

Open **two terminals**.

### Terminal 1 — Backend (port 3000)

```bash
cd backend
npm run dev
```

### Terminal 2 — Frontend (port 5173)

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Available scripts

### Backend

| Script               | Description                                   |
|----------------------|-----------------------------------------------|
| `npm run dev`        | Start dev server with hot reload              |
| `npm run build`      | Compile TypeScript to `dist/`                 |
| `npm start`          | Run compiled production build                 |
| `npm run db:migrate` | Apply Prisma migrations (creates SQLite DB)   |
| `npm run db:generate`| Regenerate Prisma client after schema changes |
| `npm run db:seed`    | Insert Valeron demo character                 |
| `npm run db:studio`  | Open Prisma Studio (visual DB browser)        |
| `npm run type-check` | TypeScript check without emitting             |

### Frontend

| Script               | Description                             |
|----------------------|-----------------------------------------|
| `npm run dev`        | Start Vite dev server                   |
| `npm run build`      | Production build to `dist/`             |
| `npm run preview`    | Preview production build locally        |
| `npm run type-check` | TypeScript check without emitting       |

---

## API reference

| Method | Path                              | Description           |
|--------|-----------------------------------|-----------------------|
| GET    | `/api/characters`                 | List all characters   |
| GET    | `/api/characters/:id`             | Get full character    |
| POST   | `/api/characters`                 | Create character      |
| PUT    | `/api/characters/:id`             | Update character      |
| DELETE | `/api/characters/:id`             | Delete character      |
| POST   | `/api/characters/:id/duplicate`   | Duplicate character   |

All responses: `{ success: boolean, data: T, error?: string }`

---

## Keyboard shortcuts

| Shortcut        | Action                |
|-----------------|-----------------------|
| Ctrl+S / ⌘S    | Save character        |
| Escape          | Close modals          |

---

## Architecture notes

- **Formula engine** (`frontend/src/lib/formulas/`) — all derived Pathfinder values are pure functions; `recomputeCharacter()` runs automatically on every state update
- **Zustand store** — `updateCharacterData(patch)` deep-merges and recomputes; `isDirty` flag drives the Save button
- **JSON column** — backend stores the entire `CharacterData` blob as JSON in a single SQLite column
- **`@/` alias** — maps to `frontend/src/` in both `tsconfig.json` and `vite.config.ts`
