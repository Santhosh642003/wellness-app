# Wellness App (Frontend + Backend + Admin)

This repository now includes:
- React + Vite frontend
- Express backend API
- SQLite database (auto-created and seeded)
- Admin panel for users, quizzes, rewards, and progress tracking

## 1) Install

```bash
npm install
```

## 2) Run backend API

```bash
npm run backend:dev
```

Backend base URL: `http://localhost:4000/api`

The SQLite DB file is auto-created at:
- `backend/data/wellness.sqlite`

## 3) Run frontend

```bash
npm run dev
```

Frontend URL: `http://localhost:5173`

## Login accounts

- Student:
  - email: `student@njit.edu`
  - password: `demo1234`
- Admin:
  - email: `admin@njit.edu`
  - password: `admin1234`

---

## API Routes

### General
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/progress/overview`
- `GET /api/modules`
- `GET /api/modules/:moduleId`
- `GET /api/rewards`

### Admin APIs
- `GET /api/admin/users`
- `POST /api/admin/users`
- `GET /api/admin/quizzes`
- `POST /api/admin/quizzes`
- `PATCH /api/admin/quizzes/:id`
- `GET /api/admin/rewards`
- `POST /api/admin/rewards`
- `GET /api/admin/progress`
- `POST /api/admin/progress/event`

---

## How to use the Admin Panel

1. Start backend and frontend.
2. Open `http://localhost:5173/admin`.
3. Use forms at top to:
   - add users
   - add quizzes
   - add rewards
4. Review data tables to control:
   - users
   - quizzes
   - rewards
   - progress metrics per student

## Example API calls

Create a user:

```bash
curl -X POST http://localhost:4000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{"name":"New Student","email":"new@njit.edu","password":"pass1234"}'
```

Create progress event:

```bash
curl -X POST http://localhost:4000/api/admin/progress/event \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"event_type":"quiz_completed","points_delta":50,"metadata":{"quiz":"HPV"}}'
```
