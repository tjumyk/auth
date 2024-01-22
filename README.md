# Identity Management System

## Requirements

1. nodejs
2. postgresql
3. msmtp-mta (for sending e-mails, also need to setup an smtp provider in `/etc/msmtprc`, e.g. [Aliyun DirectMail](https://aliyun.com/product/directmail))

## Setup

1. prepare python environment
```bash
# prepare a python virtual environment first
pip install -r requirements.txt
```

2. build front-end

For node version >= 17:
```bash
cd angular
NODE_OPTIONS=--openssl-legacy-provider npm run build
cd ..
```

For node version < 17:
```bash
cd angular
npm run build
cd ..
```

4. setup database
```bash
createuser auth -P
# put a new password when prompt

createdb auth -O auth
```

## Configuration

```bash
cp config.example.json config.json
# edit config.json
```

### Edit `config.json`

1. Update `SECRET_KEY` with a good random string, e.g. using the following script to generate one:
```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(8))'
```

2. Update `SQLALCHEMY_DATABASE_URI` with a postgresql db connection url, `postgresql://auth:PASSWORD@127.0.0.1:5432/auth`. (replace `PASSWORD` with real password)
3. Delete `EXTERNAL_USER_INFO`, `EXTERNAL_AUTH_PROVIDERS`
4. Update `ADMIN` with real username, email address and password for admin.
5. Delete `mail_catcher` in `MAIL`, edit other fields according to real setup
6. Edit `SITE` according to real setup

## Initialization

```bash
flask create-db
flask init-db
```

## Run
```bash
flask run -p 8077
```
### Notes for running in production environment
1. use a better server than flask, e.g. `gunicorn`

```bash
pip install gunicorn
gunicorn -w 4 -b 127.0.0.1:8077 app:app
```
2. use a reverse proxy (e.g. nginx) and HTTPS certificate (e.g. certbot) for public endpoint
3. register system service to auto-start the server after each system reboot, e.g.

(option 1) add a systemd configuration file in `/etc/systemd/system/`, e.g. `idm.service`:
```
[Unit]
Description=idm system daemon
After=syslog.target network.target
Wants=network.target

[Service]
Type=simple
ExecStart=/home/kelvin/miniconda3/envs/idm/bin/gunicorn -w 4 -b '127.0.0.1:8077' app:app
Restart=always
RestartSec=1min

[Install]
WantedBy=multi-user.target
```

(option 2) install `supervisor` and add a configuration in `/etc/supervisor/conf.d`, e.g. `idm.conf`:
```
[program:idm]
user=kelvin
command=/home/kelvin/miniconda3/envs/idm/bin/gunicorn -w 4 -b '127.0.0.1:8077' app:app
directory=/home/kelvin/projects/idm
autostart=true
autorestart=true
```
