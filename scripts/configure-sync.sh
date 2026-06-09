#!/usr/bin/env bash
# Configure REACT_APP_JOKKO_SYNC_URL sur JokkoNote + SeNote.
set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "Usage: ./scripts/configure-sync.sh https://jokko-sync-xxxx.onrender.com"
  exit 1
fi
URL="${URL%/}"

export GH_TOKEN
GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | awk -F= '/^password=/{print $2}')

if [ -z "$GH_TOKEN" ]; then
  echo "Pas d’accès GitHub. Ajoute le secret à la main :"
  echo "  REACT_APP_JOKKO_SYNC_URL = $URL"
  echo "  → https://github.com/latsoukb/JokkoNote/settings/secrets/actions"
  echo "  → https://github.com/latsoukb/SeNote/settings/secrets/actions"
  exit 1
fi

echo "→ URL sync : $URL"
for REPO in JokkoNote SeNote; do
  echo "→ Secret sur latsoukb/$REPO"
  gh secret set REACT_APP_JOKKO_SYNC_URL --body "$URL" --repo "latsoukb/$REPO"
done

echo ""
echo "✓ Secrets enregistrés."
echo "→ Relance Deploy GitHub Pages sur les deux repos (Actions → Run workflow)"
echo "→ Test sync : curl $URL/health"
