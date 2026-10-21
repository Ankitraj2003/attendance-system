# Hosted deployment: Neon + Render + Vercel

The app already uses FastAPI, SQLAlchemy 2, and Psycopg 3. It does not need a Node.js database driver or a new database abstraction. Configure the existing backend with Neon's pooled PostgreSQL URL and keep database access exclusively on the backend.

## Neon

The existing project is `attendance-db` and branch `production`. Use the Neon Console to reset the database role password because a prior connection string was shared in chat. Configure the Render service's `DATABASE_URL` with the replacement **pooled** connection string (host contains `-pooler`). Do not commit it to GitHub or add it to Vercel; the browser frontend must never receive database credentials.

The FastAPI app creates SQLAlchemy model tables on startup and initializes the production administrator only when `INITIAL_ADMIN_PASSWORD` is set. It intentionally does not add demo employee/attendance data in production. For future schema changes, manage migrations as versioned migration files and test them on a Neon branch before production.

The app itself is Python/SQLAlchemy, so the runtime connects with Psycopg 3 through `DATABASE_URL`; it does not use a JavaScript database driver. Neon's current CLI can still manage the existing project and pull connection variables into a local env file. From the repository root, the requested CLI setup is:

```powershell
npm i -g neon@latest
# If the global install fails, use npx neon@latest for the following commands.
neon init -y --org-id org-weathered-fog-15264694 --project-id fragrant-rice-79052333 --branch production --services postgres
neon deploy
```

These commands require an authenticated Neon CLI session. If sign-in is requested, finish it in the browser; if the sign-in times out or fails, run `neon login` and retry. The Neon CLI config is provisioning/developer tooling; the FastAPI backend still reads `DATABASE_URL` from its environment. Do not commit `.env` or `.env.local`. Neon's `postgres` service is the existing Postgres capability, not a Node database driver dependency for this Python application.

## Render backend

Apply `render.yaml` as a Blueprint, or create a Python Web Service from this repository with root directory `backend`.

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/api/health`
- Environment: `ENVIRONMENT=production`, `DATABASE_URL` (new pooled Neon URL), `SECRET_KEY` (random, at least 32 characters), `INITIAL_ADMIN_PASSWORD` (unique strong password), `INITIAL_ADMIN_USERNAME=admin`, `INITIAL_ADMIN_EMAIL`, `COMPANY_NAME=Expandit`, `COMPANY_TIMEZONE=Asia/Kolkata`, and `ALLOWED_ORIGINS` (exact Vercel production URL; comma-separate additional trusted origins if needed).

After deployment, confirm `https://<your-render-service>.onrender.com/api/health` returns HTTP 200 with `status=healthy` and `database=connected`.

**Important file persistence note:** Render free web services have an ephemeral filesystem. Leave-document uploads stored under `backend/storage/uploads` will not survive instance replacement/redeployments. Before using real employee documents in production, move uploads to persistent object storage or a service with a persistent disk and access controls. Do not treat the database alone as a backup of those files.

## Vercel frontend

Import `Ankitraj2003/attendance-system` into Vercel and set **Root Directory** to `frontend` and framework preset to **Vite**. Add build-time environment variable:

- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`

Set it for Production and Preview as appropriate, then redeploy the frontend after changing this variable. The value is public (it is embedded in browser code), so it must contain only the API URL, never a database password or signing secret.

After Vercel issues the exact production domain, set Render's `ALLOWED_ORIGINS` to that origin, such as `https://<your-project>.vercel.app` (no path or trailing slash). If you use a custom domain, add that origin as well.

## Initial production admin and verification

1. Set a strong, unique `INITIAL_ADMIN_PASSWORD` in Render before the first deployment.
2. Production startup creates the admin only if the configured username is absent. It never resets an existing admin password and does not seed fake employee records or attendance history.
3. Verify the Render health endpoint, then open the Vercel site and test administrator login, employee portal lookup, check-in/check-out, leave submission, and report export against the hosted backend.
4. The health endpoint validates database connectivity but is not a substitute for those authenticated end-to-end checks.

## Local frontend build

From the repository root:

```powershell
cd frontend
npm ci
npm run build
```

## Credential safety

- Rotate the Neon role password because the previous connection URI was disclosed in chat.
- Never commit `.env` or deployment secrets.
- Change any default administrator password immediately if a development database has previously been seeded.
