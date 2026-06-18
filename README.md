<p align="center">
  <a href="README.md"><img src="frontend/public/assets/images/logo-256.png" width="100" height="100" alt="Identity logo"></a>
</p>

<div align="center">

# Identity

_OAuth-based Identity Management System_

[English](README.md) | [中文](README.zh.md)

</div>

Identity is an OAuth 2.0 identity provider: user and group management, OAuth client registration, optional image CAPTCHA, and integration with apps via [auth_connect](https://github.com/tjumyk/auth_connect).

## Documentation

| Topic | English | 中文 |
|-------|---------|------|
| Local setup, host install, frontend dev, migrations | [DEVELOPMENT.md](DEVELOPMENT.md) | [DEVELOPMENT.zh.md](DEVELOPMENT.zh.md) |
| Docker Compose, offline deploy, advanced config | [DEPLOYMENT.md](DEPLOYMENT.md) | [DEPLOYMENT.zh.md](DEPLOYMENT.zh.md) |

## Quick start (Docker)

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose — no config to copy for a local trial.

```bash
docker compose up -d --build
```

Open [http://localhost:8080/](http://localhost:8080/) and sign in as `admin` / `PASSword` (from baked-in `config.example.json`). Outbound email is **off** in that default config.

The backend entrypoint runs migrations and admin seed on each start (`RUN_MIGRATIONS` and `RUN_INIT_DB` default to `true`; both are idempotent).

**Logs:** `docker compose logs -f frontend backend recaptcha redis db` · **Stop:** `docker compose down`

See [DEPLOYMENT.md](DEPLOYMENT.md) for production config, subpath, email, OAuth bootstrap, and offline bundles.

## Quick start (host)

```bash
conda create -n auth python=3.11
conda activate auth
pip install -r requirements.txt
cp config.example.json config.json
flask create-db && flask init-db
cd frontend && npm ci && npm run build
cd .. && flask run -p 8077
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for Vite dev mode, mail debugging, and database recovery.
