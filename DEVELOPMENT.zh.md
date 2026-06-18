[English](DEVELOPMENT.md) | [中文](DEVELOPMENT.zh.md)

# 开发指南

## 环境

```bash
conda create -n auth python=3.11
conda activate auth
pip install -r requirements.txt
cp config.example.json config.json
```

所有 `python`、`flask`、`alembic` 命令请在 `auth` conda 环境中执行。

## 主机安装

Flask 从 `static/browser` 提供已构建的 React 应用（路径 `/static/…`）。适用于不使用容器的单机部署。

**依赖**

- Python 3.11+，`pip install -r requirements.txt`
- Node.js 20+，`cd frontend && npm ci`
- PostgreSQL（或试用时在 `config.json` 中使用 SQLite）
- `cd mail_templates/mjml && npm ci && npm run build`（邮件 HTML）
- 需要 Geo IP 时运行 `./scripts/download-mmdb.sh`
- 从主机发信需 msmtp 或其他 MTA — 或使用[邮件调试](#邮件调试)

```bash
cp config.example.json config.json
# 编辑 config.json — 设置 SITE.root_url（如 http://127.0.0.1:8077/），SITE.behind_proxy 设为 false
flask create-db
flask init-db
```

**构建前端**（`VITE_SITE_BASE_URL` 须与 `config.json` 中的 `SITE.base_url` 一致）：

```bash
cd frontend
VITE_STATIC_PATH=static/ npm run build
cd ..
```

**运行：**

```bash
flask run -p 8077
# 或生产环境：
gunicorn -w 4 -b 127.0.0.1:8077 --log-file - --access-logfile - app:app
```

在浏览器打开 `SITE.root_url`（如 `http://127.0.0.1:8077/`）。API 与上传路径为 `/api/…`、`/upload/…`，与 `/static/` 静态资源前缀无关。

子路径构建示例：`VITE_SITE_BASE_URL=/id/ VITE_STATIC_PATH=static/ npm run build`

## 本地前端开发

使用 Vite 热重载；Flask 提供 API。无需 Docker，也无需生产环境前端构建。

**依赖**

- Python 3.11+、Node.js 20+
- `pip install -r requirements.txt`
- `cp config.example.json config.json`，然后 `alembic upgrade head && flask init-db`（或 `flask create-db`，效果相同）
- `cd frontend && npm ci`
- `cp frontend/.env.example frontend/.env`（Flask 不在 `http://127.0.0.1:8077` 时设置 `VITE_FLASK_ORIGIN`）
- [邮件调试](#邮件调试)（可选）

**终端 1：**

```bash
flask run -p 8077
```

**终端 2：**

```bash
cd frontend
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173)。开发时不要设置 `VITE_STATIC_PATH`。

**开发环境 CAPTCHA：** Vite 将 `/api/captcha` 代理到 recaptcha 服务。启动 Redis 与 recaptcha（推荐 Compose）：

```bash
docker compose up -d redis recaptcha
```

在仓库根目录 `.env` 或 `flask run` 的 shell 中设置 `CAPTCHA_ENABLED=true`、`CAPTCHA_SERVICE_URL=http://127.0.0.1:8090`，`CAPTCHA_SECRET` 与 `.env.example` 一致。在 `frontend/.env` 中设置 `VITE_CAPTCHA_ORIGIN=http://127.0.0.1:8090`（见 [frontend/.env.example](frontend/.env.example)）。若依赖文件配置，将 `config.example.json` 中的 `CAPTCHA` 块合并进 `config.json`。

**测试与 lint：**

```bash
cd frontend && npm run test && npm run lint
```

## 数据库迁移

Schema 由 [Alembic](https://alembic.sqlalchemy.org/) 管理（`alembic/` 位于仓库根目录）。

**Docker：** 当 `RUN_MIGRATIONS` 与 `RUN_INIT_DB` 为 `true`（默认）时，后端 entrypoint 每次启动执行 `flask create-db` 与 `flask init-db`，均为幂等。详见 [DEPLOYMENT.zh.md](DEPLOYMENT.zh.md)。

**主机 / 本地：** 在仓库根目录：

```bash
alembic upgrade head    # 新库
flask init-db           # 初始化管理员用户与组（幂等）
```

`flask create-db` 等价于 `alembic upgrade head`。

**重置 bootstrap 管理员密码**（锁定时；勿在命令行传密码，会进入 shell 历史）：

```bash
flask reset-admin-password                    # 交互式输入（不回显）
flask reset-admin-password --from-config      # 使用 ADMIN.password / ADMIN_PASSWORD
printf '%s' 'NEW_PASSWORD' | flask reset-admin-password --stdin
```

Docker：

```bash
docker compose exec -it backend flask reset-admin-password
docker compose exec backend flask reset-admin-password --from-config
printf '%s' 'NEW_PASSWORD' | docker compose exec -T backend flask reset-admin-password --stdin
```

**Alembic 之前已存在的数据库**（schema 对应 revision `0001_initial`，无 `real_name` / `mobile`）：

```bash
alembic stamp 0001_initial
alembic upgrade head
```

**SQLite 与 `instance/`：** 相对 URI（如 `sqlite:///auth.db`）解析到 Flask 的 `instance/` 目录（与 Flask-SQLAlchemy 一致）。Alembic 在 `alembic/env.py` 中使用相同规则。若仓库根目录仍有旧 `auth.db`，迁移前请移至 `instance/auth.db`。

## 邮件调试

无需真实 SMTP 或 MTA 即可查看外发邮件。不用于生产。`config.json` 中投递顺序：`MAIL.mock_folder` → `MAIL.mail_catcher` → sendmail/msmtp（见 `utils/mail.py`）。调试时不要设置 `.env` 中的 `MAIL_SMTP_HOST` — 会启用 msmtp 并清除 `mail_catcher`。

### Mock 目录

将每封邮件写入磁盘。设置 `MAIL.mock_folder` 为目录路径（在主机创建，或在 Docker 挂载卷内）。每个收件人一个子目录；每封邮件为带时间戳的 `.txt` 文件：

```json
"MAIL": {
  "enabled": true,
  "display_name": "Identity",
  "from": "example@example.com",
  "mock_folder": "mailbox",
  "mail_catcher": null
}
```

`mock_folder` 设为 `null`（`config.example.json` 默认）即禁用。使用 mock 目录时将 `mail_catcher` 清空或设为 `null` — 两者同时存在时 `mock_folder` 优先。均为 `null` 时使用 sendmail/msmtp（Docker 通过 `.env` 的 `MAIL_SMTP_*` 配置，本地可用 MailCatcher/mock，见下文）。

### MailCatcher

[MailCatcher](https://github.com/sj26/mailcatcher) 提供假 SMTP 与 Web 收件箱。设置 `MAIL.mail_catcher` 后，后端经 SMTP 投递到 MailCatcher，不会发到公网。

**1. 安装并启动**（Ruby gem）：

```bash
gem install mailcatcher
mailcatcher --foreground
```

- Web UI：[http://127.0.0.1:1080](http://127.0.0.1:1080)
- SMTP：`127.0.0.1:1025`（默认）

**2. 在 `config.json` 中配置**（从 `config.example.json` 复制并添加 `mail_catcher` — Docker 快速试用默认可为 `null`）：

```json
"MAIL": {
  "enabled": true,
  "mail_catcher": {
    "host": "127.0.0.1",
    "port": 1025
  }
}
```

**3. 调试时避免生产邮件配置**

- **不要**在 `.env` 中设置 `MAIL_SMTP_HOST` — 会启用 msmtp 并清除 `mail_catcher`。
- 保持 `MAIL_ENABLED` 未设置或为 `true`，以便邮件流程可用。

触发任意发信操作（注册、重置密码、管理员发信等），在 MailCatcher Web UI 中查看。

适用于 `flask run`、[本地前端开发](#本地前端开发) 或本地 Docker。Docker 中可添加 MailCatcher 服务，将 `mail_catcher.host` 设为服务名（在构建 backend 镜像前的 `config.json` 或 `config.prod.json` 中）：

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

`.env` 中省略 `MAIL_SMTP_HOST`。在主机打开 [http://localhost:1080](http://localhost:1080) 查看邮件。

## 客户端 SDK

[auth_connect](https://github.com/tjumyk/auth_connect) 是面向 Identity 的 OAuth 2.0 **客户端**库，适用于 Flask 后端：登录跳转、令牌交换、会话存储、`@requires_login` / `@requires_admin` 装饰器及可选的管理 API 辅助。小型 TypeScript 包提供 OAuth 回调与错误 payload 的 Zod schema。

1. 在 Identity 管理控制台注册 OAuth 客户端。
2. 在应用中复制 `oauth.config.example.json` 为 `oauth.config.json`，配置 `server.url`、 `client.id`、`client.secret` 及回调路径。
3. 从仓库 `pip install` 并调用 `oauth.init_app(app, config_file="oauth.config.json")`。

配置字段、Mock 服务器与前端 schema 用法见 [auth_connect README](https://github.com/tjumyk/auth_connect)。
