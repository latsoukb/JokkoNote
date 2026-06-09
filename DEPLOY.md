# Déployer JokkoNote + sync SeNote

## Déjà fait

- Repo GitHub : https://github.com/latsoukb/JokkoNote
- Pages prof : https://latsoukb.github.io/JokkoNote/ (si workflow vert)

## Étape A — Serveur sync (1 clic Render)

1. Ouvre : **https://dashboard.render.com/blueprint/new?repo=https://github.com/latsoukb/JokkoNote**
2. Connecte ton compte GitHub si demandé
3. Clique **Apply** (plan gratuit)
4. Attends 2–3 min → service **jokko-sync** → copie l’URL (ex. `https://jokko-sync-xxxx.onrender.com`)
5. Test : ouvre `https://TON-URL/health` → `{"ok":true}`

## Étape B — Configurer les deux apps (1 commande)

Sur ton Mac, dans le repo JokkoNote :

```bash
chmod +x scripts/configure-sync.sh
./scripts/configure-sync.sh https://TON-URL-RENDER.onrender.com
```

Ce script enregistre l’URL sur GitHub (JokkoNote + SeNote) et relance les déploiements.

## URLs finales

| App | Qui | URL |
|-----|-----|-----|
| JokkoNote | Prof | https://latsoukb.github.io/JokkoNote/ |
| SeNote | Élève | https://latsoukb.github.io/SeNote/ |
| Sync | (invisible) | ton URL Render |

Connexion prof démo : `diop` / `jokko2026`  
Code classe élève : `MATH-6A`
