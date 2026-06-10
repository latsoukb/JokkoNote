# Déployer JokkoNote + sync SeNote

## Déjà fait

- Repo GitHub : https://github.com/latsoukb/JokkoNote
- Pages prof : https://latsoukb.github.io/JokkoNote/ (si workflow vert)

## Étape A0 — Table profs Supabase (si connexion / création compte échoue)

Si JokkoNote affiche *« Table jokko_teachers absente »* ou *« Identifiants incorrects »* avec `diop` / `jokko2026` :

1. Ouvre ton projet **Supabase** → **SQL Editor**
2. Colle le contenu de `server/supabase-migration-teachers.sql` du repo
3. Clique **Run**
4. Redémarre le service **jokko-sync** sur Render (ou attends le prochain déploiement)

Vérification : `https://TON-URL-RENDER/health` doit afficher `"teachers":"supabase"`.

---

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
