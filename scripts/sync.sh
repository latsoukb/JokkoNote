#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "  Sync prof → élève : http://localhost:8787"
node "$ROOT/server/sync-server.mjs"
