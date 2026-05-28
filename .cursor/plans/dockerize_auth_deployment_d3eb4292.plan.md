---
name: Dockerize auth deployment
overview: Make the app deployable with Docker by adding container artifacts, introducing env-over-config runtime settings (especially DB URL), and documenting a production PostgreSQL compose workflow.
todos:
  - id: config-overrides
    content: Implement env-var override loader in app.py with env > config.json precedence
    status: completed
  - id: dockerfile
    content: Create separate backend/frontend Dockerfiles (python backend + node/nginx frontend)
    status: completed
  - id: compose
    content: Add docker-compose.yml with app + postgres, healthcheck, volume, and env wiring
    status: completed
  - id: env-example
    content: Create .env.example listing useful variables with defaults/examples
    status: completed
  - id: dockerignore
    content: Create root .dockerignore suitable for backend/frontend docker builds
    status: completed
  - id: readme-docker
    content: Document full Docker deployment and initialization workflow in README
    status: completed
  - id: validation
    content: Run smoke validation for startup, DB connectivity, and static frontend serving
    status: completed
isProject: false
---

# Docker Deployment Plan

## Scope and Decisions
- Frontend target: use React/Vite build from [`/home/kelvin/IdeaProjects/auth/frontend`]( /home/kelvin/IdeaProjects/auth/frontend ).
- Backend runtime image base: `python:3.11-slim` (backend only).
- Frontend container images: `node:20-alpine` (build stage) and `nginx:alpine` (runtime stage).
- Use more than one Dockerfile: backend and frontend are built/deployed as separate services.
- Do not copy frontend source or built frontend assets into backend container.
- Backend config file copy rule: if `config.prod.json` exists in build context, copy it into image as `config.json`; otherwise copy `config.json`.
- `config.prod.json` policy: include in `.gitignore`, but do not ignore it in `.dockerignore` (backend build needs access).
- Frontend should support optional subpath deployment (e.g. `/id/`) in addition to root deployment (`/`).
- Configuration precedence: environment variables override `config.json` values.

## Current Wiring to Update
- Backend currently loads config only from JSON in [`/home/kelvin/IdeaProjects/auth/app.py`]( /home/kelvin/IdeaProjects/auth/app.py ):

```91:93:/home/kelvin/IdeaProjects/auth/app.py
with open('config.json') as _f_cfg:
    app.config.from_mapping(json.load(_f_cfg))
```

- Existing settings template is [`/home/kelvin/IdeaProjects/auth/config.example.json`]( /home/kelvin/IdeaProjects/auth/config.example.json ).
- Deployment docs are in [`/home/kelvin/IdeaProjects/auth/README.md`]( /home/kelvin/IdeaProjects/auth/README.md ).

## Reference Dockerfiles to Reuse
- [`/home/kelvin/IdeaProjects/kwjw/kwjw_dc/backend/Dockerfile.base`]( /home/kelvin/IdeaProjects/kwjw/kwjw_dc/backend/Dockerfile.base ): backend base-image pattern with apt/pip mirror setup and optional pip cache/index args.
- [`/home/kelvin/IdeaProjects/kwjw/kwjw_dc/backend/Dockerfile`]( /home/kelvin/IdeaProjects/kwjw/kwjw_dc/backend/Dockerfile ): backend runtime pattern (entrypoint + gunicorn command conventions + healthcheck style).
- [`/home/kelvin/IdeaProjects/kwjw/kwjw_dc/frontend/Dockerfile`]( /home/kelvin/IdeaProjects/kwjw/kwjw_dc/frontend/Dockerfile ): frontend multi-stage pattern using `node:20-alpine` build, `nginx:alpine` runtime, npm mirror, and optional `npm_cache`.

## Implementation Steps
1. **Add env-override config loader in backend**
   - Update [`/home/kelvin/IdeaProjects/auth/app.py`]( /home/kelvin/IdeaProjects/auth/app.py ) to:
     - load `config.json` first,
     - apply selected env vars afterward (higher priority), including nested keys where useful.
   - Start with critical variables for containerized deployment:
     - `SECRET_KEY`
     - `SQLALCHEMY_DATABASE_URI` (plus optional alias `DB_URL`)
     - `SITE_ROOT_URL`, `SITE_BASE_URL`, `SITE_BEHIND_PROXY`
     - `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
     - `MAIL_FROM`, `MAIL_DISPLAY_NAME`, `MAIL_REPLY_TO`, `MAIL_REPLY_TO_NAME`
     - `UPLOAD_ROOT_FOLDER`
     - `FLASK_ENV`/`FLASK_DEBUG` (if used)
   - Keep defaults from `config.json` when env vars are absent.

2. **Create backend Dockerfile (`python:3.11-slim`)**
   - Add [`/home/kelvin/IdeaProjects/auth/Dockerfile`]( /home/kelvin/IdeaProjects/auth/Dockerfile ) for backend API runtime:
     - Base image `python:3.11-slim`.
     - Reuse mirror/cache ideas from reference backend Dockerfile:
       - optional Debian apt mirror switch for faster/regional builds,
       - pip mirror setup before dependency installation,
       - optional build args for pip offline cache/index overrides.
     - Install Python deps from [`/home/kelvin/IdeaProjects/auth/requirements.txt`]( /home/kelvin/IdeaProjects/auth/requirements.txt ).
     - Copy backend source and runtime-required directories.
     - Implement conditional config copy at build time: prefer `config.prod.json` as image `config.json`, fallback to source `config.json`.
     - Explicitly exclude frontend directories/artifacts from backend image content.
     - Run with gunicorn binding `0.0.0.0:8077` and expose `8077`.
   - Add sensible runtime environment defaults (`PYTHONUNBUFFERED=1`, `PYTHONDONTWRITEBYTECODE=1`).

3. **Create frontend Dockerfile (Node build + Nginx serve)**
   - Add [`/home/kelvin/IdeaProjects/auth/frontend/Dockerfile`]( /home/kelvin/IdeaProjects/auth/frontend/Dockerfile ) with:
     - Build stage from `node:20-alpine` to run `npm ci` and `npm run build`.
     - Reuse mirror/cache ideas from reference frontend Dockerfile:
       - optional Alpine mirror switch,
       - npm registry mirror config,
       - optional local `npm_cache` bootstrap for offline/air-gapped build acceleration.
     - Build arg/env for Vite base path (default `/`, optional `/id/`) so generated asset URLs work under subpath.
     - Runtime stage from `nginx:alpine` serving built assets.
     - Nginx config for SPA fallback routing and reverse-proxying `/api`, `/oauth`, and `/upload` to backend service.
     - Nginx routing that supports both root and configurable subpath frontend mount (including trailing-slash and deep-link handling).
     - Expose frontend HTTP port (e.g. `80`).

4. **Add production docker-compose example (PostgreSQL)**
   - Add [`/home/kelvin/IdeaProjects/auth/docker-compose.yml`]( /home/kelvin/IdeaProjects/auth/docker-compose.yml ) with:
     - `backend` service built from root `Dockerfile`.
     - `frontend` service built from [`/home/kelvin/IdeaProjects/auth/frontend/Dockerfile`]( /home/kelvin/IdeaProjects/auth/frontend/Dockerfile ).
     - `db` service using `postgres:15`.
     - `depends_on` + healthcheck for DB readiness.
     - Persistent DB volume.
     - `env_file: .env` for app/db settings.
     - Port mapping for frontend (`80` or mapped host port), backend (optional internal-only), and optional DB exposure.
     - Build arg/env passthrough for frontend base path/subpath setting.
   - Configure backend DB URL via env to point to compose hostname (e.g. `postgresql://...@db:5432/...`).

5. **Provide `.env.example` for deployment variables**
   - Add [`/home/kelvin/IdeaProjects/auth/.env.example`]( /home/kelvin/IdeaProjects/auth/.env.example ) including all useful vars and explicit defaults/examples.
   - Group variables by concern:
     - backend runtime (`BACKEND_PORT`, gunicorn workers/class)
     - frontend runtime (`FRONTEND_PORT`, backend upstream host/port if templated, `FRONTEND_BASE_PATH`)
     - security (`SECRET_KEY`)
     - database (`POSTGRES_*`, `SQLALCHEMY_DATABASE_URI`/`DB_URL`)
     - site/mail/admin/upload overrides.
   - Ensure README clearly states precedence: env > config.json.

6. **Create `.dockerignore` for efficient/safe build contexts**
   - Add [`/home/kelvin/IdeaProjects/auth/.dockerignore`]( /home/kelvin/IdeaProjects/auth/.dockerignore ) with exclusions for:
     - VCS/editor artifacts (`.git`, `.idea`, `.cursor`, temp files),
     - Python caches/venvs (`__pycache__`, `.pytest_cache`, `.mypy_cache`, virtual env folders),
     - Node artifacts (`node_modules`, frontend cache directories),
     - local runtime data/secrets (`.env`, `config.json`, logs, DB files, uploads),
     - build outputs not required as Docker build inputs.
   - Keep `config.prod.json` available in build context so backend conditional copy can use it when provided.
   - Keep files needed for frontend Docker build (`frontend/package*.json`, source, and lock files) included.

7. **Document Docker deployment in README**
   - Update [`/home/kelvin/IdeaProjects/auth/README.md`]( /home/kelvin/IdeaProjects/auth/README.md ) to add a Docker section with:
     - prerequisites,
     - copy `.env.example` to `.env` and required edits,
     - build/start commands (`docker compose up -d --build`),
     - root vs subpath deployment examples (including setting `FRONTEND_BASE_PATH=/id/`),
     - first-time DB init steps inside container (`flask create-db`, `flask init-db`),
     - stop/logs/update commands,
     - note on persistent volumes and frontend nginx reverse-proxy layout.

8. **Validation pass**
   - Verify backend starts with env overrides applied (especially DB URL override behavior).
   - Verify frontend nginx serves SPA and proxies API routes to backend service.
   - Verify subpath deployment behavior (e.g. `/id/` loads app and deep links resolve).
   - Verify backend can connect to PostgreSQL.
   - Smoke check key auth endpoints and admin initialization path.

## Deliverables
- New: [`/home/kelvin/IdeaProjects/auth/Dockerfile`]( /home/kelvin/IdeaProjects/auth/Dockerfile )
- New: [`/home/kelvin/IdeaProjects/auth/frontend/Dockerfile`]( /home/kelvin/IdeaProjects/auth/frontend/Dockerfile )
- New: [`/home/kelvin/IdeaProjects/auth/docker-compose.yml`]( /home/kelvin/IdeaProjects/auth/docker-compose.yml )
- New: [`/home/kelvin/IdeaProjects/auth/.env.example`]( /home/kelvin/IdeaProjects/auth/.env.example )
- New: [`/home/kelvin/IdeaProjects/auth/.dockerignore`]( /home/kelvin/IdeaProjects/auth/.dockerignore )
- Updated: [`/home/kelvin/IdeaProjects/auth/app.py`]( /home/kelvin/IdeaProjects/auth/app.py )
- Updated: [`/home/kelvin/IdeaProjects/auth/README.md`]( /home/kelvin/IdeaProjects/auth/README.md )