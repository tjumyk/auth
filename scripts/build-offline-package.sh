#!/usr/bin/env bash
# Build Docker images for a named deployment target and export an offline bundle.
#
# Each target uses its own env file: .env.<target> (e.g. .env.neops).
#
# Output layout:
#   docker-images/<target>/
#     auth-backend.tar.gz
#     auth-frontend.tar.gz
#     docker-compose.yml   (from docker-compose.offline.yml)
#     .env                 (copy of .env.<target>)
#
# Usage:
#   ./scripts/build-offline-package.sh neops
#   ./scripts/build-offline-package.sh neops --include-postgres

set -euo pipefail

usage() {
  echo "Usage: $0 <target> [--include-postgres]" >&2
  echo "  <target>             env file must exist as .env.<target>" >&2
  echo "  --include-postgres   also export postgres:15 (for fully offline hosts)" >&2
  exit 1
}

TARGET="${1:-}"
INCLUDE_POSTGRES=0
if [[ "${2:-}" == "--include-postgres" ]]; then
  INCLUDE_POSTGRES=1
elif [[ -n "${2:-}" ]]; then
  usage
fi
[[ -n "$TARGET" ]] || usage

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_SOURCE="${REPO_ROOT}/.env.${TARGET}"
OUT_DIR="${REPO_ROOT}/docker-images/${TARGET}"
PREV_ENV_BACKUP=""

if [[ ! -f "$ENV_SOURCE" ]]; then
  echo "error: missing env file ${ENV_SOURCE}" >&2
  exit 1
fi

restore_env() {
  cd "$REPO_ROOT"
  rm -f .env
  if [[ -n "$PREV_ENV_BACKUP" && -e "${PREV_ENV_BACKUP}/.env" ]]; then
    if [[ -L "${PREV_ENV_BACKUP}/.env" ]]; then
      ln -s "$(readlink "${PREV_ENV_BACKUP}/.env")" .env
    else
      cp -p "${PREV_ENV_BACKUP}/.env" .env
    fi
    rm -rf "$PREV_ENV_BACKUP"
  fi
}

prepare_env() {
  cd "$REPO_ROOT"
  if [[ -e .env || -L .env ]]; then
    PREV_ENV_BACKUP="$(mktemp -d "${TMPDIR:-/tmp}/auth-env-backup.XXXXXX")"
    if [[ -L .env ]]; then
      ln -s "$(readlink .env)" "${PREV_ENV_BACKUP}/.env"
    else
      cp -p .env "${PREV_ENV_BACKUP}/.env"
    fi
  fi
  rm -f .env
  ln -s ".env.${TARGET}" .env
}

trap restore_env EXIT

echo "build-offline-package: target=${TARGET}"
echo "build-offline-package: using ${ENV_SOURCE}"

prepare_env

cd "$REPO_ROOT"
docker compose build

mkdir -p "$OUT_DIR"

echo "build-offline-package: saving auth-backend:latest -> ${OUT_DIR}/auth-backend.tar.gz"
docker save auth-backend:latest | gzip > "${OUT_DIR}/auth-backend.tar.gz"

echo "build-offline-package: saving auth-frontend:latest -> ${OUT_DIR}/auth-frontend.tar.gz"
docker save auth-frontend:latest | gzip > "${OUT_DIR}/auth-frontend.tar.gz"

if [[ "$INCLUDE_POSTGRES" -eq 1 ]]; then
  echo "build-offline-package: pulling postgres:15 (if needed)"
  docker pull postgres:15
  echo "build-offline-package: saving postgres:15 -> ${OUT_DIR}/postgres-15.tar.gz"
  docker save postgres:15 | gzip > "${OUT_DIR}/postgres-15.tar.gz"
fi

cp -p "${REPO_ROOT}/docker-compose.offline.yml" "${OUT_DIR}/docker-compose.yml"
cp -p "$ENV_SOURCE" "${OUT_DIR}/.env"

echo "build-offline-package: done -> ${OUT_DIR}"
