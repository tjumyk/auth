



# Identity

*OAuth-based Identity Management System*



**[Quick Start](#quick-start)** · [Deployment](#deployment) · [Development](#development) · [Reference](#reference)

---

## Quick Start

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose — no config to copy for a local trial.

```bash
docker compose up -d --build
docker compose exec backend flask create-db
docker compose exec backend flask init-db
```

Open [http://localhost:8080/](http://localhost:8080/) and sign in as `admin` / `PASSword` (from `config.example.json`).

**For production or anything beyond a local trial**, copy and edit `.env` (and optionally `config.json`):

```bash
cp .env.example .env
cp config.example.json config.json   # optional; only for settings .env cannot override
```

Set at least `SECRET_KEY`, `POSTGRES_PASSWORD`, `SQLALCHEMY_DATABASE_URI` (password must match `POSTGRES_PASSWORD`), and `ADMIN_PASSWORD` in `.env`. See [Config files](#1-config-files).

**Logs:** `docker compose logs -f frontend backend db` · **Stop:** `docker compose down`

Geo IP, subpath deployment, outbound email, and host installs — see [Deployment](#deployment) and [Development](#development).

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


See [.env.example](.env.example) for all options. Environment variables override `config.json` at runtime.

**Subpath (e.g. `/id/`).** In `.env` set `FRONTEND_BASE_PATH=/id/`, `SITE_BASE_URL=/id/`, and `SITE_ROOT_URL` accordingly. Set these before building the frontend image; after changes run `docker compose up -d --build frontend`.

**Outbound email.** The backend image includes **msmtp** as a sendmail-compatible MTA. When `MAIL_SMTP_HOST` is set in `.env`, the container writes msmtp config at startup and sends mail through your SMTP relay (instead of `mail_catcher` in `config.json`):

```bash
MAIL_ENABLED=true
MAIL_FROM=noreply@example.com
MAIL_SMTP_HOST=smtp.example.com
MAIL_SMTP_PORT=587
MAIL_SMTP_USER=your-user
MAIL_SMTP_PASSWORD=your-password
```

Optional: `MAIL_SMTP_TLS`, `MAIL_SMTP_STARTTLS`, and `MAIL_SMTP_AUTH` (each `on` or `off`; defaults `on`). Rebuild the frontend when toggling `MAIL_ENABLED` so registration and admin send-email UI stay in sync.

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

**Logs:** `docker compose logs -f frontend backend db`  
**Stop:** `docker compose down`

#### After you change settings

- Runtime backend values in `.env` (including mail SMTP settings) — restart: `docker compose up -d`
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
- msmtp or another MTA if you send mail from the host — or [MailCatcher](#mail-debugging-with-mailcatcher) for debugging

```bash
cp config.example.json config.json
# edit config.json, then:
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
- `cp config.example.json config.json` and `flask create-db && flask init-db`
- `cd frontend && npm ci`
- `cp frontend/.env.example frontend/.env` (set `VITE_FLASK_ORIGIN` if Flask is not on `http://127.0.0.1:8077`)
- [MailCatcher](#mail-debugging-with-mailcatcher) (optional) to inspect outbound mail



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

```bash
cd frontend && npm run test && npm run lint
```

### Mail debugging with MailCatcher

Inspect outbound mail without a real SMTP server or MTA. Not for production deployment.

[MailCatcher](https://github.com/sj26/mailcatcher) runs a fake SMTP server and a web inbox. When `MAIL.mail_catcher` is set in `config.json`, the backend delivers outbound mail to MailCatcher over SMTP (see `utils/mail.py`) instead of msmtp/sendmail — nothing is sent to the internet.

**1. Install and start MailCatcher** (Ruby gem):

```bash
gem install mailcatcher
mailcatcher --foreground
```

- Web UI: [http://127.0.0.1:1080](http://127.0.0.1:1080)
- SMTP listen: `127.0.0.1:1025` (default)

**2. Point the app at it** in `config.json` (`config.example.json` already uses these defaults):

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

## Reference


| Topic                   | Notes                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Frontend app base       | `VITE_SITE_BASE_URL` / `FRONTEND_BASE_PATH` — router, `/api`, `/upload` (must match `SITE.base_url`) |
| Frontend asset base     | `VITE_STATIC_PATH=static/` for Flask-direct only; **empty** for Docker/nginx (`/assets/…`)           |
| Offline images          | [docker-compose.offline.yml](docker-compose.offline.yml)                                             |
| GeoLite files           | [mmdb/source.txt](mmdb/source.txt), [scripts/download-mmdb.sh](scripts/download-mmdb.sh)             |
| Outbound email (Docker) | Set `MAIL_SMTP_`* in `.env`; backend uses msmtp — see [Config files](#1-config-files)                |
| Mail debugging          | [MailCatcher](#mail-debugging-with-mailcatcher) via `MAIL.mail_catcher` in `config.json`             |
| Mail disabled           | `MAIL_ENABLED=false` in `.env`; rebuild frontend to hide registration / send-email UI                |


