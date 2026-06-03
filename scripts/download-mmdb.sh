#!/bin/sh
# Download GeoLite2 MMDB files from P3TERX/GeoLite.mmdb releases (see mmdb/source.txt).
set -eu

TARGET_DIR="${1:-mmdb}"
TAG="${GEOLITE_MMDB_TAG:-2026.06.01}"
BASE_URL="https://github.com/P3TERX/GeoLite.mmdb/releases/download/${TAG}"

# Minimum bytes to treat an existing file as complete (avoid reusing failed partial downloads).
min_bytes() {
  case "$1" in
    GeoLite2-Country.mmdb) echo 5000000 ;;
    GeoLite2-City.mmdb) echo 50000000 ;;
    GeoLite2-ASN.mmdb) echo 5000000 ;;
    *) echo 1000000 ;;
  esac
}

FILES="GeoLite2-Country.mmdb GeoLite2-City.mmdb GeoLite2-ASN.mmdb"

mkdir -p "${TARGET_DIR}"

for name in ${FILES}; do
  dest="${TARGET_DIR}/${name}"
  min="$(min_bytes "${name}")"
  if [ -f "${dest}" ] && [ "${GEOLITE_MMDB_FORCE_DOWNLOAD:-0}" != "1" ]; then
    size="$(wc -c < "${dest}" | tr -d ' ')"
    if [ "${size}" -ge "${min}" ]; then
      echo "mmdb: ${name} already present (${size} bytes), skipping"
      continue
    fi
    echo "mmdb: ${name} incomplete (${size} bytes), re-downloading"
    rm -f "${dest}"
  fi
  echo "mmdb: downloading ${name} (release ${TAG})..."
  tmp="${dest}.part"
  curl -fsSL --retry 5 --retry-delay 10 --connect-timeout 60 --max-time 1800 \
    -o "${tmp}" "${BASE_URL}/${name}"
  mv "${tmp}" "${dest}"
done

echo "mmdb: done (${TARGET_DIR})"
