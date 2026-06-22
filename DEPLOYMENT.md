[English](DEPLOYMENT.md) | [中文](DEPLOYMENT.zh.md)

# Deployment Guide

Production deployment of Identity using Docker Compose (recommended) or a host install without containers.

**Two paths:**

| Path | When |
|------|------|
| **Docker Compose** | Recommended — Python, Node, PostgreSQL, Redis, and CAPTCHA are in the stack |
| **Host install** | Single-server install; see [DEVELOPMENT.md](DEVELOPMENT.md#host-install) |

---

## Architecture

```text
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  frontend   │────▶│   backend   │────▶│  postgres    │
│  (nginx)    │     │  (gunicorn) │     │  (db)        │
└──────┬──────┘     └──────┬──────┘     └──────────────┘
       │                   │
       │            ┌──────┴──────┐
       └───────────▶│  recaptcha  │──▶ redis
                    └─────────────┘
```

- **frontend:** React build + nginx; proxies `/api/` to backend and `/api/captcha/` to recaptcha
- **backend:** Flask API, OAuth, Alembic migrations and admin seed on startup (idempotent)
- **recaptcha:** Image CAPTCHA microservice ([`recaptcha/`](recaptcha/))
- **db / redis:** PostgreSQL 15 and Redis 7

---

## Docker Compose

Full guide for production-style deployment. Nothing to install on the host beyond Docker.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Copy and edit config before the first build (see below)

### 1. Config files

Both files are **optional for a local trial** — compose defaults plus baked-in `config.example.json` are enough. Copy them for production or custom settings:

```bash
cp .env.example .env                # recommended for production
cp config.example.json config.json  # optional; for settings beyond .env overrides
```

Without `.env`, compose uses inline defaults (e.g. DB password `change_me`) and the backend falls back to values in `config.example.json`. With `.env`, those variables override `config.json` at runtime. At minimum set in `.env` for deployment:

| Variable | Purpose |
| -------- | ------- |
| `SECRET_KEY` | Flask session signing |
| `POSTGRES_PASSWORD` | Database password |
| `SQLALCHEMY_DATABASE_URI` | Backend DB URL — user, password, and db name must match `POSTGRES_*` |
| `ADMIN_PASSWORD` | Password for **first** admin seed only (`init-db` is idempotent — use `flask reset-admin-password` to change an existing admin) |
| `SITE_ROOT_URL` | Public URL users open in the browser (e.g. `http://localhost:8080`) |
| `SITE_BEHIND_PROXY` | `true` when nginx (or similar) sits in front of the backend — see [Advanced config](#advanced-config) |
| `CAPTCHA_SECRET` | Shared secret between backend and recaptcha service (change in production) |
| `CAPTCHA_ENABLED` | `true` / `false` — login image CAPTCHA after a failed attempt (default `true` in compose) |
| `RUN_MIGRATIONS` | Apply Alembic on backend start (default `true`; set `false` for separate migrate job) |
| `RUN_INIT_DB` | Seed admin on backend start (default `true`; idempotent) |

See [.env.example](.env.example) for all options. Environment variables override `config.json` at runtime.

### 2. GeoLite databases (optional)

For geo IP features, download databases before building the backend image (they are copied in at build time):

```bash
./scripts/download-mmdb.sh
```

Skip this for a minimal trial — the app runs without geo IP.

### 3. Build and start

```bash
docker compose up -d --build
```

### 4. Open the app

[http://localhost:8080/](http://localhost:8080/) (or the port in `FRONTEND_PORT` / `.env`).

Migrations and admin seed run automatically when the backend starts. To run them manually: `docker compose exec backend flask create-db` and `docker compose exec backend flask init-db`.

The stack includes **redis** and **recaptcha** in addition to `db`, `backend`, and `frontend`. The frontend nginx container proxies `/api/captcha/` to recaptcha; the backend verifies challenges over the internal Docker network only.

**Logs:** `docker compose logs -f frontend backend recaptcha redis db`  
**Stop:** `docker compose down`

### OAuth client bootstrap (optional)

For integration tests or local development, seed a single OAuth client automatically instead of creating it in the admin console. Set these variables in `.env` (see [.env.example](.env.example)):

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `OAUTH_CLIENT_NAME` | yes | Client name (3–16 word characters) |
| `OAUTH_CLIENT_REDIRECT_URL` | yes | OAuth callback URL |
| `OAUTH_CLIENT_HOME_URL` | yes | App home URL (callback must start with this) |
| `OAUTH_CLIENT_SECRET` | no | Fixed secret for tests; auto-generated if omitted |
| `OAUTH_CLIENT_DESCRIPTION` | no | Description shown in the app list |
| `OAUTH_CLIENT_IS_PUBLIC` | no | `true` / `false` (default `true`) |

Example:

```bash
OAUTH_CLIENT_NAME=testapp
OAUTH_CLIENT_SECRET=integration-test-secret
OAUTH_CLIENT_REDIRECT_URL=http://localhost:3000/oauth/callback
OAUTH_CLIENT_HOME_URL=http://localhost:3000
OAUTH_CLIENT_DESCRIPTION=Integration test OAuth client
OAUTH_CLIENT_IS_PUBLIC=true
```

The backend container runs import on each start when `OAUTH_CLIENT_NAME` is set. Import is **idempotent** — existing clients with the same name are skipped.

You can also import manually:

```bash
docker compose exec backend flask import-oauth-client-from-env
```

**Multiple clients from a file.** For more than one client, use the CLI with a JSON array (see [oauth-clients.example.json](oauth-clients.example.json)):

```bash
docker compose exec backend flask import-oauth-clients /path/to/oauth-clients.json
```

Set `OAUTH_CLIENTS_FILE` in the container and place the file there (e.g. via a custom volume) to import from file on startup instead of env vars.

### Advanced config

Optional settings beyond the minimal trial. Some use `.env`; others require `config.json` (not overridable via environment variables).

**Subpath (e.g. `/id/`).** In `.env` set `FRONTEND_BASE_PATH=/id/`, `SITE_BASE_URL=/id/`, and `SITE_ROOT_URL` accordingly. Set these before building the frontend image; after changes run `docker compose up -d --build frontend`.

**Reverse proxy (`SITE.behind_proxy`).** Set `SITE_BEHIND_PROXY=true` in `.env` when the backend is reached through nginx or another reverse proxy (Docker Compose default). Identity then reads the client IP from `X-Real-IP`, then the first hop in `X-Forwarded-For`, instead of the proxy's own address — used for login records, geo region detection, and IP check. The compose **frontend** nginx preserves an incoming `X-Real-IP` from an outer proxy and forwards it to the backend.

If you also run an **external nginx** in front of the compose frontend (common in production), that outer proxy must pass the real client address, for example:

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Without those headers, login records will show the outer proxy or Docker network address. For host install with direct `flask run` and no proxy in front, set `SITE_BEHIND_PROXY=false`.

**Outbound email.** Disabled by default in `config.example.json` (`MAIL.enabled: false`). For production, set `MAIL_ENABLED=true` in `.env` and configure SMTP. The backend image includes **msmtp**; when `MAIL_SMTP_HOST` is set, the container writes msmtp config at startup and sends mail through your relay:

```bash
MAIL_ENABLED=true
MAIL_FROM=noreply@example.com
MAIL_SMTP_HOST=smtp.example.com
MAIL_SMTP_PORT=587
MAIL_SMTP_USER=your-user
MAIL_SMTP_PASSWORD=your-password
```

Optional: `MAIL_SMTP_TLS`, `MAIL_SMTP_STARTTLS`, and `MAIL_SMTP_AUTH` (each `on` or `off`; defaults `on`). Rebuild the frontend when toggling `MAIL_ENABLED` so registration and admin send-email UI stay in sync. For development without SMTP, see [Mail debugging](DEVELOPMENT.md#mail-debugging) in the development guide.

**External Kerberos authentication** — add to `config.json`. Requires the `kerberos` Python package and system libraries (`libkrb5-dev`, `krb5-config`). Not included in the default Docker image; use host install or extend the Dockerfile.

```json
"EXTERNAL_AUTH_PROVIDERS": [
  {
    "id": "provider",
    "name": "Provider Name",
    "type": "kerberos",
    "endpoint_url": "krbtgt/EXAMPLE.COM",
    "default_realm": "EXAMPLE.COM",
    "update_password_url": "example.com/change-pass",
    "reset_password_url": "example.com/reset-pass"
  }
]
```

**External user info sources** — add to `config.json`. Optional admin-only lookup: on a user's edit page, admins can **Load external info** to query external directory services. This does not affect login (`EXTERNAL_AUTH_PROVIDERS` is separate).

The only supported source type today is `pwd_agent` — a small HTTP service (not shipped with Identity) that exposes passwd-style account records. Identity calls:

```http
GET http://<host>:<port>/api?names=<username>
```

Expects JSON shaped like `{ "<username>": { ... } }`. The response is shown in the admin UI as raw JSON; connection or lookup errors are surfaced there too.

```json
"EXTERNAL_USER_INFO": [
  {
    "id": "local_pwd_agent",
    "name": "Local pwd agent",
    "type": "pwd_agent",
    "host": "localhost",
    "port": 6391
  }
]
```

Run the pwd agent where Identity can reach it (`host` / `port`). Multiple entries are allowed — each is queried and listed separately.

**Registration rules** — add to `config.json`. Controls **self-service** sign-up (`POST /api/account/register`). Admin invite is unaffected.

If `ACCOUNT_REGISTER` is omitted or `null`, registration is disabled. The same applies when it is present but `free_register` is false and `email_domain_register` is empty — the default in `config.example.json`. Set `free_register` to true and/or add domain rules to allow sign-up.

```json
"ACCOUNT_REGISTER": {
  "free_register": false,
  "email_domain_register": [
    {
      "accept_domains": ["mails.example.edu"],
      "add_to_groups": ["student"]
    }
  ]
}
```

When `free_register` is true, any email domain may register. When false, only addresses matching an `accept_domains` entry are allowed; matching users are added to the listed `add_to_groups`.

**IP check** — add to `config.json`. Optional integration with an external IP authorization service (a private project, not shipped with Identity). When configured, the logged-in home page calls `{url}/api/auth-check-ip` with the user's IP and `AuthSecretKey: {secret}`. The service should return `{ "check_pass": true/false, "guarded_ports": [ ... ] }`. If the check fails, OAuth app tiles whose `home_url` uses a port in `guarded_ports` are marked as blocked for the current network.

```json
"IP_CHECK": {
  "url": "http://127.0.0.1:6373",
  "secret": "secretSECRET"
}
```

Leave `IP_CHECK` empty (`{}`) or omit it to disable. Identity backend must be able to reach `url`.

**Login CAPTCHA (recaptcha service).** Optional image challenge on sign-in when `CAPTCHA.enabled` is true (default in `config.example.json`). After at least one failed login for the same user or client IP within 15 minutes, the login form loads a 4-digit code; the backend checks it before accepting the password. Configure in `config.json` and/or `.env`:

```json
"CAPTCHA": {
  "enabled": true,
  "service_url": "http://recaptcha:8090",
  "secret": "change_me",
  "ttl_seconds": 120
}
```

| Variable / setting | Purpose |
| ------------------ | ------- |
| `CAPTCHA_ENABLED` | Enable or disable the feature (`config.json` → `CAPTCHA.enabled`) |
| `CAPTCHA_SERVICE_URL` | Backend → recaptcha base URL (`http://recaptcha:8090` in Compose) |
| `CAPTCHA_SECRET` | Must match recaptcha container; used for internal verify only |
| `CAPTCHA_TTL_SECONDS` | Challenge lifetime in Redis (recaptcha service) |
| `CAPTCHA_PORT` | Recaptcha listen port (default `8090`) |

The recaptcha service is built from [`recaptcha/`](recaptcha/) (Flask + Redis + Pillow). Its **verify** endpoint is not exposed through nginx; only challenge creation and image fetch are public at `/api/captcha/v1/…`. For local frontend development, see [DEVELOPMENT.md](DEVELOPMENT.md#frontend-development-local).

### After you change settings

- Runtime backend values in `.env` (including mail SMTP and `CAPTCHA_*`) — restart: `docker compose up -d`
- `CAPTCHA_SECRET` or recaptcha code — rebuild recaptcha: `docker compose up -d --build recaptcha`
- `SITE_NAME`, branding, or `MAIL_ENABLED` in the UI — rebuild frontend: `docker compose up -d --build frontend`
- Email MJML sources — rebuild backend (templates are built in the backend image)

---

## Offline bundle

For air-gapped hosts, build and export pre-built images:

```bash
./scripts/build-offline-package.sh <target>   # requires .env.<target>
```

Output: `docker-images/<target>/` with image tarballs, `docker-compose.yml` (from [docker-compose.offline.yml](docker-compose.offline.yml)), and `.env`.

On the offline host:

```bash
cd docker-images/<target>
docker load -i auth-backend.tar.gz
docker load -i auth-frontend.tar.gz
docker load -i auth-recaptcha.tar.gz
docker load -i redis-7-alpine.tar.gz
docker load -i postgres-15.tar.gz
docker compose up -d
```

Same auto DB bootstrap as online compose (`RUN_MIGRATIONS`, `RUN_INIT_DB`).

### Password expiry migration (one-time)

After deploying the password expiry feature, run once against the production database:

```bash
docker compose exec backend flask migrate-password-expiry
# or dry-run first:
docker compose exec backend flask migrate-password-expiry --dry-run
```

This sets a 30-day expiry for existing users without 2FA (users with 2FA or `external_auth_enforced` are skipped). Idempotent: users who already have `password_expires_at` are skipped unless `--force` is passed.

---

## Reference

| Topic | Notes |
| ----- | ----- |
| Frontend app base | `VITE_SITE_BASE_URL` / `FRONTEND_BASE_PATH` — router, `/api`, `/upload` (must match `SITE.base_url`) |
| Frontend asset base | `VITE_STATIC_PATH=static/` for Flask-direct only; **empty** for Docker/nginx (`/assets/…`) |
| Offline bundle | `./scripts/build-offline-package.sh <target>` → `docker-images/<target>/`; [docker-compose.offline.yml](docker-compose.offline.yml) |
| DB bootstrap (Docker) | Auto on backend start: `RUN_MIGRATIONS` + `RUN_INIT_DB` (default `true`); `flask reset-admin-password` for recovery — see [DEVELOPMENT.md](DEVELOPMENT.md#database-migrations) |
| Login CAPTCHA | [recaptcha/](recaptcha/) + `CAPTCHA` in `config.json` / `CAPTCHA_*` in `.env` |
| GeoLite files | [mmdb/source.txt](mmdb/source.txt), [scripts/download-mmdb.sh](scripts/download-mmdb.sh) |
| Outbound email (Docker) | Set `MAIL_SMTP_*` in `.env`; backend uses msmtp |
| Mail debugging | [DEVELOPMENT.md](DEVELOPMENT.md#mail-debugging) |
| Mail disabled | Default in `config.example.json`; set `MAIL_ENABLED=true` in `.env` + `MAIL_SMTP_*` to enable |
| OAuth client apps | [auth_connect](https://github.com/tjumyk/auth_connect) — see [DEVELOPMENT.md](DEVELOPMENT.md#client-sdk) |
| OAuth client bootstrap | `OAUTH_CLIENT_*` in `.env` — auto-import one client on backend start |
