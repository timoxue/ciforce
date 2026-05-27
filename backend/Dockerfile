FROM python:3.11-slim

# System deps:
#   libgomp1     — onnxruntime (rembg)
#   libglib2.0-0 — pillow image plugins
#   curl         — healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgomp1 \
      libglib2.0-0 \
      curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (better layer caching).
# Use a fast mirror — default PyPI is slow/unreliable from many networks.
ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
 && pip install --no-cache-dir "rembg[cpu]"

# u2net model (~170MB) is downloaded lazily on the first /product-shot/run
# call and cached to /app/.u2net (mounted as the `rembg-models` named volume
# in docker-compose). Pre-baking it at build time is unreliable from many
# networks (GitHub releases often time out), so we accept a one-time slow
# first request in exchange for a buildable image anywhere.
#
# To pre-seed: drop u2net.onnx into the rembg-models volume manually, e.g.
#   docker run --rm -v ciforce_rembg-models:/m -v "$PWD":/host alpine \
#     cp /host/u2net.onnx /m/u2net.onnx
ENV U2NET_HOME=/app/.u2net
RUN mkdir -p /app/.u2net

COPY . .

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
