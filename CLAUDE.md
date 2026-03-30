# CLAUDE.md

## Project Overview

Podsync UI is a web management sidecar for Podsync — the tool that converts YouTube/Vimeo channels into podcast RSS feeds. It manages Podsync's `config.toml`, browses downloaded episodes, and restarts the Podsync container via Docker socket or SSH.

## Architecture

- **Monorepo** with npm workspaces: `packages/shared`, `packages/server`, `packages/client`
- **Backend**: Fastify (Node.js/TypeScript) — REST API on port 3000
- **Frontend**: React 19 + Vite + Tailwind + shadcn/ui — SPA served by Fastify in production, Vite dev server (port 5173) in development
- **Provider abstraction**: `FileProvider` and `ContainerManager` interfaces with `local` (fs + dockerode) and `ssh` (ssh2/SFTP) implementations, selected by `PODSYNC_MODE` env var

## Key Commands

```bash
npm run dev          # Start server + client with hot reload (concurrently)
npm run dev:server   # Server only (tsx --watch)
npm run dev:client   # Client only (vite)
npm run build        # Build all: shared → client → server
npm run lint         # ESLint (TS) + Stylelint (CSS)
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier
npm run typecheck    # tsc --build
```

## Build & Deploy

```bash
# Docker build
docker build \
  --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  -t podsync-ui:latest .

# The GitHub Actions workflow (docker-build.yml) builds and pushes to GHCR automatically
# Image: ghcr.io/daleiii/podsync-ui:latest
```

## Project Structure

```
packages/
├── shared/src/
│   ├── types/           # PodsyncConfig, Episode, ContainerStatus, Auth types
│   ├── validation/      # Zod schemas (config.schema.ts)
│   └── index.ts         # Re-exports all types and schemas
├── server/src/
│   ├── config/env.ts    # All env var definitions
│   ├── providers/       # FileProvider + ContainerManager (local/ssh impls)
│   ├── services/        # toml.service, docker.service, episode.service, auth.service
│   ├── routes/          # health, config, feeds, episodes, tokens, settings, docker, auth, apply
│   ├── middleware/      # auth.middleware
│   └── app.ts           # Fastify app factory (registers plugins, routes, static serving)
└── client/src/
    ├── pages/           # Dashboard, Feeds, FeedDetail, Episodes, Tokens, Settings, Auth, Login
    ├── components/
    │   ├── layout/      # AppShell, Sidebar (with version footer), StatusBar
    │   └── ui/          # shadcn/ui components (auto-generated, don't edit directly)
    ├── hooks/           # React Query hooks (use-feeds, use-episodes, use-docker, use-settings)
    └── lib/             # api.ts (fetch wrapper), utils.ts (cn helper)
```

## Important Patterns

- **TOML round-tripping**: `toml-patch` library preserves comments and formatting. The `TomlService` reads the raw TOML string, parses it, merges changes, and patches the original string. Atomic writes via `.tmp` + rename.
- **Provider pattern**: Services use `getFileProvider()` and `getContainerManager()` from `providers/index.ts`, which returns local or SSH implementations based on `PODSYNC_MODE`.
- **Session auth**: `@fastify/cookie` + `@fastify/session` (pure JS, no native deps). Session secret stored in `auth.json`. The `sodium-native` based `@fastify/secure-session` was removed because it requires native compilation that fails on Alpine.
- **React state from server data**: Pages derive local form state from React Query data using the merge pattern (`const form = { ...serverData, ...localEdits }`). Do NOT use `useEffect` + `setState` to sync — the ESLint react-hooks plugin flags this.
- **Token masking**: API always masks token values in GET responses (first 4 + `****` + last 4 chars).
- **Client build**: The client `build` script runs only `vite build` (not `tsc`). TypeScript checking is separate via the `typecheck` script. The `@/` path alias resolves via Vite config, not tsc paths.

## Config Files

- `config.toml` — Podsync's own config, managed by our TOML service
- `auth.json` — Sidecar's auth config (in `SIDECAR_CONFIG_DIR`), stores enabled/username/passwordHash/sessionSecret
- `.env` — Local dev env vars (gitignored)
- `.env.example` — Template with all supported variables
- `components.json` — shadcn/ui configuration

## Environment Variables

Core: `PODSYNC_MODE`, `PORT`, `NODE_ENV`, `PODSYNC_CONFIG_PATH`, `PODSYNC_DATA_DIR`, `PODSYNC_CONTAINER_NAME`, `SIDECAR_CONFIG_DIR`, `GIT_COMMIT`, `BUILD_TIME`

SSH mode: `SSH_HOST`, `SSH_PORT`, `SSH_USERNAME`, `SSH_PASSWORD`, `SSH_KEY_PATH`, `SSH_KEY_PASSPHRASE`

## Gotchas

- The client's `@/` import alias only works with Vite, not bare `tsc`. That's why the client build skips tsc.
- `music-metadata` is imported via `createRequire` (CJS) because its ESM exports don't resolve cleanly in tsc.
- `toml-patch` is also CJS, imported via `createRequire`.
- Docker Compose workspace references need package names (`@podsync-ui/server`), not paths (`packages/server`).
- shadcn/ui components in `components/ui/` are generated code — they produce lint warnings (react-refresh) that are expected.
- The Dockerfile uses workspace names in `npm ci --workspace=packages/shared` — this works because npm resolves the directory path from the workspace declaration.
