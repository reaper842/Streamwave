# StreamWave — Self-Hosted Deployment Guide

> **Stack**: Ubuntu Linux server · Docker / Portainer · Cloudflare Tunnel  
> **Architecture**: Next.js (port 3000) + Fastify (port 3001) + PostgreSQL + Redis + Meilisearch + cloudflared — all in one Docker Compose stack.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Setup (first time)](#2-server-setup-first-time)
3. [Cloudflare Tunnel Setup](#3-cloudflare-tunnel-setup)
4. [Configure Environment Variables](#4-configure-environment-variables)
5. [Deploy with Portainer](#5-deploy-with-portainer)
6. [First-Run: Migrations, Seed & Search Sync](#6-first-run-migrations-seed--search-sync)
7. [Upload Audio Files](#7-upload-audio-files)
8. [OAuth Setup (optional)](#8-oauth-setup-optional)
9. [Verify the Deployment](#9-verify-the-deployment)
10. [Future Updates (deploy.sh)](#10-future-updates-deploysh)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Requirement          | Notes                                                    |
| -------------------- | -------------------------------------------------------- |
| Ubuntu 22.04+ server | Any VPS or bare-metal. 2 vCPU / 4 GB RAM minimum         |
| Docker Engine 24+    | See installation below                                   |
| Portainer CE         | Web UI for Docker stack management                       |
| Cloudflare account   | Free plan works. You need a domain managed by Cloudflare |
| Git                  | To clone the repository onto the server                  |

---

## 2. Server Setup (first time)

### 2.1 Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### 2.2 Install Portainer

```bash
docker volume create portainer_data

docker run -d \
  --name portainer \
  --restart=always \
  -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Access Portainer at `http://YOUR_SERVER_IP:9000` to create your admin account.

> **Security note**: Port 9000 is only for initial setup. After configuring the Cloudflare Tunnel you can block this port in your firewall and access Portainer through the tunnel if desired.

### 2.3 Create the audio directory

```bash
sudo mkdir -p /data/streamwave/audio
sudo chown -R $USER:$USER /data/streamwave
```

### 2.4 Clone the repository

```bash
git clone https://github.com/YOUR_ORG/streamwave.git /opt/streamwave
cd /opt/streamwave/streamwave
```

---

## 3. Cloudflare Tunnel Setup

A Cloudflare Tunnel lets your server receive HTTPS traffic without opening any ports to the internet. Cloudflare handles SSL termination.

### 3.1 Create the tunnel

1. Go to **Cloudflare Dashboard** → **Zero Trust** → **Networks** → **Tunnels**
2. Click **Create a tunnel** → Choose **Cloudflared** → Name it `streamwave`
3. On the next screen, copy the **tunnel token** — it looks like a long base64 string starting with `eyJ...`
4. Save this token; you will put it in `.env.production` as `CLOUDFLARE_TUNNEL_TOKEN`

### 3.2 Configure public hostnames

In the tunnel configuration, add two **Public Hostnames**:

| Subdomain        | Domain           | Type | URL                   |
| ---------------- | ---------------- | ---- | --------------------- |
| `streamwave`     | `yourdomain.com` | HTTP | `http://nextjs:3000`  |
| `api.streamwave` | `yourdomain.com` | HTTP | `http://fastify:3001` |

> The service names (`nextjs`, `fastify`) are the Docker container hostnames — they resolve inside the Docker network automatically.

### 3.3 Note your public URLs

- **App**: `https://streamwave.yourdomain.com`
- **API**: `https://api.streamwave.yourdomain.com`

You will use these in the next step.

---

## 4. Configure Environment Variables

```bash
cd /opt/streamwave/streamwave
cp .env.production.example .env.production
nano .env.production   # or your preferred editor
```

**Required changes** (replace every `CHANGE_ME_*` and `yourdomain.com`):

```bash
# Database
POSTGRES_PASSWORD=pick_a_strong_password
DATABASE_URL=postgresql://streamwave:pick_a_strong_password@postgres:5432/streamwave

# Meilisearch master key
MEILISEARCH_API_KEY=pick_a_32_char_hex_key   # openssl rand -hex 32

# NextAuth
NEXTAUTH_SECRET=pick_a_32_char_base64        # openssl rand -base64 32
NEXTAUTH_URL=https://streamwave.yourdomain.com

# API URL (your Fastify Cloudflare Tunnel hostname)
NEXT_PUBLIC_API_URL=https://api.streamwave.yourdomain.com

# Cloudflare Tunnel token (from Step 3.1)
CLOUDFLARE_TUNNEL_TOKEN=eyJ...your_token_here
```

**Generate secrets quickly:**

```bash
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "MEILISEARCH_API_KEY=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
```

---

## 5. Deploy with Portainer

### Option A: Portainer Stacks (recommended)

1. In Portainer, go to **Stacks** → **Add stack**
2. Name: `streamwave`
3. Select **Repository** → paste your Git repo URL, branch `main`, compose path `streamwave/docker-compose.prod.yml`
   — OR —
   Select **Upload** → upload the `docker-compose.prod.yml` file
4. In the **Environment variables** tab, add all variables from `.env.production`
5. Click **Deploy the stack**

### Option B: CLI on the server

```bash
cd /opt/streamwave/streamwave
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Option C: deploy.sh

```bash
cd /opt/streamwave/streamwave
chmod +x deploy.sh
./deploy.sh
```

---

## 6. First-Run: Migrations, Seed & Search Sync

Run these **once** after the first deploy. The database containers must be healthy first (wait ~15 seconds after starting).

### 6.1 Run database migrations

```bash
docker exec streamwave_fastify npx prisma migrate deploy
```

### 6.2 Seed demo data (optional but recommended)

```bash
docker exec streamwave_fastify npx prisma db seed
```

This creates 10 artists, 50 albums, 500 tracks, 5 playlists, and a demo user:  
`demo@streamwave.app` / `Demo1234`

### 6.3 Sync Meilisearch search indexes

```bash
docker exec streamwave_fastify npx tsx server/scripts/sync-search.ts
```

Wait ~10 seconds for indexing to complete, then test:

```bash
curl "http://localhost:3001/api/v1/search?q=test&type=tracks"
```

### 6.4 Or use the deploy.sh helper

```bash
./deploy.sh seed     # runs both db seed + search sync
./deploy.sh migrate  # runs migrations only
```

---

## 7. Upload Audio Files

Audio files are stored on your Ubuntu server at `/data/streamwave/audio/` and served by the Next.js container.

### 7.1 How URLs work

- Tracks with `audio_url = '/audio/filename.mp3'` are served directly from Next.js's `public/audio/` directory
- The Fastify server bypasses R2 and returns the path as-is when it starts with `/`
- The browser fetches `https://streamwave.yourdomain.com/audio/filename.mp3`

### 7.2 Copy MP3 files to the server

From your local machine:

```bash
scp /path/to/your/songs/*.mp3 user@YOUR_SERVER_IP:/data/streamwave/audio/
```

Or from the server directly:

```bash
cp /wherever/your/songs/are/*.mp3 /data/streamwave/audio/
```

### 7.3 Register tracks in the database

Use the Admin Dashboard at `https://streamwave.yourdomain.com/admin/tracks` to:

- Create artists and albums first
- Then create tracks with `audio_url = /audio/your-filename.mp3`

Or use the seed script which uses placeholder paths and you can update the DB directly:

```bash
docker exec -it streamwave_postgres psql -U streamwave -d streamwave \
  -c "UPDATE \"Track\" SET audio_url = '/audio/your-track.mp3' WHERE id = 'TRACK_UUID';"
```

### 7.4 Re-sync search after adding tracks

```bash
docker exec streamwave_fastify npx tsx server/scripts/sync-search.ts
```

---

## 8. OAuth Setup (optional)

Without OAuth, users can only sign in with email/password. The OAuth buttons will still render but show an error if credentials are not configured.

### 8.1 Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Authorized redirect URI: `https://streamwave.yourdomain.com/api/auth/callback/google`
4. Copy Client ID and Secret into `.env.production`

### 8.2 GitHub OAuth

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Authorization callback URL: `https://streamwave.yourdomain.com/api/auth/callback/github`
3. Copy Client ID and Secret into `.env.production`

After updating `.env.production`, restart:

```bash
./deploy.sh restart
# or
docker compose -f docker-compose.prod.yml restart nextjs fastify
```

---

## 9. Verify the Deployment

```bash
# 1. Check all containers are running
docker compose -f docker-compose.prod.yml ps

# 2. API health check (readiness probe — checks Postgres + Redis + Meilisearch)
curl http://localhost:3001/api/v1/health

# 3. Next.js is up
curl -I http://localhost:3000

# 4. Check cloudflared is connected
docker logs streamwave_cloudflared | tail -20
# Should see: "Registered tunnel connection connIndex=0"

# 5. Test the public URLs
curl -I https://streamwave.yourdomain.com
curl https://api.streamwave.yourdomain.com/api/v1/health
```

Expected health response:

```json
{ "data": { "status": "ok", "postgres": "ok", "redis": "ok", "meilisearch": "ok" } }
```

### End-to-end smoke test

1. Open `https://streamwave.yourdomain.com` → login page renders (dark theme)
2. Log in as `demo@streamwave.app` / `Demo1234`
3. Click a track → audio plays, playback bar is active
4. Search for an artist → results appear
5. Create a playlist → add tracks

---

## 10. Future Updates (deploy.sh)

When you push code changes, redeploy like this:

```bash
cd /opt/streamwave/streamwave

# Full deploy: pull code + rebuild images + migrate + restart
./deploy.sh

# If you only changed environment variables (no code changes):
./deploy.sh restart

# If you only added a database migration:
./deploy.sh migrate
```

### What `./deploy.sh` does

1. `git pull` — pulls latest code
2. `docker compose build --no-cache` — rebuilds both Docker images
3. Starts infrastructure services (postgres, redis, meilisearch)
4. Runs `prisma migrate deploy` — applies any new migrations
5. `docker compose up -d` — starts/replaces all containers
6. Shows container status

### Zero-downtime note

The current setup has a brief gap (~5-10 seconds) when containers restart. For zero-downtime, add a load balancer or use Docker's rolling update strategy — but for a personal/thesis project this is fine.

---

## 11. Troubleshooting

### Container won't start

```bash
docker logs streamwave_nextjs
docker logs streamwave_fastify
docker logs streamwave_postgres
```

### "Cannot connect to database"

Check that `DATABASE_URL` uses the Docker service name `postgres` (not `localhost`):

```
DATABASE_URL=postgresql://streamwave:pass@postgres:5432/streamwave
```

### Cloudflare Tunnel not connecting

```bash
docker logs streamwave_cloudflared
```

Common causes:

- `CLOUDFLARE_TUNNEL_TOKEN` is wrong or expired — regenerate in Cloudflare Dashboard
- Container names changed — tunnel routes use Docker service hostnames (`nextjs`, `fastify`), not container names

### Audio not playing

1. Check files exist: `ls /data/streamwave/audio/`
2. Check volume is mounted: `docker exec streamwave_nextjs ls /app/public/audio/`
3. Check track `audio_url` in DB starts with `/audio/`:
   ```bash
   docker exec -it streamwave_postgres psql -U streamwave -d streamwave -c "SELECT audio_url FROM \"Track\" LIMIT 5;"
   ```
4. Check browser console for the URL being fetched

### Search returns no results

```bash
# Re-sync Meilisearch
docker exec streamwave_fastify npx tsx server/scripts/sync-search.ts
# Wait 10s then test:
curl "http://localhost:3001/api/v1/search?q=test&type=tracks"
```

### CSP violation for new image domains

If you add new image sources (album artwork from a CDN), add the domain to `img-src` in `next.config.ts` and redeploy.

### "NEXT_PUBLIC_API_URL must be set in production"

This error fires at Next.js build time. Make sure `NEXT_PUBLIC_API_URL` is set in `.env.production` and is a valid URL before running `docker compose build`.

---

## Quick Reference

| Action             | Command                                    |
| ------------------ | ------------------------------------------ |
| Full redeploy      | `./deploy.sh`                              |
| Restart only       | `./deploy.sh restart`                      |
| Run migrations     | `./deploy.sh migrate`                      |
| Seed + sync search | `./deploy.sh seed`                         |
| View logs          | `./deploy.sh logs`                         |
| Container status   | `./deploy.sh status`                       |
| Health check       | `curl http://localhost:3001/api/v1/health` |
| Portainer UI       | `http://YOUR_SERVER_IP:9000`               |
| App (public)       | `https://streamwave.yourdomain.com`        |
| API (public)       | `https://api.streamwave.yourdomain.com`    |
