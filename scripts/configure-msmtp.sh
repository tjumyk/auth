#!/bin/bash
# Generate msmtp config for the appuser when MAIL_SMTP_HOST is set.
set -e

configure_msmtp() {
  local host="${MAIL_SMTP_HOST:-}"

  if [ -z "$host" ] || [ "${MAIL_ENABLED:-true}" = "false" ]; then
    return 0
  fi

  local port="${MAIL_SMTP_PORT:-587}"
  local from="${MAIL_FROM:-noreply@localhost}"
  local user="${MAIL_SMTP_USER:-}"
  local password="${MAIL_SMTP_PASSWORD:-}"
  local tls="${MAIL_SMTP_TLS:-on}"
  local starttls="${MAIL_SMTP_STARTTLS:-on}"
  local auth="${MAIL_SMTP_AUTH:-on}"
  local msmtprc="/home/appuser/.msmtprc"

  {
    echo "defaults"
    echo "auth           ${auth}"
    if [ "$tls" = "on" ]; then
      echo "tls            on"
      echo "tls_trust_file /etc/ssl/certs/ca-certificates.crt"
      if [ "$starttls" = "on" ]; then
        echo "tls_starttls   on"
      fi
    else
      echo "tls            off"
    fi
    echo "logfile        -"
    echo ""
    echo "account        default"
    echo "host           ${host}"
    echo "port           ${port}"
    echo "from           ${from}"
    if [ -n "$user" ]; then
      echo "user           ${user}"
    fi
    if [ -n "$password" ]; then
      echo "password       ${password}"
    fi
    echo ""
    echo "account default : default"
  } > "$msmtprc"

  chown appuser:appuser "$msmtprc"
  chmod 600 "$msmtprc"
}

configure_msmtp
