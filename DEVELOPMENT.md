[English](DEVELOPMENT.md) | [中文](DEVELOPMENT.zh.md)

# Development Guide

## Environment

```bash
conda create -n auth python=3.11
conda activate auth
pip install -r requirements.txt
cp config.example.json config.json
```

Use the `auth` conda environment for all `python`, `flask`, and `alembic` commands.

## Host install

Flask serves the built React app from `static/browser` at `/static/…`. Use this for a single-server install without containers.

**Requirements**

- Python 3.11+, `pip install -r requirements.txt`
- Node.js 20+, `cd frontend && npm ci`
- PostgreSQL (or SQLite in `config.json` for trials)
- `cd mail_templates/mjml && npm ci && npm run build` (email HTML)
- `./scripts/download-mmdb.sh` if you need geo IP
- msmtp or another MTA if you send mail from the host — or [Mail debugging](#mail-debugging)

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

## Frontend development (local)

Hot reload with Vite; Flask provides the API. No Docker and no production frontend build required.

**Requirements**

- Python 3.11+, Node.js 20+
- `pip install -r requirements.txt`
- `cp config.example.json config.json` and `alembic upgrade head && flask init-db` (or `flask create-db`, which runs the same migrations)
- `cd frontend && npm ci`
- `cp frontend/.env.example frontend/.env` (set `VITE_FLASK_ORIGIN` if Flask is not on `http://127.0.0.1:8077`)
- [Mail debugging](#mail-debugging) (optional)

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

**Tests and lint:**

```bash
cd frontend && npm run test && npm run lint
```

## Database migrations

Schema is managed with [Alembic](https://alembic.sqlalchemy.org/) (`alembic/` at the repo root).

**Docker:** the backend entrypoint runs `flask create-db` and `flask init-db` on each start when `RUN_MIGRATIONS` and `RUN_INIT_DB` are `true` (defaults). Both are idempotent. See [DEPLOYMENT.md](DEPLOYMENT.md).

**Host / local:** from the project root:

```bash
alembic upgrade head    # new database
flask init-db           # seed admin user and group (idempotent)
```

`flask create-db` is an alias for `alembic upgrade head`.

**Reset bootstrap admin password** (when locked out; do not pass the password on the command line — it ends up in shell history):

```bash
flask reset-admin-password                    # interactive prompt (hidden input)
flask reset-admin-password --from-config      # ADMIN.password / ADMIN_PASSWORD
printf '%s' 'NEW_PASSWORD' | flask reset-admin-password --stdin
```

Docker:

```bash
docker compose exec -it backend flask reset-admin-password
docker compose exec backend flask reset-admin-password --from-config
printf '%s' 'NEW_PASSWORD' | docker compose exec -T backend flask reset-admin-password --stdin
```

**Existing database** created before Alembic (schema matches revision `0001_initial`, without `real_name` / `mobile`):

```bash
alembic stamp 0001_initial
alembic upgrade head
```

**SQLite and `instance/`:** Relative URIs such as `sqlite:///auth.db` are resolved under Flask’s `instance/` folder (same as Flask-SQLAlchemy). Alembic uses the same resolution in `alembic/env.py`. If you still have an old `auth.db` at the repo root, move it to `instance/auth.db` before migrating.

## Mail debugging

Inspect outbound mail without a real SMTP server or MTA. Not for production deployment. In `config.json`, delivery is chosen in this order: `MAIL.mock_folder` → `MAIL.mail_catcher` → sendmail/msmtp (see `utils/mail.py`). Do not set `MAIL_SMTP_HOST` in `.env` while debugging — that enables msmtp and clears `mail_catcher`.

### Mock folder

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

### MailCatcher

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

Works with `flask run`, [local frontend development](#frontend-development-local), or a local Docker stack. For Docker, add a MailCatcher service and set `mail_catcher.host` to its service name (e.g. in `config.json` or `config.prod.json` before building the backend image):

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

## Client SDK

[auth_connect](https://github.com/tjumyk/auth_connect) is a separate OAuth 2.0 **client** library for apps that authenticate against Identity. It targets Flask backends: login redirect, token exchange, session storage, `@requires_login` / `@requires_admin` decorators, and optional admin API helpers. A small TypeScript package provides Zod schemas for OAuth callback and error payloads.

1. Register an OAuth client in the Identity admin console.
2. Copy `oauth.config.example.json` to `oauth.config.json` in your app and set `server.url` to your Identity deployment, plus `client.id`, `client.secret`, and callback paths.
3. `pip install` from the repo and call `oauth.init_app(app, config_file="oauth.config.json")`.

See the [auth_connect README](https://github.com/tjumyk/auth_connect) for config fields, mock server setup, and frontend schema usage.
