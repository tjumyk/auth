# Identity Management System

## Requirements

1. nodejs
2. postgresql

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
