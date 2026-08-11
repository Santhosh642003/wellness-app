# NJIT Campus Wellness App — Technical Specification

**Version:** 1.0  
**Date:** July 2026  
**Classification:** Internal Technical Reference

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Database Schema](#5-database-schema)
6. [Backend API Reference](#6-backend-api-reference)
7. [Frontend Application](#7-frontend-application)
8. [Admin Panel](#8-admin-panel)
9. [Authentication & Security](#9-authentication--security)
10. [File Storage](#10-file-storage)
11. [Email System](#11-email-system)
12. [Gamification System](#12-gamification-system)
13. [Learning Module System](#13-learning-module-system)
14. [Quiz System](#14-quiz-system)
15. [Deployment & Infrastructure](#15-deployment--infrastructure)
16. [Environment Configuration](#16-environment-configuration)
17. [Data Flow Diagrams](#17-data-flow-diagrams)

---

## 1. Project Overview

The NJIT Campus Wellness App is a full-stack, production-ready web platform designed to deliver vaccine health education to NJIT students. It combines structured video-based learning with gamification mechanics — points, streaks, leaderboards, quizzes, and a rewards marketplace — to drive consistent engagement and knowledge retention.

### Core Goals

| Goal | Implementation |
|------|----------------|
| Structured learning | Sequential, locked video modules with chapter support |
| Knowledge verification | Per-module and biweekly quizzes with cooldown enforcement |
| Engagement | Daily reward streaks, leaderboard rankings, referral bonuses |
| Content accessibility | In-player CC subtitles, per-chapter transcripts, downloadable documents |
| Administrative control | Dedicated admin panel for full content and user management |
| Scalability | Containerised deployment, S3-compatible cloud storage |

### Target Users

- **Students** — NJIT campus community accessing wellness education
- **Administrators** — Staff managing content, monitoring progress, broadcasting announcements

---

## 2. System Architecture

The platform is composed of four independent services orchestrated with Docker Compose and communicating over a private internal network (`wellness_net`).

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet / Browser                      │
└────────────┬───────────────────────────┬────────────────────────┘
             │ Port 80                   │ Port 8080
             ▼                           ▼
┌────────────────────┐       ┌────────────────────────┐
│  Frontend (Nginx)  │       │   Admin Panel (Nginx)  │
│  wellness_frontend │       │    wellness_admin       │
│  React 19 + Vite   │       │    React 19 + Vite      │
└────────┬───────────┘       └──────────┬─────────────┘
         │ /api/* proxy                 │ /api/* proxy
         │                              │
         ▼                              ▼
┌─────────────────────────────────────────────────────┐
│             Backend API (Express)  Port 3001        │
│              wellness_backend  · Node.js 20          │
│                                                     │
│  Auth · Modules · Quizzes · Rewards · Users         │
│  Leaderboard · Comments · Bookmarks · Admin         │
│  File Upload · Email · Notifications                │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  PostgreSQL 16-alpine  │
              │  wellness_db  Port 5432│
              │  16 tables · JSONB     │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  File Storage          │
              │  S3-compatible cloud   │
              │  OR local ./uploads/   │
              └────────────────────────┘
```

### Inter-service Communication

- Frontend and Admin both proxy `/api/*` requests through their Nginx configs to `backend:3001`
- The backend connects to `db:5432` using the internal Docker network
- File uploads go to S3/R2 (cloud) or a shared Docker volume (`uploads_data`)
- All services share `wellness_net` bridge network — no direct external DB access

---

## 3. Technology Stack

### Frontend (Student App)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.2.0 |
| Routing | React Router DOM | 7.11.0 |
| Build Tool | Vite (rolldown-vite) | 7.2.5 |
| Styling | Tailwind CSS | 3.4.17 |
| Icons | Lucide React | 0.562.0 |
| Google Auth | @react-oauth/google | 0.13.4 |
| CSS Pipeline | PostCSS + Autoprefixer | latest |

### Admin Panel

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.0.0 |
| Routing | React Router DOM | 7.0.0 |
| Build Tool | Vite | 6.0.5 |
| Styling | Tailwind CSS | 3.4.17 |
| Icons | Lucide React | 0.468.0 |

### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 (Alpine) |
| Framework | Express | 4.21.1 |
| Database Driver | pg (node-postgres) | 8.13.1 |
| Auth | jsonwebtoken | 9.0.2 |
| Hashing | bcryptjs | 2.4.3 |
| Validation | Zod | 3.23.8 |
| File Uploads | Multer | 1.4.5-lts.1 |
| Email | Nodemailer | 6.9.16 |
| Google Auth | google-auth-library | 9.15.1 |
| AI Transcription | groq-sdk | 0.9.1 |
| Cloud Storage | @aws-sdk/client-s3 | 3.1014.0 |
| Security | Helmet | 8.0.0 |
| Rate Limiting | express-rate-limit | 7.4.1 |
| Logging | Morgan | 1.10.0 |
| Dev Server | Nodemon | 3.1.7 |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| Containerisation | Docker + Docker Compose |
| Reverse Proxy | Nginx (Alpine) |
| Database | PostgreSQL 16-Alpine |
| OS Base | Alpine Linux (all containers) |
| External DNS | 8.8.8.8, 1.1.1.1 |

---

## 4. Repository Structure

```
wellness-app/
├── docker-compose.yml              # Service orchestration
├── Dockerfile.frontend             # Multi-stage frontend image
├── nginx.conf                      # Frontend Nginx config (port 80)
├── package.json                    # Frontend dependencies
├── vite.config.js                  # Frontend Vite config
├── tailwind.config.js              # Frontend Tailwind config
├── index.html                      # Frontend HTML shell
│
├── src/                            # Frontend React source
│   ├── main.jsx                    # React DOM entry, provider setup
│   ├── App.jsx                     # Root router
│   ├── pages/                      # Route-level components (14 pages)
│   ├── components/                 # Reusable UI components (14 components)
│   │   └── sidebar/                # Dashboard sidebar widgets (5 cards)
│   ├── contexts/                   # AuthContext, ThemeContext
│   ├── hooks/                      # useLocalStorage
│   └── lib/
│       └── api.js                  # Typed API client
│
├── backend/
│   ├── Dockerfile                  # Backend image
│   ├── package.json                # Backend dependencies
│   ├── .env.example                # Environment variable template
│   └── src/
│       ├── server.js               # Express app, middleware, route mounting
│       ├── middleware/
│       │   ├── auth.js             # JWT verification (authenticate, requireSelf)
│       │   ├── adminAuth.js        # Admin role gate
│       │   └── errorHandler.js     # Global error handler
│       ├── routes/
│       │   ├── auth.js             # Registration, login, OTP, Google OAuth, password reset
│       │   ├── users.js            # Profile, progress, quizzes, bookmarks, activity
│       │   ├── modules.js          # Module listing/detail, comments, per-user locking
│       │   ├── rewards.js          # Rewards listing and redemption
│       │   ├── leaderboard.js      # Rankings (all-time, weekly, monthly)
│       │   ├── admin.js            # Full admin CRUD + file upload endpoints
│       │   └── transcribe.js       # Groq Whisper audio transcription
│       └── lib/
│           ├── db.js               # PostgreSQL pool (SSL auto-detect)
│           ├── migrate.js          # Incremental SQL migration runner
│           ├── seed.js             # Default admin account seeder
│           ├── email.js            # SMTP transporter + HTML email templates
│           └── storage.js          # S3-compatible / local file upload
│
└── admin/
    ├── Dockerfile                  # Multi-stage admin image
    ├── nginx.conf                  # Admin Nginx config (port 8080)
    ├── package.json                # Admin dependencies
    ├── vite.config.js              # Admin Vite config
    └── src/
        ├── main.jsx                # Admin entry point
        ├── App.jsx                 # Admin router
        ├── pages/                  # 9 admin pages
        ├── components/
        │   └── Sidebar.jsx         # Admin navigation
        ├── contexts/
        │   └── AuthContext.jsx     # Admin auth state
        └── lib/
            └── api.js              # Admin API client (XHR uploads)
```

---

## 5. Database Schema

The database uses PostgreSQL 16 with raw SQL migrations (no ORM). Schema is applied at server startup via `src/lib/migrate.js` using `IF NOT EXISTS` guards for idempotency.

### Entity Relationship Overview

```
users ──────────────────────────────────────────────┐
  │                                                  │
  ├── user_progress (1:1)                            │
  ├── user_module_progress (1:N) ──── modules        │
  ├── quiz_attempts (1:N) ─────────── quizzes ────── modules
  ├── reward_redemptions (1:N) ─────── rewards       │
  ├── bookmarks (1:N) ─────────────── modules        │
  ├── comments (1:N) ──────────────── modules        │
  ├── email_otps (1:N)                               │
  ├── password_resets (1:N)                          │
  └── referrals (as referrer/referred)               │
                                                     │
admin_users (separate auth table)                    │
notifications (standalone)                           │
quizzes ──── quiz_questions (1:N)                    │
modules (see above) ─────────────────────────────────┘
```

### Table Definitions

#### `users`
```sql
id            TEXT PRIMARY KEY
email         TEXT UNIQUE NOT NULL
name          TEXT NOT NULL
password      TEXT NOT NULL              -- bcrypt hash
initials      TEXT NOT NULL
role          TEXT NOT NULL DEFAULT 'Student'
campus        TEXT NOT NULL DEFAULT 'NJIT Newark'
major         TEXT
graduationYear TEXT
bio           TEXT
yearOfStudy   TEXT
ethnicity     TEXT
emailVerified BOOLEAN NOT NULL DEFAULT true
referralCode  TEXT UNIQUE
createdAt     TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt     TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### `user_progress`
```sql
id            TEXT PRIMARY KEY
userId        TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE
points        INTEGER NOT NULL DEFAULT 0
streakDays    INTEGER NOT NULL DEFAULT 0
lastClaimDate TIMESTAMPTZ
createdAt     TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt     TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### `modules`
```sql
id            TEXT PRIMARY KEY
slug          TEXT UNIQUE NOT NULL
title         TEXT NOT NULL
description   TEXT NOT NULL
duration      TEXT NOT NULL
category      TEXT NOT NULL               -- Foundations | HPV | MenB | Bonus | General
orderIndex    INTEGER NOT NULL
pointsValue   INTEGER NOT NULL DEFAULT 100
videoUrl      TEXT NOT NULL DEFAULT ''    -- legacy single-video
locked        BOOLEAN NOT NULL DEFAULT true
keyPoints     JSONB DEFAULT '[]'          -- string[]
transcript    JSONB DEFAULT '[]'          -- legacy {time,text}[]
videos        JSONB DEFAULT '[]'          -- VideoItem[] (multi-chapter)
documents     JSONB DEFAULT '[]'          -- DocumentItem[]
createdAt     TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt     TIMESTAMPTZ DEFAULT NOW()
```

**VideoItem shape (JSONB)**
```json
{
  "id": "uuid",
  "title": "Chapter 1 — Introduction",
  "url": "https://...",
  "duration": "5:30",
  "transcript": [{ "time": 0, "text": "Welcome..." }]
}
```

**DocumentItem shape (JSONB)**
```json
{
  "id": "uuid",
  "title": "Study Guide",
  "url": "https://...",
  "fileType": "pdf",
  "size": "2.1 MB"
}
```

#### `user_module_progress`
```sql
id             TEXT PRIMARY KEY
userId         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
moduleId       TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE
completed      BOOLEAN NOT NULL DEFAULT false
watchedPercent INTEGER NOT NULL DEFAULT 0
quizPassed     BOOLEAN NOT NULL DEFAULT false
completedAt    TIMESTAMPTZ
videoProgress  JSONB DEFAULT '{}'         -- { "0": 85, "1": 100, ... }
createdAt      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt      TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE(userId, moduleId)
```

#### `quizzes`
```sql
id           TEXT PRIMARY KEY
moduleId     TEXT REFERENCES modules(id) ON DELETE CASCADE   -- null = biweekly
type         TEXT NOT NULL                                    -- 'module' | 'biweekly'
title        TEXT NOT NULL
passingScore INTEGER NOT NULL DEFAULT 70                     -- percentage
scheduledAt  TIMESTAMPTZ                                     -- future lock timestamp
createdAt    TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt    TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### `quiz_questions`
```sql
id          TEXT PRIMARY KEY
quizId      TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE
question    TEXT NOT NULL
options     JSONB NOT NULL                -- string[4]
answerIndex INTEGER NOT NULL              -- 0-based index into options
points      INTEGER NOT NULL DEFAULT 10
explanation TEXT
orderIndex  INTEGER NOT NULL DEFAULT 0
createdAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### `quiz_attempts`
```sql
id          TEXT PRIMARY KEY
userId      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
moduleId    TEXT REFERENCES modules(id) ON DELETE SET NULL
quizType    TEXT NOT NULL                 -- 'module' | 'biweekly'
score       INTEGER NOT NULL
totalPoints INTEGER NOT NULL
passed      BOOLEAN NOT NULL
answers     JSONB NOT NULL               -- submitted answer indices
createdAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### `rewards`
```sql
id          TEXT PRIMARY KEY
title       TEXT NOT NULL
description TEXT NOT NULL
pointsCost  INTEGER NOT NULL
category    TEXT NOT NULL
available   BOOLEAN NOT NULL DEFAULT true
stock       INTEGER NOT NULL DEFAULT -1   -- -1 = unlimited
imageUrl    TEXT
createdAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### `comments`
```sql
id        TEXT PRIMARY KEY
userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
moduleId  TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE
body      TEXT NOT NULL
createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
INDEX ON moduleId
```

#### `notifications`
```sql
id        TEXT PRIMARY KEY
title     TEXT NOT NULL
body      TEXT NOT NULL DEFAULT ''
imageUrl  TEXT
active    BOOLEAN NOT NULL DEFAULT true
createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### `bookmarks`
```sql
id        TEXT PRIMARY KEY
userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
moduleId  TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE
createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE(userId, moduleId)
```

#### Supporting Tables

| Table | Purpose |
|-------|---------|
| `email_otps` | 6-digit OTP codes with 10-minute expiry |
| `password_resets` | UUID tokens with 1-hour expiry |
| `admin_users` | Separate admin credentials store |
| `reward_redemptions` | Audit trail of reward claims |
| `referrals` | Referral bonus tracking |

---

## 6. Backend API Reference

Base path: `/api`  
All routes except `/auth/*` and `/notifications` require `Authorization: Bearer <jwt>`.

### Rate Limits

| Route Group | Limit |
|-------------|-------|
| All `/api/*` | 200 req / 15 min |
| `/api/auth/*` | 20 req / 15 min |
| `/api/admin/auth/login` | 10 req / 15 min |

### Authentication Routes `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/send-otp` | Send 6-digit code to email (must be @njit.edu or any email) |
| POST | `/register` | Create account (requires valid OTP, returns JWT) |
| POST | `/login` | Email + password → JWT |
| POST | `/google` | Google IdToken → JWT (auto-creates account) |
| POST | `/forgot-password` | Send password reset email (3 per user/hour) |
| POST | `/reset-password` | Consume token, set new password |
| GET | `/me` | Return current user from JWT |

### User Routes `/api/users` *(authenticated)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:userId` | Full user profile + progress + recent redemptions |
| PATCH | `/:userId/profile` | Update name, role, campus, major, bio, etc. |
| POST | `/:userId/daily-claim` | Claim 25 pts (once per day), advance streak |
| GET | `/:userId/module-progress` | List all user_module_progress rows |
| PATCH | `/:userId/module-progress/:moduleId` | Upsert watch %, video progress object |
| POST | `/:userId/quiz` | Submit quiz answers, grade, award points |
| GET | `/:userId/bookmarks` | List bookmarked modules |
| POST | `/:userId/bookmarks/:moduleId` | Add bookmark |
| DELETE | `/:userId/bookmarks/:moduleId` | Remove bookmark |
| GET | `/:userId/activity` | Return date strings with quiz/completion events (90 days) |

### Module Routes `/api/modules` *(authenticated)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | All modules with per-user lock status and progress |
| GET | `/quiz/biweekly` | Biweekly quiz (checks schedule lock + 14-day cooldown) |
| GET | `/:moduleId` | Single module detail |
| GET | `/:moduleId/quiz` | Module quiz (checks 24-hour retake cooldown) |
| GET | `/:moduleId/comments` | Comments list (with isOwn flag) |
| POST | `/:moduleId/comments` | Post new comment |
| DELETE | `/:moduleId/comments/:commentId` | Delete own comment (403 if not owner) |

**Module Locking Logic:**
- `orderIndex = 0` → always unlocked
- `orderIndex > 0` → unlocked only if previous module's `completed = true` for this user

### Reward Routes `/api/rewards` *(authenticated)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List available rewards |
| POST | `/redeem` | Redeem by rewardId (deducts points, decrements stock) |
| GET | `/history/:userId` | User's redemption history |

### Leaderboard Routes `/api/leaderboard` *(authenticated)*

| Method | Path | Query Params | Description |
|--------|------|-------------|-------------|
| GET | `/` | `period=all\|week\|month` | Top 50 users by points |

### Notifications Routes `/api/notifications` *(authenticated)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List active notifications |

### Admin Routes `/api/admin`

All admin routes require admin JWT (`Authorization: Bearer <admin_jwt>`).

**Authentication**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Admin email/password → JWT (12h expiry) |

**Statistics**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Snapshot: users, completions, revenue, top modules |
| GET | `/stats/analytics` | 30-day time-series (signups, completions, quiz passes) |
| GET | `/stats/detail` | Extended stats with top earners |

**User Management**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | All users with aggregated stats |
| GET | `/users/:id` | Detailed user: profile + progress + redemptions + activity |
| PATCH | `/users/:id/points` | Adjust user points (delta + reason) |
| POST | `/users/bulk` | Bulk award/revoke points |

**Module CRUD**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/modules` | All modules |
| POST | `/modules` | Create module (validates with Zod, assigns video IDs) |
| PATCH | `/modules/:id` | Update module (partial fields accepted) |
| DELETE | `/modules/:id` | Delete module and cascade |

**Quiz CRUD**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/quizzes` | All quizzes |
| POST | `/quizzes` | Create quiz |
| PATCH | `/quizzes/:id` | Update quiz (sendLiveEmail: true → notify all users) |
| DELETE | `/quizzes/:id` | Delete quiz |

**Quiz Questions CRUD**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/quizzes/:quizId/questions` | List questions ordered by orderIndex |
| POST | `/quiz-questions` | Create question |
| PATCH | `/quiz-questions/:id` | Update question |
| DELETE | `/quiz-questions/:id` | Delete question |

**Reward CRUD**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/rewards` | All rewards |
| POST | `/rewards` | Create reward |
| PATCH | `/rewards/:id` | Update reward |
| DELETE | `/rewards/:id` | Delete reward |

**Redemptions**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/redemptions` | All redemptions with user and reward detail |

**Notification CRUD**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | All notifications |
| POST | `/notifications` | Create notification (sendEmail: true → bulk email all users) |
| PATCH | `/notifications/:id` | Update notification |
| DELETE | `/notifications/:id` | Delete notification |

**File Upload**
| Method | Path | Limit | Description |
|--------|------|-------|-------------|
| POST | `/videos/upload` | 500 MB | Upload video to S3/local, returns URL |
| POST | `/images/upload` | 10 MB | Upload image to S3/local, returns URL |
| POST | `/documents/upload` | 50 MB | Upload document, returns URL + fileType + size |

---

## 7. Frontend Application

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Marketing page with hero, features, how-it-works |
| Login | `/login` | Email/password + Google OAuth sign-in |
| ForgotPassword | `/forgot-password` | Initiate email password reset |
| ResetPassword | `/reset-password?token=...` | Token-based password change form |
| Dashboard | `/dashboard` | User home: progress summary, daily claim, sidebar widgets |
| Modules | `/modules` | Module catalog with chapter accordion expansion |
| ModulePlayer | `/modules/:moduleId?chapter=N` | Video player, CC subtitles, transcript, quiz CTA, discussion |
| ModuleQuiz | `/quiz/module/:moduleId` | Graded module quiz with 24h retake cooldown |
| BiWeeklyQuiz | `/quiz/biweekly` | Biweekly challenge quiz with 14-day cooldown |
| Rewards | `/rewards` | Points marketplace |
| Leaderboard | `/leaderboard` | Student rankings |
| Profile | `/profile` | Profile editor and personal stats |
| Certificate | `/certificate` | Completion certificate display |
| NotFound | `*` | 404 page |

### Key Components

| Component | Responsibility |
|-----------|---------------|
| `VideoPlayer` | Custom HTML5 player: seek bar, volume, CC overlay, playback speed, fullscreen |
| `QuizEngine` | Question renderer, answer selection, submission, score display |
| `DailyRewardCard` | Streak display + claim button (disabled after daily claim) |
| `DashboardNav` | Top navigation with points counter and streak badge |
| `ErrorBoundary` | Catches render errors and shows fallback UI |
| `Toast` | Non-blocking notification overlay |
| `sidebar/CalendarCard` | 90-day activity heatmap |
| `sidebar/LeaderboardCard` | Top 5 users snippet |
| `sidebar/NotificationsCard` | Active announcements feed |
| `sidebar/StreakCard` | Current streak + last claim date |
| `sidebar/UpcomingChallenge` | Next scheduled biweekly quiz |

### Module Player — Chapter System

The player supports multi-chapter modules via the `?chapter=N` URL query parameter:

1. User opens `/modules` → module card shows "View X Chapters" accordion
2. Clicking a chapter navigates to `/modules/:id?chapter=N`
3. Player reads `?chapter=N`, sets initial video to that index
4. Chapter tabs within the player allow switching between videos
5. Each chapter tracks independent watch percentage in `videoProgress` JSONB
6. Quiz unlocks only when ALL chapters are ≥80% watched

### CC Subtitle System

```
Admin enters transcript per-chapter:
  [ { "time": 0, "text": "..." }, { "time": 8, "text": "..." } ]
          ↓ saved to videos[N].transcript in DB
Player reads current chapter's transcript
          ↓ activeCaptionIdx computed from videoTime
CC button in player controls (always visible, disabled if no transcript)
          ↓ user toggles on
Caption text overlaid on video at bottom (z-index above controls)
Full transcript panel also shown below player
```

### Theme System

- Dark/light mode toggled via `ThemeContext`
- CSS custom properties (`--bg-page`, `--bg-card`, etc.) on `:root`
- Tailwind `dark:` classes throughout
- Preference persisted in `localStorage`

---

## 8. Admin Panel

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Admin-only credentials |
| Dashboard | `/` | KPIs: user count, completion rates, quiz passes, 30-day analytics chart |
| Modules | `/modules` | Full module CRUD: create, edit, delete modules with chapters, documents, quizzes |
| Quizzes | `/quizzes` | Quiz management with question editor (separate from module quiz) |
| Users | `/users` | User list with search, filter by campus/category |
| UserDetail | `/users/:id` | Individual user view: profile, progress, points adjustment, activity calendar |
| Rewards | `/rewards` | Create/edit rewards, set stock and point costs |
| Notifications | `/notifications` | Create announcements, optionally send bulk email |
| Redemptions | `/redemptions` | View all reward redemptions with timestamps |

### Module Form Features

The admin module editor includes:
- **Basic fields**: Title, slug (auto-generated), description, category, duration, points, order index, locked toggle
- **Videos tab**: Unlimited chapters, each with title, duration, URL (upload or paste), and collapsible transcript editor
  - Transcript editor validates JSON format in real-time
  - Shows line count badge
- **Documents tab**: Attach PDFs, slides, or any file (upload or URL), with file type and size fields
- **Content tab**: Key takeaways (one per line)
- **Quiz editor**: Embedded quiz builder — create/edit/delete questions with 4 options, correct answer, points, and explanation

### File Upload Progress

Admin API client uses `XMLHttpRequest` (not `fetch`) for all file uploads to report progress percentage in real-time to the `VideoRow`, `DocumentRow`, and image upload components.

---

## 9. Authentication & Security

### User Authentication Flow

```
1. User enters email
         ↓
2. POST /api/auth/send-otp
   → 6-digit code stored in email_otps (10-min expiry)
   → Code emailed (or printed to console in dev)
         ↓
3. User submits registration form + OTP
         ↓
4. POST /api/auth/register
   → OTP validated and marked used
   → Password hashed with bcrypt (cost 12)
   → User created + user_progress row created
   → JWT signed (7d expiry by default)
         ↓
5. JWT stored in localStorage ('wellness_token')
   → Sent as Bearer token on all subsequent requests
```

### JWT Structure

```json
{
  "userId": "uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```
Admin JWT additionally carries `"role": "admin"`.

### Google OAuth Flow

```
1. User clicks "Sign in with Google"
2. Google returns IdToken
3. POST /api/auth/google { idToken }
4. Backend verifies token with google-auth-library
5. Auto-creates user if new (email as name, initials from name)
6. Returns JWT
```

### Password Reset Flow

```
POST /api/auth/forgot-password { email }
→ UUID token stored in password_resets (1h expiry)
→ Email sent with link: APP_URL/reset-password?token=UUID

POST /api/auth/reset-password { token, newPassword }
→ Token validated (not expired, not used)
→ Token marked used, password updated
```

### Security Measures

| Measure | Implementation |
|---------|---------------|
| Password hashing | bcryptjs, cost factor 12 |
| JWT expiry | 7 days (users), 12 hours (admins) |
| Rate limiting | express-rate-limit (global + per-route) |
| Security headers | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Whitelist: FRONTEND_URL + ADMIN_URL only |
| Input validation | Zod schemas on all POST/PATCH routes |
| SQL injection | Parameterised queries (`$1`, `$2`, ...) everywhere |
| XSS prevention | No dangerouslySetInnerHTML; text rendered via React |
| Ownership checks | `requireSelf` middleware, comment ownership check |
| OTP single-use | Marked `usedAt` on consumption |
| Reset token single-use | Marked `usedAt` on consumption |
| File type validation | Multer mimetype filtering per upload endpoint |

---

## 10. File Storage

### Strategy

The storage module (`src/lib/storage.js`) auto-selects based on environment:

```
S3_BUCKET set? → Upload to S3-compatible cloud
         No? → Save to ./uploads/ directory (local fallback)
```

### Supported Providers

Any S3-compatible provider works by setting `S3_ENDPOINT`:

| Provider | S3_ENDPOINT |
|----------|-------------|
| AWS S3 | *(leave blank)* |
| Cloudflare R2 | `https://<account>.r2.cloudflarestorage.com` |
| DigitalOcean Spaces | `https://<region>.digitaloceanspaces.com` |
| MinIO (self-hosted) | `https://minio.yourdomain.com` |

### File Naming

Files are named: `<timestamp>-<sanitized-original-name>`  
e.g., `1751462834512-intro-to-hpv.mp4`

### Limits

| Type | Max Size | Nginx Config |
|------|----------|-------------|
| Videos | 500 MB | `client_max_body_size 500m` |
| Documents | 50 MB | *(covered by 500m) |
| Images | 10 MB | *(covered by 500m)* |

Nginx proxy timeout is set to 300 seconds for large uploads.

---

## 11. Email System

### Configuration

Powered by Nodemailer. Default: Gmail SMTP on port 587 (STARTTLS).

```
Dev mode: SMTP_USER empty → OTP codes printed to console, reset links returned in JSON
Production: SMTP_USER + SMTP_PASS required for real delivery
```

### Email Templates

All emails use inline HTML with dark-background branded designs.

| Template | Trigger | Content |
|----------|---------|---------|
| OTP Code | POST /auth/send-otp | Styled 6-digit code, 10-min expiry warning |
| Password Reset | POST /auth/forgot-password | Reset button + fallback URL, 1-hour warning |
| Quiz Live | Admin: sendLiveEmail flag | Announces new quiz to all active users |
| Announcement | Admin: sendEmail flag | General broadcast with subject and body |

---

## 12. Gamification System

### Point Events

| Event | Points Awarded |
|-------|---------------|
| Daily claim | 25 pts (once per calendar day) |
| Module quiz passed | 50% of quiz total points (e.g., 5 questions × 10 pts → 25 pts) |
| Module completion | `module.pointsValue` (default 100 pts) |
| Biweekly quiz passed | 50% of quiz total points |
| Referral bonus | 50 pts (to referrer when referred user registers) |

### Streak System

- A streak increments when a user claims their daily reward on consecutive days
- `lastClaimDate` stores the last successful claim date
- If today = `lastClaimDate + 1 day` → streak continues
- If today > `lastClaimDate + 1 day` → streak resets to 1
- Dashboard displays streak count and "flame" UI

### Leaderboard

- Computed at query time via JOIN on `user_progress`
- Three periods: all-time (no date filter), week (7 days), month (30 days)
- Top 50 users returned, with current user's rank always included
- Updates reflect immediately after point events

### Referral System

- Each user gets a unique `referralCode` (UUID-based, assigned on registration)
- Shareable referral link
- On referral sign-up: `referrals` row created, 50 pts added to referrer
- One-time bonus per referred user (enforced by `UNIQUE(referredId)`)

---

## 13. Learning Module System

### Module Lifecycle

```
Admin creates module
  → Sets title, category, order, points, locked status
  → Adds chapters (videos with transcripts)
  → Attaches documents
  → Creates quiz with questions
          ↓
Student views /modules
  → Modules returned with per-user lock status
  → First module (orderIndex=0) always unlocked
  → Each subsequent module unlocked only if previous completed
          ↓
Student opens module
  → Navigates to /modules/:id?chapter=N
  → Video progress tracked per-chapter in videoProgress JSONB
  → Progress saved every 30 seconds + on unmount
          ↓
Student completes all chapters (≥80% each)
  → Quiz unlocks
          ↓
Student passes quiz (≥70%)
  → Module marked completed
  → Points awarded
  → Next module unlocked
```

### Chapter Video Progress Tracking

```javascript
// videoProgress JSONB structure in user_module_progress:
{ "0": 85, "1": 100, "2": 42 }
//  chapterIndex: watchedPercent

// Quiz unlock condition:
allVideosWatched = videos.every((_, i) => videoProgress[i] ?? 0 >= 80)
```

### Module Categories

| Category | Description |
|----------|-------------|
| Foundations | Core vaccine/immunity concepts |
| HPV | Human Papillomavirus education |
| MenB | Meningococcal B vaccine |
| Bonus | Extra content and advanced topics |
| General | Campus wellness and general health |

---

## 14. Quiz System

### Module Quizzes

- One quiz per module, auto-created when module is created
- Questions added via admin panel (4 options, correct answer, explanation)
- Passing score: 70% (configurable per quiz)
- 24-hour retake cooldown on failed attempts
- No cooldown on passed quizzes (can retake for review)
- Points awarded on pass: 50% of total possible points

### Biweekly Quiz

- Single global quiz (type = 'biweekly')
- Optional `scheduledAt` timestamp — quiz locked until that date/time
- 14-day cooldown after attempt
- Admins can send email notification when quiz goes live
- Score/pass status returned in API response

### Quiz Grading Algorithm

```javascript
// Grading logic in POST /api/users/:userId/quiz
let score = 0;
let totalPoints = 0;
for (const q of questions) {
  totalPoints += q.points;
  if (answers[q.id] === q.answerIndex) score += q.points;
}
const passed = (score / totalPoints) * 100 >= quiz.passingScore;
const pointsEarned = passed ? Math.round(totalPoints * 0.5) : 0;
```

---

## 15. Deployment & Infrastructure

### Docker Compose Services

```yaml
Services:
  db:       PostgreSQL 16-alpine  │ Port 5432 (internal)
  backend:  Node.js 20-alpine     │ Port 3001 (external)
  frontend: Nginx-alpine          │ Port 80   (external)
  admin:    Nginx-alpine          │ Port 8080 (external)

Volumes:
  postgres_data  → /var/lib/postgresql/data
  uploads_data   → /app/uploads

Networks:
  wellness_net (bridge)
```

### Container Health Checks

| Service | Health Check |
|---------|-------------|
| db | `pg_isready` every 10s, 5 retries |
| backend | HTTP GET /health endpoint |
| frontend | Nginx serves 200 on / |
| admin | Nginx serves 200 on / |

### Multi-Stage Docker Builds

**Frontend & Admin** (identical pattern):
```dockerfile
Stage 1 (builder): node:20-alpine
  → npm install --frozen-lockfile
  → npm run build → /app/dist

Stage 2 (runtime): nginx:alpine
  → COPY dist/ → /usr/share/nginx/html
  → COPY nginx.conf
  → EXPOSE 80/8080
```

**Backend:**
```dockerfile
node:20-alpine
  → npm install --frozen-lockfile
  → EXPOSE 3001
  → HEALTHCHECK HTTP /health
  → CMD ["node", "src/server.js"]
```

### Nginx Configuration

Both frontend and admin Nginx configs handle:
- Gzip compression (text, CSS, JSON, JS)
- Static asset caching (1 year, immutable header)
- SPA routing (`try_files $uri /index.html`)
- `/api/*` reverse proxy to `backend:3001`
- 500 MB `client_max_body_size` for video uploads
- 300-second proxy timeouts

### Production Deployment Steps

```bash
# 1. Clone repository
git clone <repo-url> && cd wellness-app

# 2. Configure environment
cp backend/.env.example .env
# Edit .env with production values

# 3. Build and start all services
docker compose up -d --build

# 4. Verify health
docker compose ps
docker compose logs backend

# 5. (Optional) Configure reverse proxy for SSL
# Point Caddy or Nginx to port 80 (frontend) and 8080 (admin)
# Caddy example:
# app.yourdomain.com { reverse_proxy localhost:80 }
# admin.yourdomain.com { reverse_proxy localhost:8080 }
```

### Scaling Considerations

| Concern | Current Approach | Scale Path |
|---------|-----------------|-----------|
| Database | Single Postgres container | Managed DB (RDS, Supabase, Neon) |
| File storage | Local volume or S3 | Already S3-compatible |
| Sessions | Stateless JWT | Already horizontally scalable |
| Backend | Single container | Multiple replicas behind load balancer |
| Frontend/Admin | Nginx static | CDN distribution |

---

## 16. Environment Configuration

### Complete `.env` Reference

```bash
# ─── Database ──────────────────────────────────────────
POSTGRES_DB=wellness_db
POSTGRES_USER=wellness_user
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgresql://wellness_user:<password>@db:5432/wellness_db
# Set DB_SSL=true if using managed PostgreSQL (e.g. Supabase, RDS)
DB_SSL=false

# ─── Application ───────────────────────────────────────
NODE_ENV=production
PORT=3001
JWT_SECRET=<min-32-char-random-string>
JWT_EXPIRES_IN=7d

# ─── URLs ──────────────────────────────────────────────
FRONTEND_URL=https://app.yourdomain.com
ADMIN_URL=https://admin.yourdomain.com
APP_URL=https://app.yourdomain.com       # used in password-reset emails
VITE_API_URL=https://app.yourdomain.com/api   # build-time (frontend)

# ─── Admin Account (first-run seed only) ───────────────
ADMIN_EMAIL=admin@yourinstitution.edu
ADMIN_PASSWORD=<strong-password>

# ─── Google OAuth ──────────────────────────────────────
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=<same-client-id>  # build-time arg (docker-compose)

# ─── Email (SMTP) ──────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=<app-password>
SMTP_FROM=NJIT Wellness <your@gmail.com>

# ─── Cloud Storage (S3-compatible) ─────────────────────
# Leave blank to use local ./uploads/ fallback
S3_BUCKET=wellness-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_ENDPOINT=                    # blank = AWS, set for R2/DO/MinIO
S3_PUBLIC_URL=https://cdn.yourdomain.com   # public asset base URL

# ─── AI Transcription (optional) ───────────────────────
GROQ_API_KEY=gsk_<key>          # only needed if using transcription API
```

### Build-time vs Runtime Variables

| Variable | When Evaluated | Mechanism |
|----------|---------------|-----------|
| `VITE_GOOGLE_CLIENT_ID` | Docker build time | `docker-compose.yml` build args |
| `VITE_API_URL` | Docker build time | `docker-compose.yml` build args |
| All others | Container runtime | Environment injection |

---

## 17. Data Flow Diagrams

### User Registration

```
Browser                Backend                  Database          Email
   │                      │                        │                │
   │── POST /auth/send-otp ──►                      │                │
   │                      │── INSERT email_otps ──►│                │
   │                      │                        │                │
   │                      │──────────────────────────────── Send OTP email ──►
   │                      │                        │                │
   │◄── { devMode: true / sent: true } ────────────│                │
   │                      │                        │                │
   │── POST /auth/register ──►                      │                │
   │  { email, name, password, otp }               │                │
   │                      │── SELECT email_otps ──►│                │
   │                      │◄── [otp row] ──────────│                │
   │                      │── UPDATE usedAt ───────►               │
   │                      │── INSERT users ────────►               │
   │                      │── INSERT user_progress ►               │
   │                      │── UPDATE usedAt ───────►               │
   │◄── { token: "jwt..." } ────────────────────────│                │
```

### Module Watch & Progress Save

```
Browser                      Backend                  Database
   │                            │                        │
   │── GET /api/modules ────────►                         │
   │                            │── PER_USER_MODULES_QUERY (with lock status) ──►
   │◄── [ modules with userProgress ] ────────────────────│
   │                            │                        │
   │── GET /api/modules/:id ────►                         │
   │◄── { module + userProgress + videos[] } ─────────────│
   │                            │                        │
   │  [User watches video, timer fires every 30s]        │
   │                            │                        │
   │── PATCH /api/users/:id/module-progress/:moduleId ──►│
   │  { watchedPercent: 72,     │                        │
   │    videoProgress: {"0":72}}│── UPSERT user_module_progress ──►
   │◄── { success: true } ──────│                        │
   │                            │                        │
   │  [User hits 80%]           │                        │
   │── POST /api/users/:id/quiz ►                         │
   │  { quizId, answers }       │── Grade answers ───────│
   │                            │── INSERT quiz_attempts ►│
   │                            │── UPDATE user_progress (points) ──►
   │                            │── UPDATE user_module_progress (completed, quizPassed) ──►
   │◄── { passed, score, pointsEarned } ──────────────────│
```

### Admin Module Save (with Transcript)

```
Admin Browser                  Backend                     Database
      │                           │                            │
      │── POST /api/admin/videos/upload ──►                    │
      │  (multipart/form-data)    │── S3 PutObject / local write
      │◄── { url: "https://..." } │                            │
      │                           │                            │
      │  [Fills transcript JSON]  │                            │
      │                           │                            │
      │── PATCH /api/admin/modules/:id ──►                     │
      │  { videos: [             │                            │
      │    { id, title, url,     │                            │
      │      transcript: [       │── Zod validates videoItemSchema
      │        {time,text}...]}] │   (transcript field included)
      │  }                        │── JSON.stringify(videos)   │
      │                           │── UPDATE modules SET videos=$1 ──►
      │◄── { module } ────────────│                            │
```

---

## Appendix A: API Error Codes

| HTTP Status | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Invalid Zod schema, invalid OTP |
| 401 | Unauthorized | Missing/expired JWT |
| 403 | Forbidden | `requireSelf` violation, not comment owner |
| 404 | Not Found | Module/user/quiz not found |
| 409 | Conflict | Duplicate email on registration |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database error, unhandled exception |

---

## Appendix B: Local Development Setup

```bash
# Prerequisites: Node.js 20+, PostgreSQL 16

# 1. Backend
cd backend
cp .env.example .env        # configure DATABASE_URL
npm install
npm run dev                 # starts on :3001, auto-migrates DB

# 2. Frontend
cd ..
npm install
npm run dev                 # starts on :5173

# 3. Admin Panel
cd admin
npm install
npm run dev                 # starts on :8080

# All three must run simultaneously for full functionality
```

---

## Appendix C: Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Raw SQL over ORM | Full control over JSONB queries, no abstraction overhead |
| JSONB for videos/documents | Flexible schema evolution without ALTER TABLE migrations |
| Stateless JWT | Horizontal scalability, no session store needed |
| Per-video transcript in JSONB | No schema change needed for multi-chapter transcripts |
| Separate admin_users table | Security isolation between student and admin auth |
| S3 fallback to local uploads | Enables development without cloud credentials |
| Module lock computed at query time | Always consistent with latest user progress |
| React 19 + Vite (rolldown) | Fastest build times; React 19 concurrent features |
| Docker Compose for all services | Single-command deployment on any VPS |
