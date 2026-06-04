#!/bin/sh
set -eu

BASE_PATH="${FRONTEND_BASE_PATH:-/}"
BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-backend:8077}"
CAPTCHA_UPSTREAM="${CAPTCHA_UPSTREAM:-recaptcha:8090}"

case "${BASE_PATH}" in
  /*) ;;
  *) BASE_PATH="/${BASE_PATH}" ;;
esac

case "${BASE_PATH}" in
  */) ;;
  *) BASE_PATH="${BASE_PATH}/" ;;
esac

BASE_PATH_NO_TRAILING="${BASE_PATH%/}"

escape_sed() {
  printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

if [ "${BASE_PATH}" = "/" ]; then
  TEMPLATE_PATH="/etc/nginx/conf-templates/default.root.conf.template"
else
  TEMPLATE_PATH="/etc/nginx/conf-templates/default.subpath.conf.template"
fi

rm -f /etc/nginx/conf.d/default.root.conf /etc/nginx/conf.d/default.subpath.conf

cp "${TEMPLATE_PATH}" /etc/nginx/conf.d/default.conf
sed -i \
  -e "s/__BACKEND_UPSTREAM__/$(escape_sed "${BACKEND_UPSTREAM}")/g" \
  -e "s/__CAPTCHA_UPSTREAM__/$(escape_sed "${CAPTCHA_UPSTREAM}")/g" \
  -e "s/__BASE_PATH__/$(escape_sed "${BASE_PATH}")/g" \
  -e "s/__BASE_PATH_NO_TRAILING__/$(escape_sed "${BASE_PATH_NO_TRAILING}")/g" \
  /etc/nginx/conf.d/default.conf
