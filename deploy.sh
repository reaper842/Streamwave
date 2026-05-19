#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# StreamWave deployment script
# Usage:
#   ./deploy.sh            # Full deploy (pull code + rebuild + migrate + restart)
#   ./deploy.sh migrate    # Run Prisma migrations only (no rebuild)
#   ./deploy.sh seed       # Seed database + sync Meilisearch search indexes
#   ./deploy.sh logs       # Tail all container logs
#   ./deploy.sh status     # Show container health
#   ./deploy.sh restart    # Restart containers without rebuild
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"
ENV_FILE=".env.production"

# ── Colour helpers ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
info() { echo -e "${YELLOW}→ $*${NC}"; }
fail() { echo -e "${RED}✗ $*${NC}"; exit 1; }

# ── Guards ────────────────────────────────────────────────────────────────────
[[ -f "$ENV_FILE" ]] || fail ".env.production not found. Copy .env.production.example and fill in values."
[[ -f "docker-compose.prod.yml" ]] || fail "docker-compose.prod.yml not found. Run this script from the streamwave/ directory."

command -v docker >/dev/null 2>&1 || fail "Docker not installed."

# ── Sub-command dispatch ──────────────────────────────────────────────────────
CMD="${1:-deploy}"

run_migrate() {
  info "Running Prisma migrations..."
  docker run --rm \
    --env-file "$ENV_FILE" \
    --network streamwave_streamwave \
    streamwave_fastify:latest \
    npx prisma migrate deploy
  ok "Migrations applied."
}

run_seed() {
  info "Seeding database..."
  docker run --rm \
    --env-file "$ENV_FILE" \
    --network streamwave_streamwave \
    streamwave_fastify:latest \
    npx prisma db seed
  ok "Database seeded."

  info "Syncing Meilisearch search indexes..."
  docker run --rm \
    --env-file "$ENV_FILE" \
    --network streamwave_streamwave \
    streamwave_fastify:latest \
    npx tsx server/scripts/sync-search.ts
  ok "Search indexes synced."
}

case "$CMD" in
  migrate)
    run_migrate
    ;;

  seed)
    run_seed
    ;;

  logs)
    $COMPOSE logs -f --tail=100
    ;;

  status)
    $COMPOSE ps
    ;;

  restart)
    info "Restarting containers..."
    $COMPOSE restart
    ok "Containers restarted."
    $COMPOSE ps
    ;;

  deploy|*)
    info "=== StreamWave Full Deploy ==="

    # 1. Pull latest code
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      info "Pulling latest code..."
      git pull
      ok "Code updated."
    else
      info "Not a git repo — skipping git pull."
    fi

    # 2. Build images
    info "Building Docker images..."
    $COMPOSE build --no-cache
    ok "Images built."

    # 3. Start infrastructure (postgres, redis, meilisearch) first
    info "Starting infrastructure services..."
    $COMPOSE up -d postgres redis meilisearch
    info "Waiting for infrastructure to be healthy..."
    sleep 10

    # 4. Run migrations
    run_migrate

    # 5. Bring up app services (nextjs, fastify, cloudflared)
    info "Starting application services..."
    $COMPOSE up -d
    ok "All services started."

    # 6. Show status
    echo ""
    $COMPOSE ps
    echo ""
    ok "=== Deploy complete ==="
    echo "  App:    \$NEXTAUTH_URL (from .env.production)"
    echo "  API:    \$NEXT_PUBLIC_API_URL (from .env.production)"
    echo "  Health: curl http://localhost:3001/api/v1/health"
    ;;
esac
