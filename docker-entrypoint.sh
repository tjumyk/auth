#!/bin/bash
set -e

UPLOAD_DIR="${UPLOAD_ROOT_FOLDER:-upload}"

mkdir -p "${UPLOAD_DIR}"
chown -R appuser:appuser /app "${UPLOAD_DIR}"

/usr/local/bin/configure-msmtp.sh

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  gosu appuser flask create-db
fi

if [ "${RUN_INIT_DB:-true}" = "true" ]; then
  gosu appuser flask init-db
fi

if [ -n "${OAUTH_CLIENT_NAME:-}" ]; then
  gosu appuser flask import-oauth-client-from-env || true
elif [ -n "${OAUTH_CLIENTS_FILE:-}" ] && [ -f "${OAUTH_CLIENTS_FILE}" ]; then
  gosu appuser flask import-oauth-clients "${OAUTH_CLIENTS_FILE}" || true
fi

exec gosu appuser "$@"
