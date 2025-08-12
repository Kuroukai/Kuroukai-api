# Kuroukai Free API v2.0

## Overview (Internal)

This repository is for Kuroukai team use only. It provides a minimal API to generate and validate temporary access keys using SQLite, plus a simple admin area with in-memory sessions for development.

## Architecture

```
src/
├── app.js                 # Express app bootstrap
├── config/
│   ├── index.js          # Env/config aggregator
│   └── database.js       # SQLite connection + schema
├── controllers/
│   ├── keyController.js  # Key endpoints
│   ├── appController.js  # Health, root, test page
│   └── adminController.js# Admin HTML + stats
├── middleware/
│   ├── validation.js     # Input validation
│   ├── errorHandler.js   # Error and request logging
│   └── adminAuth.js      # Simple in-memory session auth
├── services/
│   └── keyService.js     # Key business logic
├── routes/
│   ├── keyRoutes.js      # /api/keys/*
│   ├── appRoutes.js      # /, /health, /test, /bind
│   └── adminRoutes.js    # /admin/*
└── utils/
    ├── keyUtils.js       # Key helpers
    └── logger.js         # Logger
```

## Environment (Team setup)

Copy and set variables locally:

```powershell
Copy-Item .env.example .env
```

Key variables (see .env.example for details):
- PORT: Server port (default 3000)
- NODE_ENV: development|production
- DATABASE_PATH: Path to SQLite DB file
- CORS_ORIGIN: Allowed origin (avoid '*' when using credentials)
- CORS_CREDENTIALS: true|false to include cookies/headers in CORS
- RATE_LIMIT_WINDOW / RATE_LIMIT_MAX: Basic rate limiting
- DEFAULT_KEY_HOURS / MAX_KEY_HOURS: Key validity control
- LOG_LEVEL: error|warn|info|debug
- ADMIN_DEFAULT_PASSWORD / ADMIN_TEMP_PASSWORD: In-memory admin auth

## API

- POST /api/keys/create — Create new access key
- GET /api/keys/validate/:keyId — Validate a key
- GET /api/keys/info/:keyId — Get key information
- GET /api/keys/user/:userId — List keys for a user
- DELETE /api/keys/:keyId — Delete a key
- GET /bind/:keyId.js — Safe JS response for binding/validation
- GET /test/:keyId — Minimal test page that loads the JS
- GET /health — Health check

## Admin (dev only)

- GET /admin/login — Simple login page (in-memory session)
- POST /admin/auth/login — Login
- POST /admin/auth/logout — Logout
- GET /admin/ — Admin dashboard (base path requires trailing slash)
- GET /admin/api/stats — Basic stats
- GET /admin/api/session — Current session info
- GET /admin/api/sessions — List sessions
- DELETE /admin/api/sessions — Clear sessions

## Run

- Development (nodemon):
```powershell
npm run dev
```
- Production:
```powershell
npm start
```

## Deploy (Vercel)

This repo is configured to deploy to Vercel as:
- Serverless function for the API at `api/index.js` (wraps the Express app)
- Static admin dashboard built to `dashboard/dist` and served under `/admin/`

Steps:
1. Ensure environment variables are set in Vercel Project Settings (PORT optional, ADMIN_PASSWORD, etc.)
2. Push to GitHub and import the repo in Vercel
3. Vercel will run `npm run build` at the repo root, which builds the dashboard
4. Rewrites in `vercel.json` route:
    - `/admin` -> `/admin/` (trailing slash)
    - `/admin/assets/*` -> static assets from `dashboard/dist`
    - `/admin/*` -> `dashboard/dist/index.html`
    - `/api/*`, `/admin/api/*`, `/admin/auth/*` -> serverless API
    - All other routes -> serverless API

Local build test:
```powershell
npm run build
```

---

> Project by [Kuroukai](https://github.com/Kuroukai)

## Internal notes

- Do not expose this service publicly without proper hardening.
- Do not commit database files; .gitignore excludes *.db.
- When CORS_CREDENTIALS=true, always set CORS_ORIGIN to a specific trusted origin (never '*').
- Rotate admin passwords for shared environments or replace the in-memory auth.


