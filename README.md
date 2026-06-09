# JokkoNote.

Portail **professeur** — envoi de messages, PDF et images vers les classes.

Les élèves les reçoivent dans **SeNote** (repo séparé) via la messagerie « Réception ».

## Couleurs

Noir · blanc · orange (`#FF7700`) — identité JokkoNote uniquement.

## Démarrage local

```bash
# Terminal 1 — serveur sync (obligatoire pour prof ↔ élève)
chmod +x scripts/*.sh
./scripts/sync.sh

# Terminal 2 — JokkoNote (prof)
./scripts/dev.sh
```

Ouvrir **http://localhost:3001** — connexion démo : `diop` / `jokko2026`

Dans **SeNote** (autre repo), lancer avec :

```bash
REACT_APP_JOKKO_SYNC_URL=http://localhost:8787 ./scripts/dev.sh
```

## Codes classe (démo)

| Code | Classe |
|------|--------|
| `MATH-6A` | Mathématiques 6ème A |
| `FR-5B` | Français 5ème B |

Les élèves entrent le code dans SeNote → Réception.

## Déploiement GitHub Pages

1. Créer le repo `latsoukb/JokkoNote` sur GitHub
2. `git push -u origin main`
3. Activer Pages → source **GitHub Actions**
4. Déployer le serveur sync sur Railway/Render (voir `SYNC.md`)

## Repo lié

- **SeNote** (élèves) : https://github.com/latsoukb/SeNote
