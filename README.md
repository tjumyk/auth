



# Identity

*OAuth-based Identity Management System*





**[Quick Start](#quick-start)** · [Deployment](#deployment) · [Development](#development) · [Client SDK](#client-sdk) · [Reference](#reference)



---

## Quick Start

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose — no config to copy for a local trial.

```bash
docker compose up -d --build
docker compose exec backend flask create-db
docker compose exec backend flask init-db
```

Open [http://localhost:8080/](http://localhost:8080/) and sign in as `admin` / `PASSword` (from baked-in `config.example.json`). Outbound email is **off** in that default config — no msmtp setup required for the trial.

`flask create-db` applies Alembic migrations (`alembic upgrade head`).

**Logs:** `docker compose logs -f frontend backend recaptcha redis db` · **Stop:** `docker compose down`

For production setup, geo IP, subpath, email, and host install — see [Deployment](#deployment) and [Development](#development).

---

## Deployment

Choose **Docker Compose** (recommended) or **host install** (Python/Node on the machine).

### Docker Compose

Full guide for production-style deployment. Python, Node, and PostgreSQL are provided by the compose stack — nothing to install on the host beyond Docker.

#### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Copy and edit config before the first build (see below)

#### 1. Config files

Both files are **optional for a local trial** — compose defaults plus baked-in `config.example.json` are enough. Copy them for production or custom settings:

```bash
cp .env.example .env                # recommended for production
cp config.example.json config.json  # optional; for settings beyond .env overrides
```

Without `.env`, compose uses inline defaults (e.g. DB password `change_me`) and the backend falls back to values in `config.example.json`. With `.env`, those variables override `config.json` at runtime. At minimum set in `.env` for deployment:


| Variable                  | Purpose                                                              |
| ------------------------- | -------------------------------------------------------------------- |
| `SECRET_KEY`              | Flask session signing                                                |
| `POSTGRES_PASSWORD`       | Database password                                                    |
| `SQLALCHEMY_DATABASE_URI` | Backend DB URL — user, password, and db name must match `POSTGRES_*` |
| `ADMIN_PASSWORD`          | Initial admin account password                                       |
| `SITE_ROOT_URL`           | Public URL users open in the browser (e.g. `http://localhost:8080`)  |
| `SITE_BEHIND_PROXY`       | `true` when nginx (or similar) sits in front of the backend — see [Advanced config](#advanced-config) |
| `CAPTCHA_SECRET`          | Shared secret between backend and recaptcha service (change in production)                           |
| `CAPTCHA_ENABLED`         | `true` / `false` — login image CAPTCHA after a failed attempt (default `true` in compose)           |


See [.env.example](.env.example) for all options. Environment variables override `config.json` at runtime. For subpath deployment, outbound email, Kerberos, and other settings not covered here, see [Advanced config](#advanced-config).

#### 2. GeoLite databases (optional)

For geo IP features, download databases before building the backend image (they are copied in at build time):

```bash
./scripts/download-mmdb.sh
```

Skip this for a minimal trial — the app runs without geo IP.

#### 3. Build and start

```bash
docker compose up -d --build
```

#### 4. Initialize the database (first time only)

```bash
docker compose exec backend flask create-db
docker compose exec backend flask init-db
```

#### 5. Open the app

[http://localhost:8080/](http://localhost:8080/) (or the port in `FRONTEND_PORT` / `.env`).

The stack includes **redis** and **recaptcha** (image CAPTCHA microservice) in addition to `db`, `backend`, and `frontend`. The frontend nginx container proxies `/api/captcha/` to recaptcha; the backend verifies challenges over the internal Docker network only.

**Logs:** `docker compose logs -f frontend backend recaptcha redis db`  
**Stop:** `docker compose down`

#### Advanced config

Optional settings beyond the minimal trial. Some use `.env`; others require `config.json` (not overridable via environment variables).

**Subpath (e.g. `/id/`).** In `.env` set `FRONTEND_BASE_PATH=/id/`, `SITE_BASE_URL=/id/`, and `SITE_ROOT_URL` accordingly. Set these before building the frontend image; after changes run `docker compose up -d --build frontend`.

**Reverse proxy (`SITE.behind_proxy`).** Set `SITE_BEHIND_PROXY=true` in `.env` when the backend is reached through nginx or another reverse proxy (Docker Compose default). Identity then reads the client IP from the `X-Real-IP` header the proxy sets, instead of the proxy's own address — used for login records, geo region detection, and IP check. The frontend nginx config already forwards `X-Real-IP` to the backend. For host install with direct `flask run` and no proxy in front, set `SITE_BEHIND_PROXY=false`.

**Outbound email.** Disabled by default in `config.example.json` (`MAIL.enabled: false`). For production, set `MAIL_ENABLED=true` in `.env` and configure SMTP. The backend image includes **msmtp**; when `MAIL_SMTP_HOST` is set, the container writes msmtp config at startup and sends mail through your relay:

```bash
MAIL_ENABLED=true
MAIL_FROM=noreply@example.com
MAIL_SMTP_HOST=smtp.example.com
MAIL_SMTP_PORT=587
MAIL_SMTP_USER=your-user
MAIL_SMTP_PASSWORD=your-password
```

Optional: `MAIL_SMTP_TLS`, `MAIL_SMTP_STARTTLS`, and `MAIL_SMTP_AUTH` (each `on` or `off`; defaults `on`). Rebuild the frontend when toggling `MAIL_ENABLED` so registration and admin send-email UI stay in sync. For development without SMTP, see [Mail debugging](#mail-debugging).

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

The recaptcha service is built from [`recaptcha/`](recaptcha/) (Flask + Redis + Pillow). Its **verify** endpoint is not exposed through nginx; only challenge creation and image fetch are public at `/api/captcha/v1/…`. For [local frontend development](#develop-the-frontend-locally), run `docker compose up -d redis recaptcha` and set `CAPTCHA_SERVICE_URL=http://127.0.0.1:8090` on the Flask process plus `VITE_CAPTCHA_ORIGIN` in `frontend/.env` (see that section).

#### After you change settings

- Runtime backend values in `.env` (including mail SMTP and `CAPTCHA_*`) — restart: `docker compose up -d`
- `CAPTCHA_SECRET` or recaptcha code — rebuild recaptcha: `docker compose up -d --build recaptcha`
- `SITE_NAME`, branding, or `MAIL_ENABLED` in the UI — rebuild frontend: `docker compose up -d --build frontend`
- Email MJML sources — rebuild backend (templates are built in the backend image)

### Host install

Flask serves the built React app from `static/browser` at `/static/…`. Use this for a single-server install without containers.

Requirements and setup

- Python 3.11+, `pip install -r requirements.txt`
- Node.js 20+, `cd frontend && npm ci`
- PostgreSQL (or SQLite in `config.json` for trials)
- `cd mail_templates/mjml && npm ci && npm run build` (email HTML)
- `./scripts/download-mmdb.sh` if you need geo IP
- msmtp or another MTA if you send mail from the host — or [mail debugging](#mail-debugging) (mock folder / MailCatcher)

```bash
cp config.example.json config.json
# edit config.json — set SITE.root_url to your Flask URL (e.g. http://127.0.0.1:8077/) and SITE.behind_proxy to false
flask create-db
flask init-db
```

**Build the frontend** (`VITE_SITE_BASE_URL` must match `SITE.base_url` in `config.json`):

```bash
cd frontend
VITE_STATIC_PATH=static/ npm run build
cd ..
```

**Run:**

```bash
flask run -p 8077
# or production:
gunicorn -w 4 -b 127.0.0.1:8077 --log-file - --access-logfile - app:app
```

Open `SITE.root_url` (e.g. `http://127.0.0.1:8077/`). API and uploads use `/api/…` and `/upload/…`, not the `/static/` asset prefix.

Subpath build example: `VITE_SITE_BASE_URL=/id/ VITE_STATIC_PATH=static/ npm run build`

---

## Development

### Develop the frontend locally

Hot reload with Vite; Flask provides the API. No Docker and no production frontend build required.

Requirements

- Python 3.11+, Node.js 20+
- `pip install -r requirements.txt`
- `cp config.example.json config.json` and `alembic upgrade head && flask init-db` (or `flask create-db`, which runs the same migrations)
- `cd frontend && npm ci`
- `cp frontend/.env.example frontend/.env` (set `VITE_FLASK_ORIGIN` if Flask is not on `http://127.0.0.1:8077`)
- [Mail debugging](#mail-debugging) (optional) — `MAIL.mock_folder` or MailCatcher

**Terminal 1:**

```bash
flask run -p 8077
```

**Terminal 2:**

```bash
cd frontend
npm run dev
```

Use [http://localhost:5173](http://localhost:5173). Do not set `VITE_STATIC_PATH` for dev.

**CAPTCHA in dev:** Vite proxies `/api/captcha` to the recaptcha service. Start Redis and recaptcha (easiest via Compose):

```bash
docker compose up -d redis recaptcha
```

In repo-root `.env` or your shell for `flask run`, set `CAPTCHA_ENABLED=true`, `CAPTCHA_SERVICE_URL=http://127.0.0.1:8090`, and the same `CAPTCHA_SECRET` as in `.env.example`. In `frontend/.env`, set `VITE_CAPTCHA_ORIGIN=http://127.0.0.1:8090` (see [frontend/.env.example](frontend/.env.example)). Merge the `CAPTCHA` block from `config.example.json` into `config.json` if you rely on file-based config.

```bash
cd frontend && npm run test && npm run lint
```

### Database migrations

Schema is managed with [Alembic](https://alembic.sqlalchemy.org/) (`alembic/` at the repo root). From the project root:

```bash
alembic upgrade head    # new database
flask init-db           # seed admin user and group
```

`flask create-db` is an alias for `alembic upgrade head`.

**Existing database** created before Alembic (schema matches revision `0001_initial`, without `real_name` / `mobile`):

```bash
alembic stamp 0001_initial
alembic upgrade head
```

**SQLite and `instance/`:** Relative URIs such as `sqlite:///auth.db` are resolved under Flask’s `instance/` folder (same as Flask-SQLAlchemy). Alembic uses the same resolution in `alembic/env.py`. If you still have an old `auth.db` at the repo root, move it to `instance/auth.db` before migrating.

### Mail debugging

Inspect outbound mail without a real SMTP server or MTA. Not for production deployment. In `config.json`, delivery is chosen in this order: `MAIL.mock_folder` → `MAIL.mail_catcher` → sendmail/msmtp (see `utils/mail.py`). Do not set `MAIL_SMTP_HOST` in `.env` while debugging — that enables msmtp and clears `mail_catcher`.

#### Mock folder

Write each message to disk instead of sending it. Set `MAIL.mock_folder` to a directory path (create it on the host, or use a path inside a mounted volume in Docker). Each recipient gets a subfolder; each message is a `.txt` file named with a timestamp:

```json
"MAIL": {
  "enabled": true,
  "display_name": "Identity",
  "from": "example@example.com",
  "mock_folder": "mailbox",
  "mail_catcher": null
}
```

Set `mock_folder` to `null` (the default in `config.example.json`) to disable. Clear `mail_catcher` or set it to `null` when using the mock folder — `mock_folder` takes precedence if both are set. With both `null`, mail uses sendmail/msmtp (configure via `MAIL_SMTP_*` in `.env` for Docker, or enable MailCatcher/mock folder locally — see below).

#### MailCatcher

[MailCatcher](https://github.com/sj26/mailcatcher) runs a fake SMTP server and a web inbox. When `MAIL.mail_catcher` is set, the backend delivers outbound mail to MailCatcher over SMTP — nothing is sent to the internet.

**1. Install and start MailCatcher** (Ruby gem):

```bash
gem install mailcatcher
mailcatcher --foreground
```

- Web UI: [http://127.0.0.1:1080](http://127.0.0.1:1080)
- SMTP listen: `127.0.0.1:1025` (default)

**2. Point the app at it** in `config.json` (copy from `config.example.json` and add a `mail_catcher` block — the baked-in example leaves it `null` for Docker quick start):

```json
"MAIL": {
  "enabled": true,
  "mail_catcher": {
    "host": "127.0.0.1",
    "port": 1025
  }
}
```

**3. Avoid production mail settings while debugging**

- Do **not** set `MAIL_SMTP_HOST` in `.env` — that enables msmtp and clears `mail_catcher`.
- Keep `MAIL_ENABLED` unset or `true` so mail flows are active.

Trigger any mail action (register, password reset, admin send email, etc.) and open the MailCatcher web UI to read captured messages.

Works with `flask run`, [local frontend development](#develop-the-frontend-locally), or a local Docker stack. For Docker, add a MailCatcher service and set `mail_catcher.host` to its service name (e.g. in `config.json` or `config.prod.json` before building the backend image):

```yaml
  mailcatcher:
    image: sj26/mailcatcher
    ports:
      - "1080:1080"
      - "1025:1025"
```

```json
"mail_catcher": {
  "host": "mailcatcher",
  "port": 1025
}
```

Omit `MAIL_SMTP_HOST` from `.env`. Open [http://localhost:1080](http://localhost:1080) on the host to view mail.

---

## Client SDK

[auth_connect](https://github.com/tjumyk/auth_connect) is a separate OAuth 2.0 **client** library for apps that authenticate against Identity. It targets Flask backends: login redirect, token exchange, session storage, `@requires_login` / `@requires_admin` decorators, and optional admin API helpers. A small TypeScript package provides Zod schemas for OAuth callback and error payloads.

1. Register an OAuth client in the Identity admin console.
2. Copy `oauth.config.example.json` to `oauth.config.json` in your app and set `server.url` to your Identity deployment, plus `client.id`, `client.secret`, and callback paths.
3. `pip install` from the repo and call `oauth.init_app(app, config_file="oauth.config.json")`.

See the [auth_connect README](https://github.com/tjumyk/auth_connect) for config fields, mock server setup, and frontend schema usage.

---

## Reference


| Topic                   | Notes                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Frontend app base       | `VITE_SITE_BASE_URL` / `FRONTEND_BASE_PATH` — router, `/api`, `/upload` (must match `SITE.base_url`) |
| Frontend asset base     | `VITE_STATIC_PATH=static/` for Flask-direct only; **empty** for Docker/nginx (`/assets/…`)           |
| Offline bundle          | `./scripts/build-offline-package.sh <target>` → `docker-images/<target>/`; [docker-compose.offline.yml](docker-compose.offline.yml) on the air-gapped host |
| Login CAPTCHA           | [recaptcha/](recaptcha/) + `CAPTCHA` in `config.json` / `CAPTCHA_*` in `.env` — see [Advanced config](#advanced-config) |
| GeoLite files           | [mmdb/source.txt](mmdb/source.txt), [scripts/download-mmdb.sh](scripts/download-mmdb.sh)             |
| Outbound email (Docker) | Set `MAIL_SMTP_`* in `.env`; backend uses msmtp — see [Advanced config](#advanced-config)            |
| Mail debugging          | [Mail debugging](#mail-debugging) — `MAIL.mock_folder` or `MAIL.mail_catcher` in `config.json`       |
| Mail disabled           | Default in `config.example.json`; set `MAIL_ENABLED=true` in `.env` + `MAIL_SMTP_*` to enable — see [Advanced config](#advanced-config) |
| OAuth client apps       | [auth_connect](https://github.com/tjumyk/auth_connect) — Flask client SDK; see [Client SDK](#client-sdk) |


