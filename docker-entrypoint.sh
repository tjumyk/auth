#!/bin/bash
set -e

UPLOAD_DIR="${UPLOAD_ROOT_FOLDER:-upload}"

mkdir -p "${UPLOAD_DIR}"
chown -R appuser:appuser /app "${UPLOAD_DIR}"

/usr/local/bin/configure-msmtp.sh

exec gosu appuser "$@"
