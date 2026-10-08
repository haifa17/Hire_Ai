# syntax=docker/dockerfile:1
# ============================================================
# TalentBridge AI — Python FastAPI AI microservice
# ============================================================
# Multi-stage: builder compiles/collects wheels into a virtualenv, runtime
# copies that venv into a clean python-slim image without the C toolchain.
#
# Alpine is deliberately NOT used here: torch, easyocr and FlagEmbedding
# publish manylinux (glibc) wheels only, so musl would force a multi-hour
# source build. `python:3.11-slim` is the small-and-compatible choice.
# ============================================================

ARG PYTHON_VERSION=3.11-slim


# ── Stage 1: build the virtualenv ────────────────────────────
FROM python:${PYTHON_VERSION} AS builder

# build-essential/libpq-dev are needed only while resolving and building
# dependencies; they never reach the runtime image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /app

# torch is installed FIRST, and explicitly from PyTorch's CPU-only index.
# The default PyPI wheel bundles the full CUDA runtime (~2.5 GB of nvidia-*
# libraries) that this service can never use — it runs sentence-transformers
# and easyocr on CPU. Installing it up front means the later
# `-r requirements.txt` pass sees torch as already satisfied and keeps this
# build. Pinned to the same version requirements.txt asks for.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --only-binary :all: \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.13.0

COPY requirements.txt .

# `--only-binary :all:` forbids source distributions, so no dependency can
# execute setup.py code during the build. All pinned packages ship manylinux
# wheels, so this resolves cleanly.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --only-binary :all: -r requirements.txt


# ── Stage 2: runtime ─────────────────────────────────────────
FROM python:${PYTHON_VERSION} AS runtime

# libpq5 is the runtime half of libpq-dev (needed by the Postgres driver);
# libgomp1 is required by torch/easyocr; libgl1 + libglib2.0-0 by the OpenCV
# that easyocr pulls in. The -dev packages and compilers stay behind.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

COPY --from=builder $VIRTUAL_ENV $VIRTUAL_ENV

WORKDIR /app

RUN useradd --create-home --shell /usr/sbin/nologin appuser

# Only the application code is copied — explicitly, so that local noise
# (.venv, .env, __pycache__, model caches) cannot slip into the image even if
# .dockerignore were edited.
# Left owned by root and therefore read-only to `appuser`: a compromised
# request handler cannot rewrite the code it is running.
COPY app ./app
COPY data ./data
COPY main.py ./

# The embedding model (intfloat/multilingual-e5-small) is downloaded on first
# use. Pointing the cache at a writable, volume-backed directory keeps it
# across restarts instead of re-downloading on every `up`.
ENV HF_HOME=/home/appuser/.cache/huggingface
ENV SENTENCE_TRANSFORMERS_HOME=/home/appuser/.cache/huggingface

# /app/uploads is the volume shared with the NestJS backend: the matching
# pipeline reads the CV files the backend stored there.
# Only these two directories are writable by the runtime user; the code
# copied above stays root-owned and read-only.
RUN mkdir -p /app/uploads "$HF_HOME" \
    && chown -R appuser:appuser /app/uploads "$HF_HOME"

USER appuser

EXPOSE 8000

# urllib from the stdlib — avoids installing curl just to answer a probe.
# start-period is generous: the first request loads the transformer model.
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:'+os.getenv('AI_SERVICE_PORT','8000')+'/health', timeout=5).status==200 else 1)"

# Shell form so AI_SERVICE_HOST/AI_SERVICE_PORT stay configurable; `exec`
# keeps uvicorn as PID 1 so SIGTERM reaches it and shutdown stays graceful.
CMD ["sh", "-c", "exec uvicorn main:app --host ${AI_SERVICE_HOST:-0.0.0.0} --port ${AI_SERVICE_PORT:-8000}"]
