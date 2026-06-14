# ─── Stage 1: Install all dependencies ──────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/
COPY packages/client/ packages/client/
RUN npm run build -w packages/shared && \
    npm run build -w packages/client && \
    npm run build -w packages/server

# ─── Stage 3: Production node_modules only ───────────────────────────────────
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci --omit=dev --workspace=packages/shared --workspace=packages/server

# ─── Stage 4: Runtime ────────────────────────────────────────────────────────
FROM node:20-alpine

# yt-dlp via pip — standalone PyInstaller binary requires glibc and won't run on Alpine
RUN apk add --no-cache python3 py3-pip && \
    python3 -m pip install --break-system-packages --no-cache-dir yt-dlp && \
    yt-dlp --version

LABEL org.opencontainers.image.title="Podsync UI"
LABEL org.opencontainers.image.description="Web management interface for Podsync — manage feeds, episodes, and configuration"

ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"
LABEL org.opencontainers.image.created="${BUILD_TIME}"

WORKDIR /app

# Production node_modules — copied directly, no npm ci needed here
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/package.json /app/package-lock.json ./
COPY --from=prod-deps /app/packages/shared/package.json packages/shared/
COPY --from=prod-deps /app/packages/server/package.json packages/server/

# Built artifacts
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/server/dist packages/server/dist
COPY --from=builder /app/packages/client/dist packages/server/public

ENV GIT_COMMIT=${GIT_COMMIT}
ENV BUILD_TIME=${BUILD_TIME}
ENV NODE_ENV=production
ENV PORT=3000
ENV PODSYNC_MODE=local
ENV PODSYNC_CONFIG_PATH=/app/config/config.toml
ENV PODSYNC_DATA_DIR=/app/data
ENV PODSYNC_CONTAINER_NAME=podsync
ENV SIDECAR_CONFIG_DIR=/app/sidecar-config

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "packages/server/dist/index.js"]
