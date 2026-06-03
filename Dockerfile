ARG PYTHON_BASE_IMAGE=python:3.11-slim

FROM node:20-alpine AS mail_templates_builder

ARG ALPINE_MIRROR=mirrors.tuna.tsinghua.edu.cn
ARG NPM_REGISTRY=https://registry.npmmirror.com

RUN if [ -n "${ALPINE_MIRROR}" ]; then \
      sed -i "s/dl-cdn.alpinelinux.org/${ALPINE_MIRROR}/g" /etc/apk/repositories; \
    fi

WORKDIR /app/mail_templates/mjml

COPY mail_templates/mjml/package.json mail_templates/mjml/package-lock.json* ./
COPY mail_templates/mjml/ ./
COPY mail_templates/*.txt ../

RUN npm config set registry "${NPM_REGISTRY}" || true && \
    npm ci --prefer-offline --no-audit || npm ci --no-audit && \
    npm run build

FROM ${PYTHON_BASE_IMAGE}

WORKDIR /app

ARG APT_MIRROR=mirrors.tuna.tsinghua.edu.cn
ARG PIP_CACHE_DIR
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN if [ -n "${APT_MIRROR}" ]; then \
      sed -i "s/deb.debian.org/${APT_MIRROR}/g" /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
      sed -i "s|http://deb.debian.org|https://${APT_MIRROR}|g" /etc/apt/sources.list 2>/dev/null || true; \
    fi

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    gcc \
    gosu \
    msmtp-mta \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN pip config set global.index-url "${PIP_INDEX_URL}" && \
    pip config set global.trusted-host "${PIP_TRUSTED_HOST}" && \
    if [ -n "${PIP_CACHE_DIR}" ]; then \
      pip install --no-cache-dir --find-links "${PIP_CACHE_DIR}" --no-index -r requirements.txt || \
      pip install --no-cache-dir -r requirements.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

COPY app.py models.py error.py page_oauth.py api_account.py api_admin.py api_meta.py api_oauth.py ./
COPY services ./services
COPY utils ./utils
COPY --from=mail_templates_builder /app/mail_templates/*.txt ./mail_templates/
COPY --from=mail_templates_builder /app/mail_templates/*.html ./mail_templates/
COPY config.example.json config*.json ./

# GeoLite MMDB: optional at build time. Run ./scripts/download-mmdb.sh locally first;
# only *.mmdb present in the build context are copied (gitignored, not in git clone).
COPY mmdb/ /tmp/mmdb-in/
RUN mkdir -p mmdb && \
    cp -f /tmp/mmdb-in/source.txt /tmp/mmdb-in/.gitignore mmdb/ 2>/dev/null || true; \
    if compgen -G "/tmp/mmdb-in/*.mmdb" > /dev/null; then \
      cp /tmp/mmdb-in/*.mmdb mmdb/; \
      echo "GeoLite MMDB: included $(ls -1 mmdb/*.mmdb | wc -l) file(s) in image"; \
    else \
      echo "GeoLite MMDB: none in build context — run ./scripts/download-mmdb.sh before docker build for geo IP features"; \
    fi; \
    rm -rf /tmp/mmdb-in

RUN if [ -f config.prod.json ]; then \
      cp config.prod.json config.json; \
    elif [ -f config.json ]; then \
      echo "Using config.json from build context"; \
    elif [ -f config.example.json ]; then \
      cp config.example.json config.json; \
      echo "Using config.example.json as config.json"; \
    else \
      echo "No config file found (config.prod.json, config.json, or config.example.json)" >&2; \
      exit 1; \
    fi

RUN useradd -m -u 1000 appuser

COPY docker-entrypoint.sh scripts/configure-msmtp.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /usr/local/bin/configure-msmtp.sh

EXPOSE 8077

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('BACKEND_PORT', '8077') + '/api/meta/health')"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["sh", "-c", "gunicorn -b 0.0.0.0:${BACKEND_PORT:-8077} -w ${GUNICORN_WORKERS:-2} --threads ${GUNICORN_THREADS:-8} --timeout ${GUNICORN_TIMEOUT:-120} --log-file - --access-logfile - app:app"]
