# Identity Management System

## Requirements

1. nodejs
2. postgresql
3. msmtp-mta (for sending e-mails, also need to setup an smtp provider in `/etc/msmtprc`, e.g. [Setup Aliyun DirectMail](https://gist.github.com/tjumyk/342611a2b2e7c5f12a9ea9d1162c8b26))

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
npm i
NODE_OPTIONS=--openssl-legacy-provider npm run build
cd ..
```

For node version < 17:
```bash
cd angular
npm i
npm run build
cd ..
```

**Note:** the above commands only build the development package. You may replace `npm run build` with `npm run build-prod` to build the production (minimized) package. 

3. setup database
```bash
createuser auth -P
# put a new password when prompt

createdb auth -O auth
```

**Note:** You need to be a database superuser or switch to the `postgres` user to run the commands above.

4. download GeoLite data files

Please refer to [this repo](https://github.com/P3TERX/GeoLite.mmdb) to download `GeoLite2-ASN.mmdb`, `GeoLite2-City.mmdb` and `GeoLite2-Country.mmdb`, and save them in `mmdb` folder under the project root.

5. build email templates

```bash
cd mail_templates/mjml
npm i
npm run build
cd ../..
```

## Configuration

### 1. Create server configuration file `config.json`

First, you may copy the example file to obtain a default configuration file.

```bash
cp config.example.json config.json
```

Then, please update the following settings.

1. Update `SECRET_KEY` with a good random string, e.g. using the following script to generate one:
```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(8))'
```

2. Update `SQLALCHEMY_DATABASE_URI` with a postgresql db connection url, `postgresql://auth:PASSWORD@127.0.0.1:5432/auth`. (replace `PASSWORD` with real password)
3. Delete `EXTERNAL_USER_INFO`, `EXTERNAL_AUTH_PROVIDERS`
4. Update `ADMIN` with real username, email address and password for admin.
5. Delete `mail_catcher` in `MAIL`, edit other fields according to real setup
6. Edit `SITE` according to real setup

### 2. Edit front-end environment variables

Update the variables (except `production`) in the following environment files.

1. [angular/src/environments/environment.ts](angular/src/environments/environment.ts) (for debugging) 
2. [angular/src/environments/environment.prod.ts](angular/src/environments/environment.prod.ts) (for production)

**Note:** After any update, you must re-build the front-end to apply the changes.

### 3. Update static title of front-end (optional)

The titles of the webpages are updated according to the environment variables mentioned above, but this update is done at runtime, requiring running the Javascript.
For SEO purpose, you need to ensure the **static** HTML title is also the correct one. To achieve this, please update the `<title>` tag in [angular/src/index.html](angular/src/index.html).

**Note:** After any update, you must re-build the front-end to apply the changes.

### 4. Replace the default image assets (optional)

Replace the following image/icon files according to your need.

1. [angular/src/assets/images/banner.png](angular/src/assets/images/banner.png)
2. [angular/src/assets/images/logo-64.png](angular/src/assets/images/logo-64.png)
3. [angular/src/assets/images/logo-128.png](angular/src/assets/images/logo-128.png)
4. [angular/src/assets/images/logo-256.png](angular/src/assets/images/logo-256.png)
5. [angular/src/favicon.ico](angular/src/favicon.ico)

**Note:** After any update, you must re-build the front-end to apply the changes.

### 5. Update contents in email templates

Update the contents of the following files according to your need.

1. [mail_templates/confirm_email.txt](mail_templates/confirm_email.txt)
2. [mail_templates/mjml/src/confirm_email.mjml](mail_templates/mjml/src/confirm_email.mjml)
3. [mail_templates/mjml/src/include/header.mjml](mail_templates/mjml/src/include/header.mjml)
4. [mail_templates/mjml/src/include/footer.mjml](mail_templates/mjml/src/include/footer.mjml)

**Note:** After any update, you must re-build the email templates **and restart the server** to apply the changes.

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
pip install gunicorn eventlet
gunicorn --worker-class eventlet -w 4 -b 127.0.0.1:8077 app:app
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
ExecStart=/home/kelvin/miniconda3/envs/idm/bin/gunicorn --worker-class eventlet -w 4 -b '127.0.0.1:8077' app:app
WorkingDirectory=/home/kelvin/projects/auth
Restart=always
RestartSec=1min

[Install]
WantedBy=multi-user.target
```

Then, start and enable the service:
```bash
sudo systemctl start idm.service
sudo systemctl enable idm.service
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

Then, enable the service with supervisor controller:
```bash
sudo supervisorctl update
```
