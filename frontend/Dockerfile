FROM node:20-alpine AS builder

ARG ALPINE_MIRROR=mirrors.tuna.tsinghua.edu.cn
ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG VITE_BASE_URL=/

ENV VITE_BASE_URL=${VITE_BASE_URL}

RUN if [ -n "${ALPINE_MIRROR}" ]; then \
      sed -i "s/dl-cdn.alpinelinux.org/${ALPINE_MIRROR}/g" /etc/apk/repositories; \
    fi

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./frontend/
COPY frontend ./frontend
COPY config.example.json config*.json ./

RUN if [ -f config.prod.json ]; then \
      cp config.prod.json config.json; \
    elif [ -f config.json ]; then \
      echo "Using config.json from build context"; \
    else \
      echo "config.json is required when config.prod.json is not provided" >&2; \
      exit 1; \
    fi

WORKDIR /app/frontend

RUN npm config set registry "${NPM_REGISTRY}" || true

RUN if [ -d "/app/npm_cache" ] && [ -n "$(ls -A /app/npm_cache 2>/dev/null)" ]; then \
      mkdir -p /root/.npm && cp -r /app/npm_cache/* /root/.npm/ 2>/dev/null || true; \
      echo "Using offline npm cache"; \
    else \
      echo "npm_cache not found, will download packages"; \
    fi && \
    npm ci --prefer-offline --no-audit || npm ci --no-audit

RUN npm run build

FROM nginx:alpine

ARG ALPINE_MIRROR=mirrors.tuna.tsinghua.edu.cn

RUN if [ -n "${ALPINE_MIRROR}" ]; then \
      sed -i "s/dl-cdn.alpinelinux.org/${ALPINE_MIRROR}/g" /etc/apk/repositories; \
    fi

COPY --from=builder /app/static/browser /usr/share/nginx/html
COPY frontend/docker-entrypoint.sh /docker-entrypoint.d/40-generate-nginx-conf.sh
COPY frontend/nginx /etc/nginx/conf-templates
RUN chmod +x /docker-entrypoint.d/40-generate-nginx-conf.sh

ENV FRONTEND_BASE_PATH=/ \
    BACKEND_UPSTREAM=backend:8077

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
