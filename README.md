# Wellness Platform (Learner App + Separate Admin App + Hosted Postgres)

## What changed

- **Learner website** remains in this root app (`src/`) and no longer embeds admin UI.
- **Admin panel is now a separate website** in `admin-web/`.
- Backend now uses **real PostgreSQL** via `DATABASE_URL` (Neon/Supabase/Railway/AWS RDS).
- Module player now has:
  - **real progress bar** synced with backend
  - **live translation** for active transcript line

---

## 1) Create a real hosted database

Use one of:
- Neon (recommended quick start)
- Supabase Postgres
- Railway Postgres
- AWS RDS Postgres

Copy its connection string into `.env`:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
PG_SSL=true
TRANSLATION_API_URL=https://libretranslate.com/translate
```

> `TRANSLATION_API_URL` is optional. If missing, translation falls back to a prefixed local response.

---

## 2) Install dependencies

```bash
npm install
npm --prefix admin-web install
```

---

## 3) Run services

### Backend API

```bash
npm run backend:dev
```

### Learner app

```bash
npm run dev
```

### Separate Admin website

```bash
npm run admin:dev
```

- Learner app: `http://localhost:5173`
- Admin app: `http://localhost:5174`
- Backend API: `http://localhost:4000/api`

---

## Database content now hosted in Postgres

The backend stores all core data in Postgres tables:
- users
- modules (with `video_url` and transcript JSON)
- quizzes (questions JSON)
- rewards
- progress events
- per-user module progress

So videos are represented by hosted links (`video_url`) and all quiz/user/progress metadata is in Postgres.

---

## Deploy plan

### Backend deploy
Deploy backend to Railway/Render/Fly.io:
- Set env vars:
  - `DATABASE_URL`
  - `PG_SSL=true`
  - `TRANSLATION_API_URL` (optional)
- Start command:
  - `npm run backend:start`

### Learner frontend deploy
Deploy this root frontend to Vercel/Netlify:
- Set `VITE_API_BASE_URL` to deployed backend, e.g.
  - `https://api.yourdomain.com/api`

### Admin frontend deploy (separate site)
Deploy `admin-web` as its own project:
- Build command:
  - `npm --prefix admin-web run build`
- Set `VITE_API_BASE_URL` to same backend API.

---

## API additions

- `GET /api/progress/modules/:moduleId?userId=1`
- `PUT /api/progress/modules/:moduleId`
- `POST /api/translation/live`
- `GET /api/admin/modules`
- `POST /api/admin/modules`


---


## Troubleshooting

If backend shows `Cannot find package 'pg'`:

```bash
npm install
```

Then restart:

```bash
npm run backend:dev
```

