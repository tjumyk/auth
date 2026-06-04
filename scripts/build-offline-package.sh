#!/usr/bin/env bash
# Build Docker images for a named deployment target and export an offline bundle.
#
# Each target uses its own env file: .env.<target> (e.g. .env.neops).
# Run ./scripts/download-mmdb.sh before build if the target needs GeoLite in the backend image.
#
# Output layout:
#   docker-images/<target>/
#     auth-backend.tar.gz
#     auth-backend.tar.gz.image-id   (cached image ID; do not edit)
#     auth-frontend.tar.gz
#     ...
#     docker-compose.yml   (from docker-compose.offline.yml)
#     .env                 (copy of .env.<target>)
#
# Pull: only when the image is not already present locally.
# Save: skipped when the archive exists and the image ID matches the last export.
# Config: docker-compose.yml and .env copied only when content changed (cmp).
#
# On the offline host (from that directory):
#   docker load -i auth-backend.tar.gz
#   docker load -i auth-frontend.tar.gz
#   docker load -i auth-recaptcha.tar.gz
#   docker load -i redis-7-alpine.tar.gz
#   docker load -i postgres-15.tar.gz
#   docker compose up -d
#
# Usage:
#   ./scripts/build-offline-package.sh neops

set -euo pipefail

usage() {
  echo "Usage: $0 <target>" >&2
  echo "  <target>   env file must exist as .env.<target>" >&2
  exit 1
}

TARGET="${1:-}"
[[ -n "$TARGET" ]] || usage
if [[ "${2:-}" == "--include-postgres" ]]; then
  echo "note: --include-postgres is no longer needed; postgres is always exported" >&2
elif [[ -n "${2:-}" ]]; then
  usage
fi

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
  echo "build-offline-package: linked .env -> .env.${TARGET} for docker compose build"
}

image_id() {
  docker image inspect --format '{{.Id}}' "$1"
}

ensure_image() {
  local image="$1"
  if docker image inspect "$image" >/dev/null 2>&1; then
    echo "build-offline-package: using local image ${image}"
    return 0
  fi
  echo "build-offline-package: pulling ${image}"
  docker pull "$image"
}

save_image_if_changed() {
  local image="$1"
  local archive="$2"
  local id_file="${archive}.image-id"

  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "error: image not found: ${image} (run docker compose build first)" >&2
    exit 1
  fi

  local current_id
  current_id="$(image_id "$image")"
  if [[ -f "$archive" && -f "$id_file" ]]; then
    local saved_id
    saved_id="$(<"$id_file")"
    if [[ "$saved_id" == "$current_id" ]]; then
      echo "build-offline-package: skip save (unchanged ${current_id}): ${image}"
      return 0
    fi
    echo "build-offline-package: image changed ${saved_id} -> ${current_id}; re-export ${image}"
  else
    echo "build-offline-package: saving ${image} (${current_id}) -> ${archive}"
  fi

  docker save "$image" | gzip > "$archive"
  printf '%s\n' "$current_id" > "$id_file"
}

ensure_and_save_image() {
  ensure_image "$1"
  save_image_if_changed "$1" "$2"
}

copy_file_if_changed() {
  local src="$1"
  local dest="$2"
  local label="$3"
  if [[ -f "$dest" ]] && cmp -s "$src" "$dest"; then
    echo "build-offline-package: skip copy (unchanged): ${label}"
    return 0
  fi
  echo "build-offline-package: copying ${label} -> ${dest}"
  cp -p "$src" "$dest"
}

trap restore_env EXIT

echo "build-offline-package: target=${TARGET}"
echo "build-offline-package: using ${ENV_SOURCE}"

prepare_env

cd "$REPO_ROOT"
docker compose build

mkdir -p "$OUT_DIR"

save_image_if_changed auth-backend:latest "${OUT_DIR}/auth-backend.tar.gz"
save_image_if_changed auth-frontend:latest "${OUT_DIR}/auth-frontend.tar.gz"
save_image_if_changed auth-recaptcha:latest "${OUT_DIR}/auth-recaptcha.tar.gz"
ensure_and_save_image redis:7-alpine "${OUT_DIR}/redis-7-alpine.tar.gz"
ensure_and_save_image postgres:15 "${OUT_DIR}/postgres-15.tar.gz"

copy_file_if_changed \
  "${REPO_ROOT}/docker-compose.offline.yml" \
  "${OUT_DIR}/docker-compose.yml" \
  "docker-compose.offline.yml"
copy_file_if_changed \
  "$ENV_SOURCE" \
  "${OUT_DIR}/.env" \
  ".env.${TARGET}"

echo "build-offline-package: done -> ${OUT_DIR}"
