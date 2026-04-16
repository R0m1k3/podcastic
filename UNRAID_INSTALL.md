# Podcastic - Unraid Installation Guide

Single container on port **3579** — includes backend, frontend, and serves everything via Express.

## What's Included

This single Docker container includes:
- **Backend**: Node.js + Express.js API
- **Frontend**: React web interface (served by Express as static files)
- **Database**: MongoDB (separate container, managed by Compose)
- **Cache**: Redis (separate container, managed by Compose)

## Prerequisites

- Unraid server with Docker support
- Docker Compose (or Unraid's Compose Manager plugin)

## Installation

### Step 1: Clone Repository

```bash
cd /mnt/user/appdata
git clone https://github.com/R0m1k3/podcastic.git
cd podcastic
```

### Step 2: Configure Environment

```bash
cp .env.example .env
nano .env
```

**Change at minimum:**
```env
JWT_SECRET=your-random-secret-here
```

### Step 3: Build and Start

```bash
docker-compose build --no-cache
docker-compose up -d
```

### Step 4: Access

Open: `http://your-unraid-ip:3579`

---

## Container Architecture

```
docker-compose services:
├── podcastic (port 3579)
│   ├── Express.js API  →  /api/*
│   └── React frontend  →  /* (static files)
├── podcastic-mongodb   →  internal :27017
└── podcastic-redis     →  internal :6379
```

Only port **3579** is exposed externally.

---

## Data Persistence

Add volume mounts to `docker-compose.yml` for persistence:

```yaml
  mongodb:
    volumes:
      - /mnt/user/appdata/podcastic/db:/data/db

  redis:
    volumes:
      - /mnt/user/appdata/podcastic/redis:/data
```

---

## Management Commands

```bash
# View logs
docker-compose logs -f app

# Restart
docker-compose restart app

# Stop all
docker-compose down

# Update
git pull
docker-compose build --no-cache
docker-compose up -d
```

---

## Unraid WebUI Template

Add via Docker > Add Container:

| Field | Value |
|-------|-------|
| Repository | (build from compose) |
| Port | 3579:3579 |
| Variable: JWT_SECRET | your-secret |
| Variable: MONGODB_URI | mongodb://podcastic-mongodb:27017/podcastic |
| Variable: REDIS_URL | redis://podcastic-redis:6379 |

Or use **Compose Manager plugin** with the `docker-compose.yml` from this repo.

---

## Troubleshooting

```bash
# Check container status
docker-compose ps

# Check health endpoint
curl http://localhost:3579/health

# Check API
curl http://localhost:3579/api/health
```

**Last Updated**: 2026-04-16
