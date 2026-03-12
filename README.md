# S Management

Full-stack management platform for:
- Admin authentication and profile management
- Items and collections CRUD
- Mills, quantities, and design numbers CRUD
- Activity logs and analytics
- Data export (JSON / CSV)
- Assistant-enabled admin actions
- User login and profile/password management

## Tech Stack

- Frontend: React + Vite + React Router + TanStack Query + Tailwind CSS
- Backend: Node.js + Express + MongoDB (Mongoose)
- Deployment: Vercel (static frontend + serverless API)

## Project Structure

- `client/` React frontend
- `server/` Express backend (models, routes, middleware)
- `api/index.js` Vercel serverless API entrypoint
- `vercel.json` Vercel routing/build config

## Local Setup

1. Install dependencies:

```bash
npm install
```

Or manually:

```bash
npm run install:all
```

2. Configure environment files:

- Copy `server/.env.example` to `server/.env`
- Copy `client/.env.example` to `client/.env` (optional)

3. Start both frontend + backend:

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/health`

## Environment Variables

### Server (`server/.env`)

Required:
- `MONGO_URI`
- `JWT_SECRET`

Important:
- `COOKIE_NAME` (default: `s_management_token`)
- `CLIENT_ORIGIN` (comma-separated allowed origins)
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` (bootstrap admin credentials)
- `DEFAULT_USER_EMAIL`, `DEFAULT_USER_PASSWORD` (bootstrap user credentials)
- `GEMINI_API_KEY` (required for assistant AI features)

Default credential fallbacks (if env vars are not set):
- Admin: `SuperAdmin` / `Admin@1234`
- User: `joshiyrj@gmail.com` / `Admin@1234`

### Client (`client/.env`)

Optional:
- `VITE_API_BASE_URL`
  - Leave empty for same-origin API (recommended for Vercel)
  - Local dev uses Vite proxy to backend
- `VITE_ASSISTANT_NATIVE_VOICE`

## Scripts

Root:
- `npm run dev` start backend + frontend together
- `npm run build` build frontend
- `npm run start` start backend
- `npm run seed` seed collections/items/admin

Subprojects:
- `npm --prefix client run lint`
- `npm --prefix client run build`
- `npm --prefix server run start`

## Vercel Deployment

1. Push this repository to GitHub.
2. Import the repo into Vercel.
3. Set environment variables in Vercel Project Settings (all required server vars, plus optional client vars).
4. Deploy.

This repo includes:
- `api/index.js` for backend API function
- `vercel.json` rewrites:
  - `/api/*` -> backend function
  - `/health` -> backend function
  - all other routes -> frontend `index.html`

## Security Notes

- `server/.env` is ignored by git.
- Do not commit real secrets.
- Set strong production values for `JWT_SECRET` and `ADMIN_PASSWORD`.

## Quality Status

- Frontend lint passes.
- Frontend production build passes.
- Backend app initializes successfully with shared `createApp()` for local + Vercel runtimes.
