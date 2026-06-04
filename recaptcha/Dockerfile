ARG PYTHON_BASE_IMAGE=python:3.11-slim

FROM ${PYTHON_BASE_IMAGE}

WORKDIR /app

ARG APT_MIRROR=mirrors.tuna.tsinghua.edu.cn
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    CAPTCHA_PORT=8090

RUN if [ -n "${APT_MIRROR}" ]; then \
      sed -i "s/deb.debian.org/${APT_MIRROR}/g" /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
      sed -i "s|http://deb.debian.org|https://${APT_MIRROR}|g" /etc/apt/sources.list 2>/dev/null || true; \
    fi

RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    ${PIP_INDEX_URL:+--index-url "$PIP_INDEX_URL"} \
    ${PIP_TRUSTED_HOST:+--trusted-host "$PIP_TRUSTED_HOST"}

COPY . .

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('CAPTCHA_PORT', '8090') + '/api/meta/health')"

CMD ["gunicorn", "-b", "0.0.0.0:8090", "-w", "2", "app:app"]
