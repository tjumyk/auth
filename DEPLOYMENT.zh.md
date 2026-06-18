[English](DEPLOYMENT.md) | [中文](DEPLOYMENT.zh.md)

# 部署指南

使用 Docker Compose（推荐）或无容器的主机安装进行 Identity 生产部署。

**两条路径：**

| 路径 | 场景 |
|------|------|
| **Docker Compose** | 推荐 — Python、Node、PostgreSQL、Redis、CAPTCHA 均在栈内 |
| **主机安装** | 单机部署；见 [DEVELOPMENT.zh.md](DEVELOPMENT.zh.md#主机安装) |

---

## 架构

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

- **frontend：** React 构建 + nginx；将 `/api/` 代理到 backend，`/api/captcha/` 代理到 recaptcha
- **backend：** Flask API、OAuth；启动时执行 Alembic 迁移与管理员种子（幂等）
- **recaptcha：** 图片 CAPTCHA 微服务（[`recaptcha/`](recaptcha/)）
- **db / redis：** PostgreSQL 15 与 Redis 7

---

## Docker Compose

生产风格部署完整指南。主机仅需 Docker。

### 前置条件

- [Docker](https://docs.docker.com/get-docker/) 与 Docker Compose
- 首次构建前复制并编辑配置（见下文）

### 1. 配置文件

**本地试用**时两个文件均可选 — compose 默认值与内置 `config.example.json` 即可。生产或自定义设置请复制：

```bash
cp .env.example .env                # 生产环境推荐
cp config.example.json config.json  # 可选；用于 .env 未覆盖的项
```

无 `.env` 时使用 compose 内联默认（如 DB 密码 `change_me`），backend 回退到 `config.example.json`。有 `.env` 时，环境变量在运行时覆盖 `config.json`。生产部署至少设置：

| 变量 | 用途 |
| -------- | ------- |
| `SECRET_KEY` | Flask 会话签名 |
| `POSTGRES_PASSWORD` | 数据库密码 |
| `SQLALCHEMY_DATABASE_URI` | Backend DB URL — 用户、密码、库名须与 `POSTGRES_*` 一致 |
| `ADMIN_PASSWORD` | **仅首次** admin 种子密码（`init-db` 幂等 — 修改已有 admin 请用 `flask reset-admin-password`） |
| `SITE_ROOT_URL` | 用户访问的公网 URL（如 `http://localhost:8080`） |
| `SITE_BEHIND_PROXY` | 后端前有 nginx 等反向代理时为 `true` — 见[高级配置](#高级配置) |
| `CAPTCHA_SECRET` | backend 与 recaptcha 共享密钥（生产环境请修改） |
| `CAPTCHA_ENABLED` | `true` / `false` — 登录失败后图片 CAPTCHA（compose 默认 `true`） |
| `RUN_MIGRATIONS` | 启动时执行 Alembic（默认 `true`；多副本时可设 `false` 单独迁移） |
| `RUN_INIT_DB` | 启动时 seed admin（默认 `true`；幂等） |

全部选项见 [.env.example](.env.example)。环境变量覆盖 `config.json`。

### 2. GeoLite 数据库（可选）

Geo IP 功能需在构建 backend 镜像前下载数据库（构建时 COPY 进镜像）：

```bash
./scripts/download-mmdb.sh
```

最小试用可跳过 — 无 Geo IP 亦可运行。

### 3. 构建并启动

```bash
docker compose up -d --build
```

### 4. 打开应用

[http://localhost:8080/](http://localhost:8080/)（或 `.env` 中 `FRONTEND_PORT` 对应端口）。

Backend 启动时自动执行迁移与 admin 种子。手动执行：`docker compose exec backend flask create-db` 与 `docker compose exec backend flask init-db`。

栈内除 `db`、`backend`、`frontend` 外还有 **redis** 与 **recaptcha**。Frontend nginx 将 `/api/captcha/` 代理到 recaptcha；backend 仅在 Docker 内网校验验证码。

**日志：** `docker compose logs -f frontend backend recaptcha redis db`  
**停止：** `docker compose down`

### OAuth 客户端 bootstrap（可选）

集成测试或本地开发时，可自动 seed 单个 OAuth 客户端，无需在管理控制台创建。在 `.env` 中设置（见 [.env.example](.env.example)）：

| 变量 | 必填 | 用途 |
| -------- | -------- | ------- |
| `OAUTH_CLIENT_NAME` | 是 | 客户端名称（3–16 个 word 字符） |
| `OAUTH_CLIENT_REDIRECT_URL` | 是 | OAuth 回调 URL |
| `OAUTH_CLIENT_HOME_URL` | 是 | 应用首页 URL（回调须以其为前缀） |
| `OAUTH_CLIENT_SECRET` | 否 | 测试用固定 secret；省略则自动生成 |
| `OAUTH_CLIENT_DESCRIPTION` | 否 | 应用列表中的描述 |
| `OAUTH_CLIENT_IS_PUBLIC` | 否 | `true` / `false`（默认 `true`） |

示例：

```bash
OAUTH_CLIENT_NAME=testapp
OAUTH_CLIENT_SECRET=integration-test-secret
OAUTH_CLIENT_REDIRECT_URL=http://localhost:3000/oauth/callback
OAUTH_CLIENT_HOME_URL=http://localhost:3000
OAUTH_CLIENT_DESCRIPTION=Integration test OAuth client
OAUTH_CLIENT_IS_PUBLIC=true
```

设置 `OAUTH_CLIENT_NAME` 后，backend 容器每次启动导入。**幂等** — 同名客户端已存在则跳过。

也可手动导入：

```bash
docker compose exec backend flask import-oauth-client-from-env
```

**从文件导入多个客户端。** 使用 JSON 数组（见 [oauth-clients.example.json](oauth-clients.example.json)）：

```bash
docker compose exec backend flask import-oauth-clients /path/to/oauth-clients.json
```

在容器中设置 `OAUTH_CLIENTS_FILE` 并通过卷挂载文件，即可在启动时从文件导入而非环境变量。

### 高级配置

超出最小试用的可选设置。部分用 `.env`；部分须写 `config.json`（不可通过环境变量覆盖）。

**子路径（如 `/id/`）。** 在 `.env` 中设置 `FRONTEND_BASE_PATH=/id/`、`SITE_BASE_URL=/id/`、`SITE_ROOT_URL`。须在构建 frontend 镜像**之前**设置；变更后执行 `docker compose up -d --build frontend`。

**反向代理（`SITE.behind_proxy`）。** Backend 经 nginx 等反向代理访问时，在 `.env` 中设 `SITE_BEHIND_PROXY=true`（Docker Compose 默认）。Identity 从 `X-Real-IP` 或 `X-Forwarded-For` 首跳读取客户端 IP，用于登录记录、Geo 区域与 IP 检查。Compose **frontend** nginx 会保留外层代理传入的 `X-Real-IP` 并转发给 backend。

若 compose frontend 前还有**外部 nginx**（生产常见），须传递真实客户端地址，例如：

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

缺少这些头时，登录记录会显示代理或 Docker 网段地址。主机直接 `flask run` 且无前端代理时，设 `SITE_BEHIND_PROXY=false`。

**外发邮件。** `config.example.json` 默认关闭（`MAIL.enabled: false`）。生产环境在 `.env` 中设 `MAIL_ENABLED=true` 并配置 SMTP。Backend 镜像含 **msmtp**；设置 `MAIL_SMTP_HOST` 后，容器启动时写入 msmtp 配置并经中继发信：

```bash
MAIL_ENABLED=true
MAIL_FROM=noreply@example.com
MAIL_SMTP_HOST=smtp.example.com
MAIL_SMTP_PORT=587
MAIL_SMTP_USER=your-user
MAIL_SMTP_PASSWORD=your-password
```

可选：`MAIL_SMTP_TLS`、`MAIL_SMTP_STARTTLS`、`MAIL_SMTP_AUTH`（各为 `on` 或 `off`；默认 `on`）。切换 `MAIL_ENABLED` 后须重建 frontend，注册与管理发信 UI 才能同步。开发无 SMTP 时见开发指南[邮件调试](DEVELOPMENT.zh.md#邮件调试)。

**外部 Kerberos 认证** — 写入 `config.json`。需 `kerberos` Python 包及系统库（`libkrb5-dev`、`krb5-config`）。默认 Docker 镜像不含；请主机安装或扩展 Dockerfile。

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

**外部用户信息源** — 写入 `config.json`。仅管理员：在用户编辑页 **Load external info** 查询外部目录。不影响登录（与 `EXTERNAL_AUTH_PROVIDERS` 独立）。

当前仅支持 `pwd_agent` — 小型 HTTP 服务（Identity 不附带），暴露 passwd 风格账户。Identity 请求：

```http
GET http://<host>:<port>/api?names=<username>
```

期望 JSON：`{ "<username>": { ... } }`。管理 UI 以原始 JSON 展示；连接或查询错误亦在此显示。

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

在 Identity 可达处运行 pwd agent（`host` / `port`）。可配置多条。

**注册规则** — 写入 `config.json`。控制**自助**注册（`POST /api/account/register`）。管理员邀请不受影响。

省略 `ACCOUNT_REGISTER` 或为 `null` 时禁用注册。存在但 `free_register` 为 false 且 `email_domain_register` 为空时同样禁用 — `config.example.json` 默认。设 `free_register` 为 true 和/或添加域名规则以允许注册。

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

`free_register` 为 true 时任意邮箱域名可注册；为 false 时仅 `accept_domains` 匹配地址可注册，并加入 `add_to_groups` 所列组。

**IP 检查** — 写入 `config.json`。与外部 IP 授权服务集成（私有项目，Identity 不附带）。配置后，登录首页以用户 IP 与 `AuthSecretKey: {secret}` 调用 `{url}/api/auth-check-ip`。服务应返回 `{ "check_pass": true/false, "guarded_ports": [ ... ] }`。检查失败时，`home_url` 端口在 `guarded_ports` 内的 OAuth 应用磁贴标记为当前网络不可用。

```json
"IP_CHECK": {
  "url": "http://127.0.0.1:6373",
  "secret": "secretSECRET"
}
```

留空 `IP_CHECK`（`{}`）或省略即禁用。Backend 须能访问 `url`。

**登录 CAPTCHA（recaptcha）。** `CAPTCHA.enabled` 为 true 时（`config.example.json` 默认），登录可选图片验证码。同一用户或客户端 IP 在 15 分钟内至少一次登录失败后，登录表单加载 4 位验证码；backend 校验通过后才接受密码。在 `config.json` 和/或 `.env` 中配置：

```json
"CAPTCHA": {
  "enabled": true,
  "service_url": "http://recaptcha:8090",
  "secret": "change_me",
  "ttl_seconds": 120
}
```

| 变量 / 配置 | 用途 |
| ------------------ | ------- |
| `CAPTCHA_ENABLED` | 开关（`config.json` → `CAPTCHA.enabled`） |
| `CAPTCHA_SERVICE_URL` | Backend → recaptcha（Compose 中为 `http://recaptcha:8090`） |
| `CAPTCHA_SECRET` | 须与 recaptcha 容器一致；仅内部 verify |
| `CAPTCHA_TTL_SECONDS` | Redis 中挑战有效期 |
| `CAPTCHA_PORT` | Recaptcha 监听端口（默认 `8090`） |

Recaptcha 由 [`recaptcha/`](recaptcha/) 构建（Flask + Redis + Pillow）。**verify** 端点不经 nginx 暴露；公开仅为 `/api/captcha/v1/…` 的挑战创建与图片获取。本地前端开发见 [DEVELOPMENT.zh.md](DEVELOPMENT.zh.md#本地前端开发)。

### 修改配置后

- `.env` 中运行时 backend 项（含邮件 SMTP、`CAPTCHA_*`）— 重启：`docker compose up -d`
- `CAPTCHA_SECRET` 或 recaptcha 代码 — 重建 recaptcha：`docker compose up -d --build recaptcha`
- UI 中 `SITE_NAME`、品牌或 `MAIL_ENABLED` — 重建 frontend：`docker compose up -d --build frontend`
- 邮件 MJML 源 — 重建 backend（模板在镜像构建阶段编译）

---

## 离线包

隔离网络主机上，构建并导出预构建镜像：

```bash
./scripts/build-offline-package.sh <target>   # 需要 .env.<target>
```

输出：`docker-images/<target>/`，含镜像 tarball、[docker-compose.offline.yml](docker-compose.offline.yml) 复制的 `docker-compose.yml` 及 `.env`。

离线主机：

```bash
cd docker-images/<target>
docker load -i auth-backend.tar.gz
docker load -i auth-frontend.tar.gz
docker load -i auth-recaptcha.tar.gz
docker load -i redis-7-alpine.tar.gz
docker load -i postgres-15.tar.gz
docker compose up -d
```

与在线 compose 相同的数据库自动 bootstrap（`RUN_MIGRATIONS`、`RUN_INIT_DB`）。

---

## 参考

| 主题 | 说明 |
| ----- | ----- |
| 前端应用根路径 | `VITE_SITE_BASE_URL` / `FRONTEND_BASE_PATH` — 路由、`/api`、`/upload`（须与 `SITE.base_url` 一致） |
| 前端静态资源根 | Flask 直连用 `VITE_STATIC_PATH=static/`；Docker/nginx **留空**（`/assets/…`） |
| 离线包 | `./scripts/build-offline-package.sh <target>` → `docker-images/<target>/` |
| DB bootstrap（Docker） | 启动时自动：`RUN_MIGRATIONS` + `RUN_INIT_DB`（默认 `true`）；恢复用 `flask reset-admin-password` — 见 [DEVELOPMENT.zh.md](DEVELOPMENT.zh.md#数据库迁移) |
| 登录 CAPTCHA | [recaptcha/](recaptcha/) + `config.json` / `.env` 中 `CAPTCHA_*` |
| GeoLite 文件 | [mmdb/source.txt](mmdb/source.txt)、[scripts/download-mmdb.sh](scripts/download-mmdb.sh) |
| 外发邮件（Docker） | `.env` 中 `MAIL_SMTP_*`；backend 使用 msmtp |
| 邮件调试 | [DEVELOPMENT.zh.md](DEVELOPMENT.zh.md#邮件调试) |
| 邮件默认关闭 | `config.example.json` 默认；启用设 `MAIL_ENABLED=true` + `MAIL_SMTP_*` |
| OAuth 客户端应用 | [auth_connect](https://github.com/tjumyk/auth_connect) — 见 [DEVELOPMENT.zh.md](DEVELOPMENT.zh.md#客户端-sdk) |
| OAuth 客户端 bootstrap | `.env` 中 `OAUTH_CLIENT_*` — 启动时自动导入 |
