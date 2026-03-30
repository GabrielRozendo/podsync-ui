# Podsync UI

A web management interface for [Podsync](https://github.com/mxpv/podsync) — the tool that converts YouTube, Vimeo, and other video channels into podcast RSS feeds.

Podsync UI runs as a Docker sidecar alongside your Podsync instance, providing a clean web interface to manage feeds, browse downloaded episodes, edit configuration, and restart the container — all without touching TOML files or the command line.

## Features

- **Feed Management** — Create, edit, and delete podcast feeds with full control over format, quality, filters, metadata, hooks, and cleanup policies
- **Episode Browser** — View downloaded episodes per feed with file size, duration, download date, and format info
- **RSS URL Display** — Each feed shows its podcast RSS URL with one-click copy for adding to podcast apps
- **Token Management** — Manage YouTube, Vimeo, SoundCloud, and Twitch API keys with masked display and rotation support
- **Settings Editor** — Edit all Podsync config sections: server, storage, cleanup, downloader, and logging
- **Container Health** — Live status of the Podsync container (running/stopped, uptime) with restart controls
- **Apply & Restart** — Write config changes and restart Podsync with one click; detects when config has changed since last restart
- **Authentication** — Optional basic auth that can be enabled/disabled from within the UI
- **TOML Preservation** — Config edits preserve existing comments and formatting via `toml-patch`
- **Local or SSH** — Manage Podsync on the same host (bind mounts) or a remote server (SSH)

## Architecture

```
┌──────────────────────────────────────────────┐
│  Docker Host                                 │
│                                              │
│  ┌──────────┐    ┌───────────────────────┐   │
│  │ podsync  │    │ podsync-ui            │   │
│  │ :8080    │    │ :3000                 │   │
│  │          │    │  Fastify API (/api/*) │   │
│  │          │    │  React SPA  (/)       │   │
│  └────┬─────┘    └──┬──────┬─────────┬──┘   │
│       │             │      │         │       │
│       ▼             ▼      ▼         ▼       │
│   config.toml ◄── shared  data/    docker    │
│                   volume   (ro)    socket     │
└──────────────────────────────────────────────┘
```

## Quick Start

Pull the pre-built image and run alongside Podsync:

```bash
mkdir -p config data
```

Create a `docker-compose.yml`:

```yaml
services:
  podsync:
    image: mxpv/podsync:latest
    container_name: podsync
    volumes:
      - ./config:/app/config
      - ./data:/app/data
    ports:
      - "8080:8080"
    restart: unless-stopped

  podsync-ui:
    image: ghcr.io/daleiii/podsync-ui:latest
    container_name: podsync-ui
    volumes:
      - ./config:/app/config
      - ./data:/app/data:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - sidecar-config:/app/sidecar-config
    ports:
      - "3000:3000"
    environment:
      - PODSYNC_MODE=local
      - PODSYNC_CONTAINER_NAME=podsync
      - PODSYNC_CONFIG_PATH=/app/config/config.toml
      - PODSYNC_DATA_DIR=/app/data
    depends_on:
      - podsync
    restart: unless-stopped

volumes:
  sidecar-config:
```

```bash
docker compose up -d
```

Open `http://localhost:3000` to access the UI.

### SSH Mode (Remote Podsync)

For managing a Podsync instance on a different host:

```yaml
services:
  podsync-ui:
    image: ghcr.io/daleiii/podsync-ui:latest
    container_name: podsync-ui
    volumes:
      - sidecar-config:/app/sidecar-config
      - ~/.ssh/id_rsa:/app/ssh/id_rsa:ro
    ports:
      - "3000:3000"
    environment:
      - PODSYNC_MODE=ssh
      - SSH_HOST=192.168.1.100
      - SSH_PORT=22
      - SSH_USERNAME=user
      - SSH_KEY_PATH=/app/ssh/id_rsa
      - PODSYNC_CONFIG_PATH=/home/user/podsync/config/config.toml
      - PODSYNC_DATA_DIR=/home/user/podsync/data
      - PODSYNC_CONTAINER_NAME=podsync
    restart: unless-stopped

volumes:
  sidecar-config:
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PODSYNC_MODE` | `local` | `local` (bind mounts + Docker socket) or `ssh` (remote via SSH) |
| `PORT` | `3000` | Web server port |
| `NODE_ENV` | `development` | `development` or `production` |
| `PODSYNC_CONFIG_PATH` | `./config.toml` | Path to Podsync config.toml (local or remote) |
| `PODSYNC_DATA_DIR` | `./data` | Path to downloaded episode data (local or remote) |
| `PODSYNC_CONTAINER_NAME` | `podsync` | Docker container name to manage |
| `SIDECAR_CONFIG_DIR` | `./sidecar-config` | Where auth.json is stored (always local) |
| `GIT_COMMIT` | `dev` | Git commit hash (set at build time) |
| `BUILD_TIME` | | Build timestamp (set at build time) |

### SSH Mode Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SSH_HOST` | | Remote host address |
| `SSH_PORT` | `22` | SSH port |
| `SSH_USERNAME` | | SSH username |
| `SSH_PASSWORD` | | SSH password (use this OR key) |
| `SSH_KEY_PATH` | | Path to SSH private key (use this OR password) |
| `SSH_KEY_PASSPHRASE` | | Passphrase for the SSH key |

## API

All endpoints are prefixed with `/api`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check + version info |
| `GET` | `/config` | Full config (tokens masked) |
| `GET` | `/config/raw` | Raw TOML string |
| `GET` | `/dashboard` | Feed count, episode count, storage stats |
| `GET` | `/feeds` | List all feeds |
| `GET` | `/feeds/:id` | Get single feed |
| `POST` | `/feeds` | Create feed |
| `PUT` | `/feeds/:id` | Update feed |
| `DELETE` | `/feeds/:id` | Delete feed |
| `GET` | `/feeds/:id/episodes` | List episodes (paginated) |
| `GET` | `/tokens` | Get tokens (masked) |
| `PUT` | `/tokens` | Update tokens |
| `GET` | `/settings/:section` | Get settings section |
| `PUT` | `/settings/:section` | Update settings section |
| `GET` | `/docker/status` | Container status |
| `POST` | `/docker/restart` | Restart container |
| `POST` | `/apply` | Write config + restart |
| `GET` | `/auth` | Auth config |
| `PUT` | `/auth` | Update auth |
| `POST` | `/auth/login` | Login |
| `POST` | `/auth/logout` | Logout |

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
git clone https://github.com/daleiii/podsync-ui.git
cd podsync-ui
npm install
```

### Running

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

### Project Structure

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

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start server + client with hot reload |
| `npm run build` | Build all packages for production |
| `npm run lint` | Run ESLint + Stylelint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | TypeScript type checking |

### Docker (Build from Source)

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

## Related

- [mxpv/podsync](https://github.com/mxpv/podsync) — the original Podsync project that this UI is built to manage
