# Development

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
git clone https://github.com/daleiii/podsync-ui.git
cd podsync-ui
npm install
```

## Running

```bash
# Start both server (port 3000) and client (port 5173) with hot reload
npm run dev

# Or run individually
npm run dev:server
npm run dev:client
```

The Vite dev server proxies `/api` requests to the Fastify backend.

Create a `.env` file for local development:

```env
PODSYNC_MODE=local
PODSYNC_CONFIG_PATH=./config/config.toml
PODSYNC_DATA_DIR=./data
PODSYNC_CONTAINER_NAME=podsync
SIDECAR_CONFIG_DIR=./sidecar-config
PORT=3000
```

## Project Structure

```
podsync-ui/
├── packages/
│   ├── shared/              # TypeScript types + Zod schemas
│   │   └── src/
│   │       ├── types/       # Config, Episode, Docker, Auth types
│   │       └── validation/  # Zod schemas for all config sections
│   ├── server/              # Fastify backend
│   │   └── src/
│   │       ├── config/      # Environment variable loading
│   │       ├── providers/   # FileProvider + ContainerManager (local/SSH)
│   │       ├── routes/      # API route handlers
│   │       ├── services/    # Business logic (TOML, Docker, Episodes, Auth)
│   │       └── middleware/   # Auth middleware
│   └── client/              # React + Vite frontend
│       └── src/
│           ├── components/  # Layout, UI (shadcn/ui), feature components
│           ├── hooks/       # React Query hooks
│           ├── lib/         # API client, utilities
│           └── pages/       # Route pages
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml        # Pre-built image (local mode)
├── docker-compose.dev.yml    # Build from source (local mode)
└── docker-compose.ssh.yml    # Pre-built image (SSH mode)
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start server + client with hot reload |
| `npm run build` | Build all packages for production |
| `npm run lint` | Run ESLint + Stylelint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | TypeScript type checking |

## Docker (Build from Source)

Use `docker-compose.dev.yml` to build the image locally instead of pulling from GHCR:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Or build the image directly:

```bash
docker build \
  --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  -t podsync-ui:latest .
```

## Tech Stack

- **Backend**: Node.js, TypeScript, Fastify
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui (Radix primitives)
- **State**: TanStack React Query
- **Forms**: react-hook-form + Zod validation
- **TOML**: toml-patch (comment-preserving round-trips)
- **Docker**: dockerode (local), ssh2 (remote)
- **Auth**: bcrypt, @fastify/session
- **Monorepo**: npm workspaces
