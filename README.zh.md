<p align="center">
  <a href="README.zh.md"><img src="frontend/public/assets/images/logo-256.png" width="100" height="100" alt="Identity logo"></a>
</p>

<div align="center">

# Identity

_基于 OAuth 的身份管理系统_

[English](README.md) | [中文](README.zh.md)

</div>

Identity 是 OAuth 2.0 身份提供方：用户与组管理、OAuth 客户端注册、可选图片 CAPTCHA，并可通过 [auth_connect](https://github.com/tjumyk/auth_connect) 与应用集成。

## 文档

| 主题 | English | 中文 |
|------|---------|------|
| 本地环境、主机安装、前端开发、迁移 | [DEVELOPMENT.md](DEVELOPMENT.md) | [DEVELOPMENT.zh.md](DEVELOPMENT.zh.md) |
| Docker Compose、离线部署、高级配置 | [DEPLOYMENT.md](DEPLOYMENT.md) | [DEPLOYMENT.zh.md](DEPLOYMENT.zh.md) |

## 快速开始（Docker）

需要 [Docker](https://docs.docker.com/get-docker/) 与 Docker Compose — 本地试用无需复制配置文件。

```bash
docker compose up -d --build
```

打开 [http://localhost:8080/](http://localhost:8080/)，使用 `admin` / `PASSword` 登录（来自内置 `config.example.json`）。默认配置下外发邮件**关闭**。

Backend entrypoint 每次启动执行迁移与 admin 种子（`RUN_MIGRATIONS` 与 `RUN_INIT_DB` 默认为 `true`；均为幂等）。

**日志：** `docker compose logs -f frontend backend recaptcha redis db` · **停止：** `docker compose down`

生产配置、子路径、邮件、OAuth bootstrap、离线包见 [DEPLOYMENT.zh.md](DEPLOYMENT.zh.md)。

## 快速开始（主机）

```bash
conda create -n auth python=3.11
conda activate auth
pip install -r requirements.txt
cp config.example.json config.json
flask create-db && flask init-db
cd frontend && npm ci && npm run build
cd .. && flask run -p 8077
```

Vite 开发模式、邮件调试、数据库恢复见 [DEVELOPMENT.zh.md](DEVELOPMENT.zh.md)。
