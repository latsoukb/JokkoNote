#!/usr/bin/env bash
# Branche Supabase (gratuit) sur le serveur sync Render.
# Usage : ./scripts/setup-supabase.sh https://xxx.supabase.co eyJhbG...service_role...
set -euo pipefail

SUPABASE_URL="${1:-}"
SUPABASE_KEY="${2:-}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "Usage: ./scripts/setup-supabase.sh https://VOTRE-PROJET.supabase.co VOTRE_SERVICE_ROLE_KEY"
  echo ""
  echo "1. Créez un projet sur https://supabase.com (gratuit)"
  echo "2. SQL Editor → exécutez server/supabase-schema.sql"
  echo "3. Settings → API → copiez Project URL + service_role (secret)"
  exit 1
fi

SUPABASE_URL="${SUPABASE_URL%/}"

echo "→ Test Supabase…"
code=$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/jokko_classes?select=class_id&limit=1")
if [ "$code" != "200" ]; then
  echo "Erreur Supabase (HTTP $code). Vérifiez l'URL, la clé service_role et le SQL schema."
  exit 1
fi
echo "✓ Supabase OK"

echo ""
echo "→ Ajoutez ces variables sur Render (service jokko-sync) :"
echo "   SUPABASE_URL = $SUPABASE_URL"
echo "   SUPABASE_SERVICE_ROLE_KEY = (votre clé)"
echo ""
echo "→ Puis redéployez et vérifiez :"
echo "   curl https://jokko-sync.onrender.com/health"
echo "   → doit afficher {\"ok\":true,\"storage\":\"supabase\"}"
