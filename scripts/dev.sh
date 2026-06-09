#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"
[ -d node_modules ] || npm install --legacy-peer-deps
echo ""
echo "  JokkoNote prof → http://localhost:3001/"
echo "  Sync serveur  → http://localhost:8787 (./scripts/sync.sh)"
echo "  Démo : diop / jokko2026"
echo ""
PORT=3001 \
REACT_APP_JOKKO_SYNC_URL=http://localhost:8787 \
CI=false \
npm start
